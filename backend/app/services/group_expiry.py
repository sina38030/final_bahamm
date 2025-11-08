"""
Group Order Expiry Service

This service handles the 24-hour timeout mechanism for group orders.
It periodically checks for GROUP_PENDING orders that have expired and marks them as GROUP_EXPIRED.
"""

import asyncio
import os
import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Order, OrderState, GroupOrder, GroupOrderStatus, User
from app.services import notification_service

# Tehran timezone: UTC+3:30
TEHRAN_TZ = timezone(timedelta(hours=3, minutes=30))

logger = logging.getLogger(__name__)

class GroupExpiryService:
    def __init__(self):
        self.running = False
    
    async def check_expired_orders(self):
        """Check for expired GROUP_PENDING orders and mark them as GROUP_EXPIRED"""
        try:
            # Get database session
            db_gen = get_db()
            db = next(db_gen)
            
            try:
                # Find all GROUP_PENDING orders that have expired
                now = datetime.now(TEHRAN_TZ)
                expired_orders = db.query(Order).filter(
                    Order.state == OrderState.GROUP_PENDING,
                    Order.expires_at.isnot(None),
                    Order.expires_at < now
                ).all()
                
                if expired_orders:
                    logger.info(f"Found {len(expired_orders)} expired group orders")
                    
                    for order in expired_orders:
                        # Mark order as expired
                        order.state = OrderState.GROUP_EXPIRED
                        
                        logger.info(f"Expired group order {order.id} (group_order_id: {order.group_order_id})")
                    
                    db.commit()
                    logger.info(f"Successfully expired {len(expired_orders)} group orders")
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Error checking expired orders: {e}")
            import traceback
            traceback.print_exc()
    
    async def check_successful_groups(self):
        """Check for groups that have become successful (friend joined) and mark them as GROUP_SUCCESS"""
        try:
            # Get database session
            db_gen = get_db()
            db = next(db_gen)
            
            try:
                # Find all GROUP_PENDING orders where at least one friend has joined
                pending_orders = db.query(Order).filter(
                    Order.state == OrderState.GROUP_PENDING,
                    Order.group_order_id.isnot(None)
                ).all()
                
                successful_groups = []
                
                for order in pending_orders:
                    # Count how many people have joined this group
                    total_participants = db.query(Order).filter(
                        Order.group_order_id == order.group_order_id,
                        Order.state.in_([OrderState.GROUP_PENDING, OrderState.GROUP_SUCCESS])
                    ).count()
                    
                    # If there are 2+ participants, the group is successful
                    if total_participants >= 2:
                        successful_groups.append(order.group_order_id)
                
                if successful_groups:
                    logger.info(f"Found {len(successful_groups)} successful groups")
                    
                    # Do not auto-finalize immediately. Only mark success at expiry time if >=1 follower paid.
                    now_ts = datetime.now(TEHRAN_TZ)
                    for group_id in successful_groups:
                        try:
                            # Check expiry and follower payments before marking success
                            group = db.execute(
                                text("SELECT id, expires_at FROM group_orders WHERE id = :gid"),
                                {"gid": group_id},
                            ).fetchone()
                            if not group:
                                continue
                            expires_at = group.expires_at
                            if not expires_at or now_ts <= expires_at:
                                # Not yet expired; do nothing until expiry
                                logger.info(f"Group {group_id} has paid followers but not expired; waiting.")
                                continue

                            # On expiry, ensure at least one follower paid
                            paid_followers = db.execute(
                                text(
                                    """
                                    SELECT COUNT(*) AS c
                                    FROM orders o
                                    JOIN users u ON u.id = o.user_id
                                    WHERE o.group_order_id = :gid
                                      AND o.payment_ref_id IS NOT NULL
                                      AND u.id <> (
                                        SELECT leader_id FROM group_orders WHERE id = :gid
                                      )
                                    """
                                ),
                                {"gid": group_id},
                            ).scalar() or 0

                            if paid_followers >= 1:
                                # Mark orders in group as GROUP_SUCCESS without setting pending settlement here
                                orders_in_group = db.query(Order).filter(
                                    Order.group_order_id == group_id,
                                    Order.state == OrderState.GROUP_PENDING,
                                ).all()
                                for order in orders_in_group:
                                    order.state = OrderState.GROUP_SUCCESS
                                try:
                                    db.execute(
                                        text("UPDATE group_orders SET status = :st, finalized_at = :ts WHERE id = :gid"),
                                        {"st": "GROUP_FINALIZED", "ts": now_ts, "gid": group_id},
                                    )
                                except Exception:
                                    pass
                                logger.info(f"Group {group_id} expired with >=1 follower paid; marked successful.")

                                # Send success notification to leader
                                try:
                                    leader = db.query(User).filter(User.id == group.leader_id).first()
                                    if leader:
                                        await notification_service.send_notification(
                                            user=leader,
                                            title="گروه تکمیل شد",
                                            message=f"گروه شما با {paid_followers} عضو تکمیل شد و سفارش‌ها آماده ارسال هستند.",
                                            group_id=group_id
                                        )
                                except Exception as e:
                                    logger.error(f"Failed to send group success notification: {str(e)}")

                            else:
                                # Mark group failed on expiry without any follower payment
                                # Also compute refund policy for regular groups:
                                # - If leader had a real payment (payment_ref_id), allow refund options (wallet/bank)
                                # - Do NOT refund automatically here; only mark status failed
                                try:
                                    db.execute(
                                        text("UPDATE group_orders SET status = :st, finalized_at = :ts WHERE id = :gid"),
                                        {"st": "GROUP_FAILED", "ts": now_ts, "gid": group_id},
                                    )
                                except Exception:
                                    pass
                                logger.info(f"Group {group_id} expired with no followers; marked failed.")

                                # Send failure notification to leader
                                try:
                                    leader = db.query(User).filter(User.id == group.leader_id).first()
                                    if leader:
                                        await notification_service.send_notification(
                                            user=leader,
                                            title="گروه منقضی شد",
                                            message="متاسفانه گروه شما تکمیل نشد. مبلغ پرداخت شده قابل استرداد است.",
                                            group_id=group_id
                                        )
                                except Exception as e:
                                    logger.error(f"Failed to send group failure notification: {str(e)}")
                        except Exception as e:
                            logger.error(f"Expiry check error for group {group_id}: {e}")
                    db.commit()
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Error checking successful groups: {e}")
            import traceback
            traceback.print_exc()
    
    async def run_periodic_check(self, interval_minutes=10):
        """Run periodic checks every N minutes"""
        # Disable by default unless explicitly enabled
        if os.getenv("ENABLE_GROUP_EXPIRY", "0").lower() not in ("1", "true", "yes"): 
            logger.info("Group expiry service is disabled (set ENABLE_GROUP_EXPIRY=1 to enable)")
            return
        self.running = True
        logger.info(f"Starting group expiry service (checking every {interval_minutes} minutes)")
        
        while self.running:
            try:
                await self.check_expired_orders()
                await self.check_successful_groups()
                
                # Wait for the next check
                await asyncio.sleep(interval_minutes * 60)
                
            except Exception as e:
                logger.error(f"Error in periodic check: {e}")
                await asyncio.sleep(60)  # Wait 1 minute before retrying
    
    def stop(self):
        """Stop the periodic checks"""
        self.running = False
        logger.info("Stopping group expiry service")

# Global instance
group_expiry_service = GroupExpiryService()

