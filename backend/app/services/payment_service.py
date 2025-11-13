from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List, Union
from datetime import datetime, timedelta, timezone
import json
from app.models import Order, OrderItem, Product, User, OrderType, GroupOrder, GroupOrderStatus, OrderState
from app.payment import zarinpal
from app.utils.logging import get_logger
from app.config import get_settings
from app.services.group_settlement_service import GroupSettlementService
from app.services.order_post_processor import OrderPostProcessor

# Tehran timezone: UTC+3:30
TEHRAN_TZ = timezone(timedelta(hours=3, minutes=30))

logger = get_logger(__name__)
settings = get_settings()

class PaymentService:
    def __init__(self, db: Session):
        self.db = db
    
    # Removed complex state machine logic for simplicity

    async def create_payment_order(
        self,
        user_id: Optional[int],
        items: list,
        total_amount: int,
        description: str = "پرداخت سفارش",
        mobile: str = None,
        email: str = None,
        shipping_address: str = None,
        delivery_slot: str = None,
        mode: str = None,
        allow_consolidation: Optional[bool] = None,
        ship_to_leader_address: Optional[bool] = None,
        friends: Optional[int] = None,
        max_friends: Optional[int] = None,
        expected_friends: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Create an order and initiate payment
        
        Args:
            user_id: User ID
            items: List of items with product_id, quantity, price
            total_amount: Total amount in Rial
            description: Payment description
            mobile: User mobile number
            email: User email
            shipping_address: Full shipping address
            delivery_slot: Selected delivery time slot
        
        Returns:
            Dict with payment URL and order info
        """
        try:
            settlement_paid_flag = False
            settlement_message = None
            logger.info(f"Creating order: user_id={user_id}, amount={total_amount}, items={len(items)}")
            
            # Resolve or create user from mobile if not provided
            resolved_user_id = user_id
            try:
                if resolved_user_id is None and mobile:
                    # Try to find existing user by phone_number
                    existing = self.db.query(User).filter(User.phone_number == mobile).first()
                    if existing:
                        resolved_user_id = existing.id
                    else:
                        # Create a minimal CUSTOMER user with provided phone
                        new_user = User(phone_number=mobile, user_type='CUSTOMER')
                        self.db.add(new_user)
                        self.db.flush()
                        resolved_user_id = new_user.id
            except Exception:
                # Non-fatal; continue as guest
                pass

            # Create order with simple working approach
            # Store mode and group target info in delivery_slot as JSON if provided
            delivery_info = delivery_slot
            if (mode or friends is not None or max_friends is not None) and delivery_slot:
                import json
                delivery_info = json.dumps({
                    "delivery_slot": delivery_slot,
                    **({"mode": mode} if mode else {}),
                    **({"friends": friends} if friends is not None else {}),
                    **({"max_friends": max_friends} if max_friends is not None else {}),
                })
            elif mode or friends is not None or max_friends is not None:
                import json
                payload = {}
                if mode:
                    payload["mode"] = mode
                if friends is not None:
                    payload["friends"] = friends
                if max_friends is not None:
                    payload["max_friends"] = max_friends
                delivery_info = json.dumps(payload)
                
            order = Order(
                user_id=resolved_user_id,
                total_amount=total_amount / 10,  # Convert Rial to Toman for storage
                status="در انتظار پرداخت",  # Simple status that works
                order_type=OrderType.ALONE,  # default; may be updated to GROUP when linking
                shipping_address=shipping_address,
                delivery_slot=delivery_info,
                ship_to_leader_address=ship_to_leader_address or False
            )
            self.db.add(order)
            self.db.flush()  # Get order ID
            
            logger.info(f"Order created with ID: {order.id}")
            
            # Create order items
            for item in items:
                logger.info(f"Creating order item: product_id={item['product_id']}, quantity={item['quantity']}, price={item['price']}")
                order_item = OrderItem(
                    order_id=order.id,
                    product_id=item['product_id'],
                    quantity=item['quantity'],
                    base_price=item['price']
                )
                self.db.add(order_item)
            
            logger.info(f"All order items created, requesting payment")
            # If total amount is zero (free order), skip gateway and synthesize an authority
            if total_amount <= 0:
                authority = f"FREE{order.id}{int(datetime.now(TEHRAN_TZ).timestamp())}"
                order.payment_authority = authority
                order.status = "در انتظار"  # Set to pending so it appears in active orders
                order.paid_at = datetime.now(TEHRAN_TZ)
                
                # Create GroupOrder for free orders immediately (since there's no payment verification step)
                if not order.group_order_id and mode and mode.lower() == 'group':
                    try:
                        # Try to resolve leader user by order's user_id or create a minimal one
                        leader_user = None
                        if order.user_id:
                            leader_user = self.db.query(User).filter(User.id == order.user_id).first()
                        if not leader_user and user_id:
                            # Create a minimal user record if needed
                            leader_user = User(
                                phone_number=f"guest_{datetime.now(TEHRAN_TZ).timestamp():.0f}",
                                user_type='CUSTOMER'
                            )
                            self.db.add(leader_user)
                            self.db.flush()
                    except Exception:
                        # Non-fatal resolution error; continue without a leader_user
                        leader_user = None

                    if leader_user:
                        # Prepare basket snapshot
                        items_snapshot = []
                        for order_item in order.items:
                            items_snapshot.append({
                                "product_id": order_item.product_id,
                                "quantity": order_item.quantity,
                                "unit_price": order_item.base_price
                            })
                        
                        try:
                            snapshot_json = json.dumps(items_snapshot, ensure_ascii=False)
                        except Exception:
                            snapshot_json = None

                        # Precompute a unique invite token using order id and authority prefix
                        prefix = authority[:8] if authority else ""
                        invite_token = f"GB{order.id}{prefix}"

                        try:
                            # Create GroupOrder (respect leader's consolidation toggle if provided)
                            group = GroupOrder(
                                leader_id=leader_user.id,
                                invite_token=invite_token,
                                status=GroupOrderStatus.GROUP_FORMING,
                                created_at=datetime.now(TEHRAN_TZ),
                                leader_paid_at=datetime.now(TEHRAN_TZ),
                                expires_at=datetime.now(TEHRAN_TZ) + timedelta(hours=24),
                                basket_snapshot=snapshot_json,
                                allow_consolidation=bool(allow_consolidation) if allow_consolidation is not None else False,
                                expected_friends=expected_friends or friends or max_friends
                            )
                            self.db.add(group)
                            self.db.flush()
                            group_id = group.id
                        except Exception as ge:
                            # Fallback: raw SQL without basket_snapshot column
                            if "no column named basket_snapshot" in str(ge).lower():
                                # Reset failed transaction before continuing
                                try:
                                    self.db.rollback()
                                except Exception:
                                    pass
                                from sqlalchemy import text
                                insert_stmt = text(
                                    "INSERT INTO group_orders (leader_id, invite_token, status, created_at, leader_paid_at, expires_at, allow_consolidation) "
                                    "VALUES (:leader_id, :invite_token, :status, :created_at, :leader_paid_at, :expires_at, :allow_consolidation)"
                                )
                                now = datetime.now(TEHRAN_TZ)
                                self.db.execute(insert_stmt, {
                                    "leader_id": leader_user.id,
                                    "invite_token": invite_token,
                                    "status": GroupOrderStatus.GROUP_FORMING.value if hasattr(GroupOrderStatus, 'value') else str(GroupOrderStatus.GROUP_FORMING),
                                    "created_at": now,
                                    "leader_paid_at": now,
                                    "expires_at": now + timedelta(hours=24),
                                    "allow_consolidation": 1 if (allow_consolidation is True) else 0,
                                })
                                # Retrieve last inserted id (SQLite)
                                from sqlalchemy import text as _text
                                group_id = self.db.execute(_text("SELECT last_insert_rowid()")).scalar()
                            else:
                                raise

                        # Link order to group
                        if group_id:
                            order.group_order_id = group_id
                            order.order_type = OrderType.GROUP
                
                # Commit the transaction to ensure data is persisted
                self.db.commit()
                
                # Return synthetic payment data
                return {
                    "success": True,
                    "authority": authority,
                    # Send free/synthetic orders directly to success page; the page will resolve by authority
                    "payment_url": f"/payment/success/invitee?authority={authority}",
                }

            # Otherwise, continue to gateway via zarinpal service
            result = await zarinpal.request_payment(
                amount=total_amount,
                description=description,
                callback_url=f"{settings.get_payment_callback_base_url}/payment/callback",
                mobile=mobile,
                email=email
            )

            if result["success"]:
                order.payment_authority = result["authority"]
                self.db.flush()
                # Ensure order and items are persisted before returning
                try:
                    self.db.commit()
                except Exception:
                    # If commit fails, rollback to avoid broken session
                    try:
                        self.db.rollback()
                    except Exception:
                        pass
                    raise
                logger.info(f"Payment order created: Order #{order.id}, Authority: {order.payment_authority}")
                return {
                    "success": True,
                    "authority": result["authority"],
                    "payment_url": result["payment_url"],
                    # For potential future use to understand if this is a settlement payment
                    "meta": {
                        "mode": mode,
                        "friends": friends,
                        "max_friends": max_friends,
                    }
                }
            else:
                return {"success": False, "error": result.get("error", "gateway failed")}
        except Exception as e:
            logger.error(f"Error creating payment order: {e}")
            raise

    async def verify_and_complete_payment(
        self,
        authority: str,
        amount: Optional[int] = None,
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Verify payment and complete the order
        
        Args:
            authority: Payment authority from ZarinPal
            amount: Payment amount in Rial
            user_id: User ID (optional for additional verification)
        
        Returns:
            Dict with verification result and order status
        """
        try:
            # Find order by authority
            order = self.db.query(Order).filter(Order.payment_authority == authority).first()
            if not order:
                return {
                    "success": False,
                    "error": "سفارش مرتبط با این پرداخت یافت نشد"
                }
            
            # Additional user verification if provided
            if user_id and order.user_id != user_id:
                return {
                    "success": False,
                    "error": "دسترسی به این سفارش مجاز نیست"
                }
            
            # Use order amount if amount not provided
            verify_amount = amount if amount is not None else int(order.total_amount * 10)  # Convert Toman to Rial
            
            # Verify payment with ZarinPal
            verification_result = await zarinpal.verify_payment(authority, verify_amount)
            
            if verification_result["success"]:
                # Payment successful, update order status
                order.status = "در انتظار"
                order.payment_ref_id = verification_result["ref_id"]
                order.paid_at = datetime.now(TEHRAN_TZ)

                # Simplified: Only handle invited flow via PENDING_INVITE. No PENDING_GROUP branch.
                logger.info(f"🔍 Checking if order {order.id} is invited: shipping_address={order.shipping_address[:100] if order.shipping_address else None}")
                if order.shipping_address and order.shipping_address.startswith("PENDING_INVITE:"):
                    logger.info(f"✅ INVITED USER DETECTED: order {order.id} has PENDING_INVITE prefix")
                    # Resolve invite to leader order and then to group id
                    try:
                        parts = order.shipping_address.split("|", 1)
                        invite_token = parts[0].replace("PENDING_INVITE:", "")
                        original_address = parts[1] if len(parts) > 1 else ""
                        # Invite token format: GB{order_id}{authority_prefix}
                        raw = invite_token[2:] if invite_token.startswith("GB") else invite_token
                        digits = ''
                        for ch in raw:
                            if ch.isdigit():
                                digits += ch
                            else:
                                break
                        pending_group_id = None
                        if digits:
                            order_id_val = int(digits)
                            prefix = raw[len(digits):]
                            leader_order_q = self.db.query(Order).filter(Order.id == order_id_val)
                            if prefix:
                                leader_order_q = leader_order_q.filter(Order.payment_authority.like(f"{prefix}%"))
                            leader_order = leader_order_q.first()
                            if leader_order and leader_order.group_order_id:
                                pending_group_id = leader_order.group_order_id

                        # Fallback: match GroupOrder.invite_token directly
                        # IMPORTANT: Use the NEWEST group with this invite_token to handle edge cases
                        if not pending_group_id:
                            grp = self.db.query(GroupOrder).filter(
                                GroupOrder.invite_token == invite_token
                            ).order_by(GroupOrder.created_at.desc()).first()  # Get newest group
                            if grp:
                                pending_group_id = grp.id

                        if pending_group_id:
                            order.group_order_id = pending_group_id
                            order.order_type = OrderType.GROUP
                            order.shipping_address = original_address
                            logger.info(f"✅✅✅ SUCCESSFULLY LINKED invited order {order.id} to group {pending_group_id} via invite token {invite_token}")
                            logger.info(f"   Order type updated to: {order.order_type}")
                            logger.info(f"   Order group_order_id updated to: {order.group_order_id}")
                        else:
                            logger.error(f"❌❌❌ Could not resolve group for invite token {invite_token} on order {order.id}")
                    except Exception as e:
                        logger.error(f"Error processing pending invite for order {order.id}: {e}")

                # If this paid order is a follower (invited user) who joined someone else's group,
                # automatically create a secondary group for them (hidden by business rule until first follower).
                try:
                    if getattr(order, 'group_order_id', None):
                        group = self.db.query(GroupOrder).filter(GroupOrder.id == order.group_order_id).first()
                    else:
                        group = None
                    is_follower_order = bool(group and getattr(group, 'leader_id', None) and getattr(order, 'user_id', None) and int(group.leader_id) != int(order.user_id))
                    if is_follower_order:
                        # ✅ DISABLED: Don't auto-create secondary group
                        # Invitee will manually create it when they click "مبلغ پرداختیت رو پس بگیر!" button
                        logger.info(f"⏳ Invitee order {getattr(order, 'id', None)} has no secondary group yet - will be created on button click")
                        pass
                except Exception as e:
                    logger.error(f"Error checking follower order status for order {getattr(order, 'id', None)}: {e}")

                # Check if this is a leader order that might require settlement
                is_leader_order = False
                if order.group_order_id:
                    group = self.db.query(GroupOrder).filter(GroupOrder.id == order.group_order_id).first()
                    # If this is a secondary group and at least one follower has paid, clear hidden flag in snapshot
                    try:
                        if group and getattr(group, 'basket_snapshot', None):
                            meta = {}
                            try:
                                meta = json.loads(group.basket_snapshot)
                            except Exception:
                                meta = {}
                            kind_val = str((meta.get('kind') or '')).lower() if isinstance(meta, dict) else ''
                            if kind_val == 'secondary':
                                from sqlalchemy import or_ as _or
                                paid_followers = self.db.query(Order).filter(
                                    Order.group_order_id == group.id,
                                    Order.user_id != group.leader_id,
                                    Order.is_settlement_payment == False,
                                    _or(
                                        Order.payment_ref_id.isnot(None),
                                        Order.paid_at.isnot(None),
                                    ),
                                ).count()
                                if paid_followers >= 1 and isinstance(meta, dict) and meta.get('hidden'):
                                    try:
                                        meta['hidden'] = False
                                        group.basket_snapshot = json.dumps(meta, ensure_ascii=False)
                                        self.db.commit()
                                    except Exception:
                                        # Non-fatal
                                        pass
                    except Exception:
                        pass
                    if group and group.leader_id == order.user_id:
                        is_leader_order = True

                # Create GroupOrder for leader if this is a new group buy (not joining existing group)
                # Only create new group if this order is not already linked to a group
                if not order.group_order_id:
                    # Check if the order was created in group mode
                    order_mode = None
                    if order.delivery_slot:
                        try:
                            import json
                            delivery_info = json.loads(order.delivery_slot)
                            if isinstance(delivery_info, dict):
                                order_mode = delivery_info.get('mode')
                        except:
                            # If not JSON, treat as regular delivery_slot
                            pass
                    
                    # Also check if this is a leader order by checking if it's not an invited user
                    # and has group-related characteristics
                    is_invited_user = (
                        hasattr(order, 'shipping_address') and 
                        order.shipping_address and 
                        (order.shipping_address.startswith('PENDING_INVITE:') or 
                         order.shipping_address.startswith('PENDING_GROUP:'))
                    )
                    
                    # ✅ FIX: Don't create new group for invited users
                    if is_invited_user:
                        logger.info(f"⏳ Invited user order {order.id} - skipping GroupOrder creation")
                        pass
                    elif order.order_type == OrderType.ALONE and (order_mode == 'group' or not is_invited_user):
                        # This is a group buy leader payment - create GroupOrder now
                        try:
                            # Try to resolve leader user by order's user_id or create a minimal one
                            leader_user = None
                            if order.user_id:
                                leader_user = self.db.query(User).filter(User.id == order.user_id).first()
                            
                            if not leader_user:
                                # Create a minimal user record if needed
                                # Try to get mobile from the order or use guest format
                                phone_number = f"guest_{datetime.now(TEHRAN_TZ).timestamp():.0f}"
                                leader_user = User(
                                    phone_number=phone_number,
                                    user_type='CUSTOMER'
                                )
                                self.db.add(leader_user)
                                self.db.flush()

                            # Prepare basket snapshot
                            items = []
                            for order_item in order.items:
                                items.append({
                                    "product_id": order_item.product_id,
                                    "quantity": order_item.quantity,
                                    "unit_price": order_item.base_price
                                })
                            
                            # Check if this is an invited user (has PENDING_INVITE or PENDING_GROUP in shipping address)
                            is_invited_user = (
                                hasattr(order, 'shipping_address') and 
                                order.shipping_address and 
                                (order.shipping_address.startswith('PENDING_INVITE:') or 
                                 order.shipping_address.startswith('PENDING_GROUP:'))
                            )
                            
                            # Create snapshot with appropriate kind
                            snapshot_data = {
                                "items": items,
                                "kind": "secondary" if is_invited_user else "primary",
                                "source_order_id": order.id
                            }
                            
                            try:
                                snapshot_json = json.dumps(snapshot_data, ensure_ascii=False)
                            except Exception:
                                snapshot_json = None

                            # Precompute a unique invite token using order id and authority prefix
                            prefix = authority[:8] if authority else ""
                            invite_token = f"GB{order.id}{prefix}"

                            try:
                                # Create GroupOrder
                                group = GroupOrder(
                                    leader_id=leader_user.id,
                                    invite_token=invite_token,
                                    status=GroupOrderStatus.GROUP_FORMING,
                                    created_at=datetime.now(TEHRAN_TZ),
                                    leader_paid_at=datetime.now(TEHRAN_TZ),
                                    expires_at=datetime.now(TEHRAN_TZ) + timedelta(hours=24),
                                    basket_snapshot=snapshot_json
                                )
                                self.db.add(group)
                                self.db.flush()
                                group_id = group.id
                            except Exception as ge:
                                # Fallback: raw SQL without basket_snapshot column
                                if "no column named basket_snapshot" in str(ge).lower():
                                    # Reset failed transaction before continuing
                                    try:
                                        self.db.rollback()
                                    except Exception:
                                        pass
                                    from sqlalchemy import text
                                    insert_stmt = text(
                                        "INSERT INTO group_orders (leader_id, invite_token, status, created_at, leader_paid_at, expires_at) "
                                        "VALUES (:leader_id, :invite_token, :status, :created_at, :leader_paid_at, :expires_at)"
                                    )
                                    now = datetime.now(TEHRAN_TZ)
                                    self.db.execute(insert_stmt, {
                                        "leader_id": leader_user.id,
                                        "invite_token": invite_token,
                                        "status": GroupOrderStatus.GROUP_FORMING.value if hasattr(GroupOrderStatus, 'value') else str(GroupOrderStatus.GROUP_FORMING),
                                        "created_at": now,
                                        "leader_paid_at": now,
                                        "expires_at": now + timedelta(hours=24),
                                    })
                                    # Retrieve last inserted id (SQLite)
                                    group_id = self.db.execute(text("SELECT last_insert_rowid()")).scalar()
                                else:
                                    raise

                            # Link order to group
                            if group_id:
                                order.group_order_id = group_id
                                order.order_type = OrderType.GROUP
                                # Invite token already set at creation
                                    
                        except Exception as e:
                            logger.error(f"Failed to create GroupOrder after payment: {e}")
                            # Don't fail the payment verification if group creation fails
                            # The order is still valid, just won't have group functionality

                # Handle settlement payments
                if order.is_settlement_payment and order.group_order_id:
                    settlement_service = GroupSettlementService(self.db)
                    result = settlement_service.process_settlement_payment(
                        order.group_order_id, 
                        authority, 
                        verification_result["ref_id"]
                    )
                    logger.info(f"Settlement payment processed: {result}")
                    if result and result.get("success"):
                        settlement_paid_flag = True
                        settlement_message = result.get("message") or "پرداخت مبلغ باقیمانده با موفقیت انجام شد و سفارش شما در زمان تعیین شده ارسال خواهد شد."
                
                # If this order is part of a group, update group status/metrics
                elif order.group_order_id:
                    group = self.db.query(GroupOrder).filter(GroupOrder.id == order.group_order_id).first()
                    if group:
                        # If this is the leader payment, set leader_paid_at and expiry window
                        if group.leader_id and order.user_id == group.leader_id and not group.leader_paid_at:
                            group.leader_paid_at = datetime.now(TEHRAN_TZ)
                            group.expires_at = group.leader_paid_at + timedelta(hours=24)
                        
                        # Check if settlement is required when friends join or leader pays
                        settlement_service = GroupSettlementService(self.db)
                        
                        if order.user_id != group.leader_id:  # This is a friend joining
                            # For invited followers, always mark as "در انتظار" so admin decides next steps
                            try:
                                order.status = "در انتظار"
                            except Exception:
                                pass
                            settlement_check = settlement_service.check_and_mark_settlement_required(group.id)
                            if settlement_check.get("settlement_required"):
                                logger.info(f"Settlement required for group {group.id}: {settlement_check}")
                                
                                # Find the leader's order and mark it as pending settlement
                                leader_order = self.db.query(Order).filter(
                                    Order.group_order_id == group.id,
                                    Order.user_id == group.leader_id,
                                    Order.is_settlement_payment == False
                                ).first()
                                
                                if leader_order:
                                    leader_order.status = "در انتظار تسویه"
                                    logger.info(f"Leader order {leader_order.id} marked as pending settlement")
                            else:
                                # Do not transition followers here; handled on group finalization or explicit settlement processing
                                pass
                        
                        elif is_leader_order:  # This is the leader's order
                            # Check if settlement is required for this leader order
                            settlement_check = settlement_service.check_and_mark_settlement_required(group.id)
                            if settlement_check.get("settlement_required"):
                                # Leader order should be pending settlement, not completed
                                order.status = "در انتظار تسویه"
                                logger.info(f"Leader order {order.id} set to pending settlement status")
                            else:
                                # If no settlement is required after verification, set to pending
                                order.status = "در انتظار"
                                # Transition invited followers to "در انتظار" since leader has no debt
                                try:
                                    followers = self.db.query(Order).filter(
                                        Order.group_order_id == group.id,
                                        Order.user_id != group.leader_id,
                                        Order.is_settlement_payment == False,
                                        Order.ship_to_leader_address == True
                                    ).all()
                                    for fo in followers:
                                        if str(getattr(fo, 'status', '')) == "تایید نشده":
                                            fo.status = "در انتظار"
                                    logger.info(f"Leader OK: transitioned followers of group {group.id} to 'در انتظار'")
                                except Exception as te:
                                    logger.error(f"Error transitioning followers after leader OK: {te}")
                        
                        # Do NOT auto-finalize on friend joins. Finalization occurs only when:
                        # - Leader explicitly finalizes via API, or
                        # - Group expires (24h) and at least one non-leader has paid (handled by expiry service).
                        # Here we intentionally avoid setting group.finalized_at/status.
                        
                        # If leader has not set expiry, ensure 24h window exists
                        if not group.expires_at and group.leader_paid_at:
                            group.expires_at = group.leader_paid_at + timedelta(hours=24)

                # If this is a settlement payment for a group, try to finalize the group
                # without relying on delivery_slot, while still supporting legacy hint.
                try:
                    finalize_group_id = None
                    # Legacy hint path via delivery_slot JSON
                    if order.delivery_slot:
                        import json as _json
                        info = _json.loads(order.delivery_slot)
                        if isinstance(info, dict) and info.get('mode') == 'group_settlement':
                            finalize_group_id = info.get('group_id')
                    # New fallback: any verified settlement payment linked to a group should attempt finalization
                    if not finalize_group_id and order.is_settlement_payment and order.group_order_id:
                        finalize_group_id = order.group_order_id
                    if finalize_group_id:
                        # Fetch group and related orders
                        group = self.db.query(GroupOrder).filter(GroupOrder.id == finalize_group_id).first()
                        if group:
                            orders = self.db.query(Order).filter(Order.group_order_id == finalize_group_id).all()
                            # Ensure at least one non-leader participant paid
                            has_non_leader = False
                            leader_order = next((o for o in orders if getattr(o, 'user_id', None) == getattr(group, 'leader_id', None)), None)
                            for o in orders:
                                if leader_order is not None and getattr(o, 'id', None) == getattr(leader_order, 'id', None):
                                    continue
                                # Ignore settlement payment orders in follower count
                                if getattr(o, 'is_settlement_payment', False):
                                    continue
                                # Consider paid if gateway ref exists OR paid_at timestamp exists
                                if getattr(o, 'payment_ref_id', None) or getattr(o, 'paid_at', None):
                                    has_non_leader = True
                                    break
                            if has_non_leader:
                                for o in orders:
                                    o.state = OrderState.GROUP_SUCCESS
                                    try:
                                        o.status = "pending"
                                    except Exception:
                                        pass
                                try:
                                    if not group.finalized_at:
                                        group.finalized_at = datetime.now(TEHRAN_TZ)
                                except Exception:
                                    group.finalized_at = datetime.now(TEHRAN_TZ)
                                try:
                                    group.status = GroupOrderStatus.GROUP_FINALIZED
                                except Exception:
                                    pass
                except Exception:
                    # Do not fail verification flow on finalize attempt issues
                    pass
                
                # You can add additional logic here like:
                # - Update product stock
                # - Send confirmation email/SMS
                # - Award user coins/points
                # - Trigger order fulfillment process
                
                self.db.commit()
                
                # Run post-processor to ensure settlement is properly checked
                try:
                    post_processor = OrderPostProcessor(self.db)
                    post_processor.process_order(order.id)
                except Exception as e:
                    logger.error(f"Post-processor error: {e}")
                    # Don't fail the payment if post-processor fails
                
                logger.info(f"Payment completed: Order #{order.id}, RefID: {verification_result['ref_id']}")
                
                return {
                    "success": True,
                    "order_id": order.id,
                    "ref_id": verification_result["ref_id"],
                    "status": verification_result["status"],
                    "order_status": order.status,
                    "settlement_paid": settlement_paid_flag,
                    "message": settlement_message or ("تسویه با موفقیت انجام شد" if settlement_paid_flag else None)
                }
            else:
                # Payment verification failed - keep current state for now
                self.db.commit()
                
                return {
                    "success": False,
                    "error": verification_result["error"],
                    "order_id": order.id
                }
                
        except Exception as e:
            logger.error(f"Error verifying payment: {str(e)}")
            return {
                "success": False,
                "error": f"خطا در تایید پرداخت: {str(e)}"
            }

    def get_order_by_authority(self, authority: str) -> Optional[Order]:
        """Get order by payment authority"""
        return self.db.query(Order).filter(Order.payment_authority == authority).first()

    def get_user_orders(self, user_id: Union[int, List[int]], state: str = None) -> list:
        """Get user orders with optional state filter, excluding settlement payments.

        Accepts a single user_id or a list of user_ids to support duplicate accounts
        that share the same phone number.
        """
        from sqlalchemy.orm import joinedload
        from sqlalchemy import or_

        # Normalize user_id parameter to a list for a unified query path
        if isinstance(user_id, list):
            user_ids: List[int] = [int(uid) for uid in user_id if uid is not None]
        else:
            user_ids = [int(user_id)] if user_id is not None else []

        query = self.db.query(Order).options(joinedload(Order.group_order)).filter(
            Order.is_settlement_payment == False  # Exclude settlement payments
        )

        if len(user_ids) == 1:
            query = query.filter(Order.user_id == user_ids[0])
        elif len(user_ids) > 1:
            query = query.filter(Order.user_id.in_(user_ids))
        else:
            # No valid user ids provided -> return empty list early
            return []

        if state:
            query = query.filter(Order.state == state)

        return query.order_by(Order.created_at.desc()).all()
    
    async def create_settlement_payment(
        self,
        group_order_id: int,
        user_id: int,
        description: str = "پرداخت تسویه گروهی"
    ) -> Dict[str, Any]:
        """
        Create a settlement payment for a group order when leader needs to pay price difference.
        
        Args:
            group_order_id: The group order ID requiring settlement
            user_id: The leader's user ID
            description: Payment description
            
        Returns:
            Dict with payment URL and settlement info
        """
        try:
            logger.info(f"Creating settlement payment for group {group_order_id}, user {user_id}")
            settlement_service = GroupSettlementService(self.db)
            
            # Get group order
            group_order = self.db.query(GroupOrder).filter(GroupOrder.id == group_order_id).first()
            if not group_order:
                logger.error(f"Group order {group_order_id} not found")
                return {"success": False, "error": "Group order not found"}
                
            logger.info(f"Group order found: settlement_required={group_order.settlement_required}, settlement_amount={group_order.settlement_amount}")
                
            if not group_order.settlement_required:
                logger.error(f"No settlement required for group {group_order_id}")
                return {"success": False, "error": "No settlement required for this group"}
                
            if group_order.settlement_paid_at:
                logger.error(f"Settlement already paid for group {group_order_id}")
                return {"success": False, "error": "Settlement already paid"}
                
            if group_order.leader_id != user_id:
                logger.error(f"User {user_id} is not leader of group {group_order_id} (leader: {group_order.leader_id})")
                return {"success": False, "error": "Only group leader can pay settlement"}
                
            settlement_amount = group_order.settlement_amount
            if settlement_amount <= 0:
                logger.error(f"Invalid settlement amount: {settlement_amount}")
                return {"success": False, "error": "Invalid settlement amount"}
                
            # Convert tomans to rials for payment gateway
            amount_rial = settlement_amount * 10
            logger.info(f"Requesting payment from ZarinPal: amount={amount_rial} rials ({settlement_amount} tomans)")
            
            # Create payment with ZarinPal
            payment_result = await zarinpal.request_payment(
                amount=amount_rial,
                description=description,
                callback_url=f"{settings.get_payment_callback_base_url}/payment/callback"
            )
            
            logger.info(f"ZarinPal payment result: {payment_result}")
            
            if not payment_result["success"]:
                logger.error(f"ZarinPal payment failed: {payment_result.get('error')}")
                return {"success": False, "error": payment_result["error"]}
                
            authority = payment_result["authority"]
            
            # Create settlement order (not committed until payment verification)
            settlement_order = Order(
                user_id=user_id,
                total_amount=settlement_amount,  # Store in tomans
                status="در انتظار پرداخت",
                order_type=OrderType.ALONE,
                group_order_id=group_order_id,
                is_settlement_payment=True,
                payment_authority=authority,
                shipping_address=f"SETTLEMENT:{group_order_id}"
            )
            
            self.db.add(settlement_order)
            self.db.commit()
            
            logger.info(f"Settlement payment created for group {group_order_id}, amount: {settlement_amount} tomans")
            
            return {
                "success": True,
                "payment_url": payment_result["payment_url"],
                "authority": authority,
                "settlement_amount": settlement_amount,
                "group_order_id": group_order_id,
                "settlement_order_id": settlement_order.id
            }
            
        except Exception as e:
            import traceback
            logger.error(f"Exception creating settlement payment: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {"success": False, "error": f"Failed to create settlement payment: {str(e)}"} 