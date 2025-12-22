"""
Group Order Routes - API endpoints for group buying functionality
"""

from fastapi import APIRouter, Depends, HTTPException, status, Form, Body
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, case
from datetime import datetime, timedelta, timezone

# Tehran timezone: UTC+3:30
TEHRAN_TZ = timezone(timedelta(hours=3, minutes=30))
try:
    from zoneinfo import ZoneInfo
except Exception:
    ZoneInfo = None  # Will fallback to naive timestamps
import secrets
import string
from typing import Optional, List

from app.database import get_db
from app.models import (
    GroupOrder, Order, User, UserAddress, OrderItem, Product,
    GroupOrderStatus, OrderType
)
from app.utils.security import get_current_user, get_current_user_optional
from app.services.group_settlement_service import GroupSettlementService
from app.services.payment_service import PaymentService
from app.services import notification_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/group-orders", tags=["group-orders"])

# Tehran timezone for date formatting
try:
    tehran = ZoneInfo("Asia/Tehran") if ZoneInfo else None
except Exception:
    tehran = None

# Global timezone conversion function
def tz(d):
    """Convert datetime to Tehran timezone ISO format"""
    if not d:
        return None
    try:
        # If datetime is naive (no timezone info), assume it's UTC
        if d.tzinfo is None:
            d = d.replace(tzinfo=TEHRAN_TZ)
        # Convert to Tehran timezone and return ISO format
        if tehran:
            tehran_time = d.astimezone(tehran)
            return tehran_time.isoformat()
        else:
            return d.isoformat()
    except Exception:
        return d.isoformat()

def generate_invite_token() -> str:
    """Generate a unique invite token for group orders"""
    return ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))


def _is_secondary_group(group: GroupOrder) -> bool:
    """Return True if group's basket_snapshot marks it as secondary."""
    try:
        if getattr(group, 'basket_snapshot', None):
            import json as _json
            meta = _json.loads(group.basket_snapshot)
            if isinstance(meta, dict) and str(meta.get('kind') or '').lower() == 'secondary':
                return True
    except Exception:
        pass
    return False



@router.get("/public-list")
async def public_list(db: Session = Depends(get_db)):
    """Public list of group orders with minimal info (no auth)."""
    groups = db.query(GroupOrder).order_by(GroupOrder.created_at.desc()).all()
    result = []
    for g in groups:
        # Parse kind from basket_snapshot if present
        kind = "primary"
        product_name = None
        try:
            import json as _json
            meta = _json.loads(g.basket_snapshot) if getattr(g, 'basket_snapshot', None) else {}
            if isinstance(meta, dict):
                kind = (meta.get("kind") or "primary").lower()
                src_oid = meta.get("source_order_id")
                if src_oid:
                    src_order = db.query(Order).filter(Order.id == int(src_oid)).first()
                    if src_order and getattr(src_order, 'items', None):
                        first_item = src_order.items[0] if len(src_order.items) > 0 else None
                        if first_item and getattr(first_item, 'product', None):
                            product_name = getattr(first_item.product, 'name', None)
        except Exception:
            pass

        # Count paid members excluding leader and settlement payments
        orders = db.query(Order).filter(
            Order.group_order_id == g.id,
            Order.is_settlement_payment == False,
        ).all()
        paid_members = [
            o for o in orders
            if o.user_id != g.leader_id and (
                o.payment_ref_id is not None or o.paid_at is not None or str(getattr(o, 'status', '')).lower() in ["paid","completed","تکمیل شده"]
            )
        ]

        status = g.status.value if hasattr(g.status, 'value') else str(g.status)
        leader = db.query(User).filter(User.id == g.leader_id).first() if g.leader_id else None
        result.append({
            "id": g.id,
            "kind": kind,
            "status": status,
            "participants_count": len(orders),
            "paid_members": len(paid_members),
            "created_at": g.created_at.isoformat() if g.created_at else None,
            "expires_at": g.expires_at.isoformat() if g.expires_at else None,
            "invite_token": g.invite_token,
            "leader_username": (leader.phone_number if leader else None),
            "product_name": product_name,
        })
    return result

 

@router.post("/create")
async def create_group_order(
    allow_consolidation: bool = Form(default=False),
    address_id: Optional[int] = Form(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    DEPRECATED: This endpoint creates groups without basket_snapshot which causes issues.
    Use the payment flow instead which properly creates groups with basket data.
    """
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="This endpoint is deprecated. Use the payment flow to create groups with proper basket data."
    )

@router.post("/create-secondary")
async def create_secondary_group(
    source_order_id: int = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a secondary group for an invitee who wants to invite their own friends.
    This is called when the invitee clicks the "مبلغ پرداختیت رو پس بگیر!" button.
    """
    import secrets, string
    from datetime import timedelta
    import json

    # Get the source order
    source_order = db.query(Order).filter(Order.id == source_order_id).first()
    if not source_order:
        raise HTTPException(status_code=404, detail="Source order not found")
    
    # Verify the current user owns this order
    if source_order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You don't own this order")
    
    # Verify the order is paid
    if not source_order.paid_at:
        raise HTTPException(status_code=400, detail="Order must be paid before creating secondary group")
    
    # Check if a secondary group already exists for this order
    existing_groups = (
        db.query(GroupOrder)
        .filter(GroupOrder.leader_id == current_user.id)
        .order_by(GroupOrder.created_at.desc())
        .all()
    )
    
    for g in existing_groups:
        try:
            meta = json.loads(getattr(g, 'basket_snapshot', '') or '{}')
            if (isinstance(meta, dict) and 
                str(meta.get('kind', '')).lower() == 'secondary' and 
                int(meta.get('source_order_id', 0)) == int(source_order_id)):
                # Secondary group already exists - update expiry to match source order paid_at + 24h
                from datetime import timedelta as td
                paid_at_fix = source_order.paid_at or source_order.created_at or datetime.now(TEHRAN_TZ)
                if getattr(paid_at_fix, 'tzinfo', None) is None:
                    paid_at_fix = paid_at_fix.replace(tzinfo=TEHRAN_TZ)
                correct_expiry = paid_at_fix + td(hours=24)
                if g.expires_at != correct_expiry:
                    g.expires_at = correct_expiry
                    db.commit()
                    logger.info(f"Updated secondary group {g.id} expiry to {correct_expiry}")
                else:
                    logger.info(f"Secondary group {g.id} already exists for order {source_order_id}")
                return {
                    "success": True,
                    "group_order_id": g.id,
                    "invite_token": g.invite_token,
                    "expires_at": tz(g.expires_at) if g.expires_at else None,
                    "already_exists": True
                }
        except Exception:
            continue
    
    # Generate unique invite token
    def _gen_token(length: int = 12) -> str:
        alphabet = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(length))

    token = _gen_token()
    while db.query(GroupOrder).filter(func.lower(GroupOrder.invite_token) == token.lower()).first():
        token = _gen_token()

    # Set expiry 24 hours from when the user PAID (synced with button timer)
    paid_at = source_order.paid_at or source_order.created_at or datetime.now(TEHRAN_TZ)
    if getattr(paid_at, 'tzinfo', None) is None:
        paid_at = paid_at.replace(tzinfo=TEHRAN_TZ)
    expires_at = paid_at + timedelta(hours=24)

    # Build items snapshot from the source order
    items = []
    try:
        for it in source_order.items:
            product = getattr(it, 'product', None)
            items.append({
                'product_id': it.product_id,
                'quantity': it.quantity,
                'unit_price': it.base_price,
                'product_name': getattr(product, 'name', None) if product else f"محصول {it.product_id}",
            })
    except Exception as e:
        logger.error(f"Error building items for secondary group: {e}")
        items = []

    # Create metadata for secondary group
    meta = {
        'kind': 'secondary',
        'source_group_id': source_order.group_order_id,
        'source_order_id': source_order.id,
        'items': items,
        'hidden': False,  # Visible once created by button click
    }
    snap_json = json.dumps(meta, ensure_ascii=False)

    # Create the new secondary group
    new_group = GroupOrder(
        leader_id=current_user.id,
        invite_token=token,
        status=GroupOrderStatus.GROUP_FORMING,
        created_at=datetime.now(TEHRAN_TZ),
        leader_paid_at=paid_at,
        expires_at=expires_at,
        basket_snapshot=snap_json,
        allow_consolidation=False,  # Secondary groups don't consolidate
    )
    
    db.add(new_group)
    db.commit()
    db.refresh(new_group)
    
    logger.info(f"✅ Created secondary group {new_group.id} for user {current_user.id} from order {source_order_id}")
    
    return {
        "success": True,
        "group_order_id": new_group.id,
        "invite_token": new_group.invite_token,
        "expires_at": tz(new_group.expires_at) if new_group.expires_at else None,
        "already_exists": False
    }

@router.get("/info/{invite_token}")
async def get_group_order_info(
    invite_token: str,
    db: Session = Depends(get_db)
):
    """
    Get group order information using invite token (public endpoint for joining)
    """
    group_order = db.query(GroupOrder).filter(
        GroupOrder.invite_token == invite_token
    ).first()
    
    if not group_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group order not found"
        )
    
    # Get leader info
    leader = db.query(User).filter(User.id == group_order.leader_id).first()
    
    # Get all orders in this group
    orders = db.query(Order).filter(Order.group_order_id == group_order.id).all()
    
    # Calculate time remaining if group is forming
    time_remaining = None
    if group_order.status == GroupOrderStatus.GROUP_FORMING and group_order.expires_at:
        # اطمینان از اینکه هر دو datetime در یک timezone هستند
        expires_at = group_order.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=TEHRAN_TZ)
        current_time = datetime.now(TEHRAN_TZ)
        time_remaining = max(0, int((expires_at - current_time).total_seconds()))
    
    # Count paid members (excluding leader)
    paid_members = len([o for o in orders if o.paid_at and o.user_id != group_order.leader_id])
    
    # Get basket items from basket_snapshot for secondary groups
    basket_items = []
    try:
        if getattr(group_order, 'basket_snapshot', None):
            import json
            snapshot_data = json.loads(group_order.basket_snapshot)
            if isinstance(snapshot_data, dict):
                # Check if this is a secondary group with items
                if snapshot_data.get("kind") == "secondary" and "items" in snapshot_data:
                    basket_items = snapshot_data["items"]
                    logger.info(f"🛒 Found {len(basket_items)} items in secondary group {group_order.id} basket_snapshot")
    except Exception as e:
        logger.warning(f"Failed to parse basket_snapshot for group {group_order.id}: {e}")
    
    return {
        "group_order_id": group_order.id,
        "invite_token": invite_token,
        "status": group_order.status.value,
        "leader": {
            "id": leader.id,
            "phone_number": leader.phone_number[-4:] if leader.phone_number else None,  # Masked
            "first_name": leader.first_name
        },
        "allow_consolidation": group_order.allow_consolidation,
        "created_at": tz(group_order.created_at),
        "leader_paid_at": tz(group_order.leader_paid_at) if group_order.leader_paid_at else None,
        "expires_at": tz(group_order.expires_at) if group_order.expires_at else None,
        "finalized_at": tz(group_order.finalized_at) if group_order.finalized_at else None,
        "time_remaining_seconds": time_remaining,
        "total_members": len(orders),
        "paid_members": paid_members,
        "min_size_met": paid_members >= 1,
        "basket_items": basket_items  # Add basket items for secondary groups
    }

@router.post("/join/{invite_token}")
async def join_group_order(
    invite_token: str,
    ship_to_leader: bool = Form(default=False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Join a group order using invite token
    """
    group_order = db.query(GroupOrder).filter(
        GroupOrder.invite_token == invite_token
    ).first()
    
    if not group_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group order not found"
        )
    
    if group_order.status != GroupOrderStatus.GROUP_FORMING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group order is no longer accepting new members"
        )
    
    # Check if user is already in this group
    existing_order = db.query(Order).filter(
        Order.group_order_id == group_order.id,
        Order.user_id == current_user.id
    ).first()
    
    if existing_order:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already part of this group order"
        )
    
    # Validate shipping consolidation choice
    if ship_to_leader and not group_order.allow_consolidation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Leader has not enabled shipping consolidation"
        )
    
    return {
        "group_order_id": group_order.id,
        "message": "Ready to join group order. Proceed to checkout.",
        "ship_to_leader_available": group_order.allow_consolidation,
        "ship_to_leader_selected": ship_to_leader
    }

@router.post("/finalize/{group_order_id}")
async def finalize_group_order(
    group_order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually finalize a group order (leader or admin only)
    """
    group_order = db.query(GroupOrder).filter(GroupOrder.id == group_order_id).first()
    
    if not group_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group order not found"
        )
    
    # Check permissions (leader or admin)
    if group_order.leader_id != current_user.id and current_user.user_type.value != 'MERCHANT':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the group leader or admin can finalize the order"
        )
    
    if group_order.status != GroupOrderStatus.GROUP_FORMING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group order cannot be finalized"
        )
    
    # Check if minimum requirements are met
    orders = db.query(Order).filter(Order.group_order_id == group_order.id).all()
    paid_members = len([o for o in orders if o.paid_at and o.user_id != group_order.leader_id])
    
    if paid_members < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot finalize: At least 1 member must have paid"
        )
    
    # Create leader order NOW (when group is finalized)
    leader_order = None
    leader_user = db.query(User).filter(User.id == group_order.leader_id).first()
    
    if leader_user and group_order.basket_snapshot:
        try:
            import json
            basket_items = json.loads(group_order.basket_snapshot)
            
            # Calculate total amount from basket
            total_amount = 0
            for item in basket_items:
                total_amount += float(item.get('unit_price', 0)) * int(item.get('quantity', 0))
            
            # Get delivery_slot and shipping_address from invited users' orders
            # Find the first paid invited user order to copy delivery_slot and shipping_address
            sample_invited_order = db.query(Order).filter(
                Order.group_order_id == group_order.id,
                Order.user_id != group_order.leader_id,
                Order.paid_at != None,
                Order.is_settlement_payment == False
            ).first()
            
            delivery_slot = None
            shipping_address = None
            if sample_invited_order:
                delivery_slot = sample_invited_order.delivery_slot
                shipping_address = sample_invited_order.shipping_address
                # Clean up any PENDING markers from shipping address
                if shipping_address and 'PENDING_' in shipping_address:
                    # Remove PENDING_INVITE: or PENDING_GROUP: markers
                    import re
                    shipping_address = re.sub(r'^PENDING_(INVITE|GROUP):[^|]*\|?', '', shipping_address).strip()
            
            # Create leader order
            leader_order = Order(
                user_id=group_order.leader_id,
                total_amount=total_amount,
                status="در حال پردازش",  # Set to processing as default status
                order_type=OrderType.GROUP,
                group_order_id=group_order.id,
                paid_at=datetime.now(TEHRAN_TZ),
                payment_ref_id=f"GROUP_FINALIZED_{group_order_id}",
                is_settlement_payment=False,
                delivery_slot=delivery_slot,
                shipping_address=shipping_address
            )
            
            db.add(leader_order)
            db.flush()  # Get order ID
            
            # Create order items for leader
            for item in basket_items:
                from app.models import OrderItem
                order_item = OrderItem(
                    order_id=leader_order.id,
                    product_id=item.get('product_id'),
                    quantity=item.get('quantity'),
                    base_price=item.get('unit_price')
                )
                db.add(order_item)
            
            logger.info(f"Created leader order {leader_order.id} for finalized group {group_order_id}")
            
        except Exception as e:
            logger.error(f"Error creating leader order for group {group_order_id}: {e}")
            # Don't fail finalization if leader order creation fails
    
    # Finalize the group order
    group_order.status = GroupOrderStatus.GROUP_FINALIZED
    group_order.finalized_at = datetime.now(TEHRAN_TZ)
    
    # Upon finalization: transition invited followers shipping to leader from "تایید نشده" to "در انتظار"
    try:
        followers = db.query(Order).filter(
            Order.group_order_id == group_order.id,
            Order.user_id != group_order.leader_id,
            Order.is_settlement_payment == False,
            Order.ship_to_leader_address == True
        ).all()
        for fo in followers:
            if str(getattr(fo, 'status', '')) == "تایید نشده":
                fo.status = "در انتظار"
    except Exception:
        pass

    db.commit()
    
    logger.info(f"Group order {group_order_id} finalized by user {current_user.id}")
    
    # After finalization, compute any settlement/refund based on final totals
    try:
        settlement_service = GroupSettlementService(db)
        settlement_info = settlement_service.check_and_mark_settlement_required(group_order.id)
    except Exception:
        settlement_info = None
    
    result = {
        "message": "Group order finalized successfully",
        "status": group_order.status.value,
        "finalized_at": tz(group_order.finalized_at)
    }
    
    if leader_order:
        result["leader_order_id"] = leader_order.id
        result["leader_order_created"] = True
    
    if settlement_info:
        try:
            # Bubble up minimal settlement info for client awareness
            if isinstance(settlement_info, dict):
                if settlement_info.get("refund_due"):
                    result["refund_due"] = True
                    result["refund_amount"] = int(settlement_info.get("refund_amount", 0) or 0)
                if settlement_info.get("settlement_required"):
                    result["settlement_required"] = True
                    result["settlement_amount"] = int(settlement_info.get("settlement_amount", 0) or 0)
        except Exception:
            pass

    # Notify leader about the group outcome (SMS/TG)
    try:
        db.refresh(group_order)
    except Exception:
        pass
    if not leader_user and group_order.leader_id:
        leader_user = db.query(User).filter(User.id == group_order.leader_id).first()
    if leader_user:
        try:
            await notification_service.send_group_outcome_notification(leader_user, group_order)
        except Exception as notify_exc:
            logger.error(f"Failed to send group outcome notification for group {group_order_id}: {notify_exc}")

    return result

@router.get("/my-groups")
async def get_my_group_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all group orders the current user is involved in (as leader or member)
    """
    # Primary: by exact user_id
    led_groups = db.query(GroupOrder).filter(GroupOrder.leader_id == current_user.id).all()
    member_orders = db.query(Order).filter(
        Order.user_id == current_user.id,
        Order.group_order_id.isnot(None)
    ).all()
    member_group_ids = [o.group_order_id for o in member_orders]
    member_groups = db.query(GroupOrder).filter(GroupOrder.id.in_(member_group_ids)).all() if member_group_ids else []

    # Robust fallback: also match by phone number to cover duplicate user records
    try:
        phone = (current_user.phone_number or "").strip()
        if phone:
            # Normalize to digits and compare by tail (to avoid prefix differences like +98 / 0)
            import re
            digits = re.sub(r"\D", "", phone)
            if digits:
                # Find all users with matching last 8-10 digits
                # Note: SQLite lacks RIGHT(), so compare via LIKE
                like8 = f"%{digits[-8:]}" if len(digits) >= 8 else f"%{digits}"
                like9 = f"%{digits[-9:]}" if len(digits) >= 9 else like8
                like10 = f"%{digits[-10:]}" if len(digits) >= 10 else like9
                candidates = db.query(User).filter(
                    or_(
                        User.phone_number.like(like10),
                        User.phone_number.like(like9),
                        User.phone_number.like(like8),
                    )
                ).all()
                candidate_ids = list({u.id for u in candidates} | {current_user.id})
                if candidate_ids:
                    # Leader by phone
                    led_phone = db.query(GroupOrder).filter(GroupOrder.leader_id.in_(candidate_ids)).all()
                    # Member by phone
                    member_orders_phone = db.query(Order).filter(
                        Order.user_id.in_(candidate_ids),
                        Order.group_order_id.isnot(None)
                    ).all()
                    member_group_ids_phone = [o.group_order_id for o in member_orders_phone]
                    member_groups_phone = (
                        db.query(GroupOrder).filter(GroupOrder.id.in_(member_group_ids_phone)).all()
                        if member_group_ids_phone else []
                    )
                    led_groups += led_phone
                    member_groups += member_groups_phone

                    # Also include groups whose invite_token encodes a leader order id
                    # Pattern: invite_token starts with 'GB{order_id}'
                    try:
                        # Collect all order IDs for these candidate users
                        candidate_orders = db.query(Order.id).filter(Order.user_id.in_(candidate_ids)).all()
                        order_ids = [row[0] for row in candidate_orders]
                        if order_ids:
                            # Build OR conditions for LIKE patterns GB{order_id}%
                            like_clauses = []
                            params = {}
                            for idx, oid in enumerate(order_ids):
                                key = f"p{idx}"
                                like_clauses.append(f"invite_token LIKE :{key}")
                                params[key] = f"GB{oid}%"
                            if like_clauses:
                                from sqlalchemy import text as _text
                                sql = _text(
                                    "SELECT id FROM group_orders WHERE " + " OR ".join(like_clauses)
                                )
                                rows = db.execute(sql, params).fetchall()
                                inferred_ids = [r[0] for r in rows]
                                if inferred_ids:
                                    inferred_groups = db.query(GroupOrder).filter(GroupOrder.id.in_(inferred_ids)).all()
                                    led_groups += inferred_groups
                    except Exception:
                        # best-effort enrichment
                        pass
    except Exception:
        # Best-effort fallback; ignore phone-based enrichment errors
        pass
    
    # Combine and deduplicate
    all_groups = {g.id: g for g in (led_groups + member_groups)}.values()
    
    result = []
    for group in all_groups:
        orders = db.query(Order).filter(Order.group_order_id == group.id).all()
        paid_members = len([o for o in orders if o.paid_at and o.user_id != group.leader_id])

        # Calculate time remaining
        time_remaining = None
        if group.status == GroupOrderStatus.GROUP_FORMING and group.expires_at:
            # اطمینان از اینکه هر دو datetime در یک timezone هستند
            expires_at = group.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=TEHRAN_TZ)
            current_time = datetime.now(TEHRAN_TZ)
            time_remaining = max(0, int((expires_at - current_time).total_seconds()))
        
        result.append({
            "group_order_id": group.id,
            "invite_token": group.invite_token,
            "status": group.status.value,
            "is_leader": group.leader_id == current_user.id,
            "created_at": tz(group.created_at),
            "expires_at": tz(group.expires_at) if group.expires_at else None,
            "time_remaining_seconds": time_remaining,
            "total_members": len(orders),
            "paid_members": paid_members,
            "allow_consolidation": group.allow_consolidation
        })
    
    return result

@router.get("/my-groups-and-orders")
async def get_user_groups_and_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    یک API یکپارچه که همه اطلاعات گروه‌ها و سفارش‌های کاربر را برمی‌گرداند
    OPTIMIZED VERSION - Uses aggregated queries instead of N+1
    """
    try:
        from sqlalchemy.orm import joinedload
        from sqlalchemy import func
        
        # گرفتن همه سفارشات کاربر با اطلاعات گروه
        # IMPORTANT: Only show orders that have been paid (exclude pending payment orders)
        user_orders = db.query(Order).options(
            joinedload(Order.group_order),
            joinedload(Order.items).joinedload(OrderItem.product)
        ).filter(
            Order.user_id == current_user.id,
            Order.is_settlement_payment == False,
            # Explicitly exclude unpaid orders
            Order.status != "در انتظار پرداخت",
            # Only show orders that have payment evidence (paid orders)
            or_(
                Order.payment_ref_id.isnot(None),
                Order.paid_at.isnot(None)
            )
        ).all()
        
        # استخراج گروه‌ها از سفارشات
        group_ids = set()
        for order in user_orders:
            if order.group_order_id:
                group_ids.add(order.group_order_id)
        
        # پیدا کردن گروه‌هایی که کاربر رهبر آن‌هاست (حتی اگر در آن‌ها سفارش نداشته باشد)
        leader_groups = db.query(GroupOrder).filter(
            GroupOrder.leader_id == current_user.id
        ).all()
        
        # اضافه کردن گروه‌هایی که کاربر رهبر آن‌هاست به group_ids
        # (از set استفاده می‌کنیم تا تکرار نداشته باشیم)
        for group in leader_groups:
            group_ids.add(group.id)
        
        # OPTIMIZATION: Get all counts in ONE query instead of N queries
        groups = {}
        if group_ids:
            # Single aggregated query for all group counts
            group_counts = db.query(
                Order.group_order_id,
                func.count(Order.id).label('total_count'),
                func.sum(
                    case(
                        (or_(Order.paid_at.isnot(None), Order.payment_ref_id.isnot(None)), 1),
                        else_=0
                    )
                ).label('paid_count')
            ).filter(
                Order.group_order_id.in_(list(group_ids)),
                Order.is_settlement_payment == False
            ).group_by(Order.group_order_id).all()
            
            # Convert to dict for fast lookup
            counts_dict = {row.group_order_id: (row.total_count, row.paid_count) for row in group_counts}
            
            group_orders = db.query(GroupOrder).filter(
                GroupOrder.id.in_(list(group_ids))
            ).all()
            
            for group in group_orders:
                # Get counts from pre-computed dict (O(1) instead of N queries!)
                group_orders_count, paid_orders_count = counts_dict.get(group.id, (0, 0))
                
                # فقط گروه‌هایی که حداقل یک سفارش دارند یا basket_snapshot دارند را نمایش دهیم
                # این جلوی نمایش گروه‌های خالی/ناقص را می‌گیرد
                if group_orders_count == 0 and not group.basket_snapshot:
                    continue  # Skip empty groups without basket data
                
                # محاسبه زمان باقی‌مانده
                time_remaining = None
                if group.status == GroupOrderStatus.GROUP_FORMING and group.expires_at:
                    # اطمینان از اینکه هر دو datetime در یک timezone هستند
                    expires_at = group.expires_at
                    if expires_at.tzinfo is None:
                        # اگر offset-naive است، به TEHRAN_TZ تبدیل کنیم
                        expires_at = expires_at.replace(tzinfo=TEHRAN_TZ)
                    current_time = datetime.now(TEHRAN_TZ)
                    time_remaining = max(0, int((expires_at - current_time).total_seconds()))
                
                groups[group.id] = {
                    "id": group.id,
                    "group_order_id": group.id,
                    "status": group.status.value,
                    # Show all groups where current user is the leader, including newly created secondary groups
                    "is_leader": group.leader_id == current_user.id,
                    "created_at": tz(group.created_at),
                    "expires_at": tz(group.expires_at) if group.expires_at else None,
                    "time_remaining_seconds": time_remaining,
                    "total_members": group_orders_count,
                    "paid_members": paid_orders_count,
                    "invite_token": group.invite_token,
                    "allow_consolidation": group.allow_consolidation,
                    # Settlement status fields
                    "settlement_required": group.settlement_required or False,
                    "settlement_amount": group.settlement_amount or 0,
                    "settlement_paid": group.settlement_paid_at is not None,
                    "settlement_paid_at": tz(group.settlement_paid_at) if group.settlement_paid_at else None,
                    # Refund status fields
                    "refund_due_amount": group.refund_due_amount or 0,
                    "refund_card_number": group.refund_card_number,
                    "refund_requested_at": tz(group.refund_requested_at) if group.refund_requested_at else None,
                    "refund_paid_at": tz(group.refund_paid_at) if group.refund_paid_at else None
                }
        
        # آماده‌سازی پاسخ سفارشات با فیلدهای کامل
        orders_data = []
        for order in user_orders:
            # تشخیص وضعیت گروه
            group_status = None
            if order.group_order and order.group_order.status:
                status_val = order.group_order.status.value.lower()
                if 'success' in status_val or 'final' in status_val:
                    group_status = 'success'
                elif 'failed' in status_val or 'expired' in status_val:
                    group_status = 'failed'
                else:
                    group_status = 'ongoing'
            
            order_data = {
                "id": order.id,
                "user_id": order.user_id,
                "total_amount": order.total_amount,
                "status": order.status,
                "created_at": order.created_at,
                "payment_authority": order.payment_authority,
                "payment_ref_id": order.payment_ref_id,
                "shipping_address": order.shipping_address,
                "delivery_slot": order.delivery_slot,
                "items_count": len(order.items),
                "is_settlement_payment": order.is_settlement_payment,
                "group_order_id": order.group_order_id,
                "group_finalized": (
                    order.group_order.finalized_at is not None 
                    if order.group_order else False
                ),
                # فیلدهای جدید برای تشخیص رهبر
                "is_leader_order": (
                    (order.group_order.leader_id is not None and 
                     order.user_id is not None and 
                     order.group_order.leader_id == order.user_id)
                    if order.group_order else False
                ),
                "group_status": group_status,
                "settlement_status": (
                    "settled"
                    if (
                        # Group does not require settlement OR already paid
                        (order.group_order and (
                            getattr(order.group_order, 'settlement_paid_at', None) is not None
                            or getattr(order.group_order, 'settlement_required', True) is False
                        ))
                        # 
                        # es (non-leader members) are always settled from their perspective
                        or (order.group_order and order.group_order.leader_id != order.user_id)
                    ) else "pending"
                ),
                # فیلدهای تجمیع سفارشات برای نمایش آدرس صحیح
                "ship_to_leader_address": getattr(order, 'ship_to_leader_address', False),
                "allow_consolidation": (
                    order.group_order.allow_consolidation
                    if order.group_order else False
                )
            }
            orders_data.append(order_data)
        
        # اضافه کردن سفارشات گروه‌هایی که کاربر رهبر آن‌هاست اما سفارش ندارد
        for group in leader_groups:
            if group.id not in [o.get("group_order_id") for o in orders_data if o.get("group_order_id")]:
                # پیدا کردن سفارش رهبر برای این گروه
                # IMPORTANT: Only show leader orders that have been paid (exclude pending payment orders)
                leader_order = db.query(Order).filter(
                    Order.group_order_id == group.id,
                    Order.user_id == group.leader_id,
                    # Explicitly exclude unpaid orders
                    Order.status != "در انتظار پرداخت",
                    # Only show orders that have payment evidence (paid orders)
                    or_(
                        Order.payment_ref_id.isnot(None),
                        Order.paid_at.isnot(None)
                    )
                ).first()
                
                if leader_order:
                    # تشخیص وضعیت گروه
                    group_status = None
                    if group.status:
                        status_val = group.status.value.lower()
                        if 'success' in status_val or 'final' in status_val:
                            group_status = 'success'
                        elif 'failed' in status_val or 'expired' in status_val:
                            group_status = 'failed'
                        else:
                            group_status = 'ongoing'
                    
                    order_data = {
                        "id": leader_order.id,
                        "user_id": leader_order.user_id,
                        "total_amount": leader_order.total_amount,
                        "status": leader_order.status,
                        "created_at": leader_order.created_at,
                        "payment_authority": leader_order.payment_authority,
                        "payment_ref_id": leader_order.payment_ref_id,
                        "shipping_address": leader_order.shipping_address,
                        "delivery_slot": leader_order.delivery_slot,
                        "items_count": len(leader_order.items),
                        "is_settlement_payment": leader_order.is_settlement_payment,
                        "group_order_id": leader_order.group_order_id,
                        "group_finalized": group.finalized_at is not None,
                        "is_leader_order": True,
                        "group_status": group_status,
                        "settlement_status": (
                            "settled"
                            if (
                                (group and getattr(group, 'settlement_paid_at', None))
                                or (group and getattr(group, 'settlement_required', False) is False)
                            ) else "pending"
                        ),
                        # فیلدهای تجمیع سفارشات
                        "ship_to_leader_address": getattr(leader_order, 'ship_to_leader_address', False),
                        "allow_consolidation": group.allow_consolidation if group else False
                    }
                    orders_data.append(order_data)
        
        return {
            "success": True,
            "groups": list(groups.values()),
            "orders": orders_data,
            "has_leader_groups": any(g["is_leader"] for g in groups.values())
        }
        
    except Exception as e:
        logger.error(f"Error getting user groups and orders: {str(e)}")
        raise HTTPException(status_code=500, detail="خطا در دریافت اطلاعات")

@router.get("/admin/all")
async def get_all_group_orders_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all group orders (admin only)
    """
    if current_user.user_type.value != 'MERCHANT':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    group_orders = db.query(GroupOrder).order_by(GroupOrder.created_at.desc()).all()
    
    result = []
    for group in group_orders:
        leader = db.query(User).filter(User.id == group.leader_id).first()
        orders = db.query(Order).filter(Order.group_order_id == group.id).all()
        paid_members = len([o for o in orders if o.paid_at])
        
        # Calculate time remaining
        time_remaining = None
        if group.status == GroupOrderStatus.GROUP_FORMING and group.expires_at:
            # اطمینان از اینکه هر دو datetime در یک timezone هستند
            expires_at = group.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=TEHRAN_TZ)
            current_time = datetime.now(TEHRAN_TZ)
            time_remaining = max(0, int((expires_at - current_time).total_seconds()))
        
        # Get member names
        member_names = []
        for order in orders:
            if order.user_id and order.paid_at:
                member = db.query(User).filter(User.id == order.user_id).first()
                if member:
                    name = member.first_name or f"***{member.phone_number[-4:]}" if member.phone_number else f"User {member.id}"
                    member_names.append(name)
        
        result.append({
            "group_order_id": group.id,
            "invite_token": group.invite_token,
            "status": group.status.value,
            "leader": {
                "id": leader.id,
                "name": leader.first_name or f"***{leader.phone_number[-4:]}" if leader.phone_number else f"User {leader.id}"
            },
            "created_at": tz(group.created_at),
            "expires_at": tz(group.expires_at) if group.expires_at else None,
            "finalized_at": tz(group.finalized_at) if group.finalized_at else None,
            "time_remaining_seconds": time_remaining,
            "total_members": len(orders),
            "paid_members": paid_members,
            "member_names": member_names,
            "allow_consolidation": group.allow_consolidation
        })
    
    return result

@router.get("/settlement-required")
async def get_groups_requiring_settlement(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all group orders that require settlement payments (admin only)
    """
    if current_user.user_type.value != 'MERCHANT':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    settlement_service = GroupSettlementService(db)
    return settlement_service.get_groups_requiring_settlement()

@router.post("/check-settlement/{group_order_id}")
async def check_settlement_required(
    group_order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check if a group order requires settlement and calculate the amount
    """
    group_order = db.query(GroupOrder).filter(GroupOrder.id == group_order_id).first()
    
    if not group_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group order not found"
        )
    
    # Check permissions (leader or admin)
    if group_order.leader_id != current_user.id and current_user.user_type.value != 'MERCHANT':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the group leader or admin can check settlement"
        )
    
    settlement_service = GroupSettlementService(db)
    return settlement_service.check_and_mark_settlement_required(group_order_id)


@router.post("/create-settlement-payment-simple/{group_order_id}")
async def create_settlement_payment_simple(
    group_order_id: int,
    db: Session = Depends(get_db)
):
    """
    Simple settlement payment creation - bypass auth for now
    """
    group_order = db.query(GroupOrder).filter(GroupOrder.id == group_order_id).first()
    
    if not group_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group order not found"
        )
    
    # First, check and mark settlement if required (in case it wasn't done automatically)
    settlement_service = GroupSettlementService(db)
    settlement_check = settlement_service.check_and_mark_settlement_required(group_order_id)
    
    # If no settlement is required after the check, return error
    if not settlement_check.get("settlement_required"):
        error_detail = f"No settlement required for this group. Check result: expected_friends={settlement_check.get('expected_friends')}, actual_friends={settlement_check.get('actual_friends')}, message={settlement_check.get('message')}"
        logger.error(error_detail)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_detail
        )
    
    payment_service = PaymentService(db)
    try:
        result = await payment_service.create_settlement_payment(
            group_order_id=group_order_id,
            user_id=group_order.leader_id  # Use the group leader ID directly
        )
        logger.info(f"Payment service result for group {group_order_id}: {result}")
        
        if not result.get("success"):
            logger.error(f"Payment creation failed for group {group_order_id}: {result.get('error')}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Failed to create settlement payment")
            )
    except Exception as e:
        import traceback
        logger.error(f"Exception in create_settlement_payment for group {group_order_id}: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error: {str(e)}"
        )
    
    return result

@router.post("/create-settlement-payment/{group_order_id}")
async def create_settlement_payment(
    group_order_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Create a settlement payment for a group order
    """
    import traceback as tb
    from fastapi.responses import JSONResponse as JR
    
    try:
        user_id_info = f"user {current_user.id} ({current_user.phone_number})" if current_user else "unauthenticated"
        logger.info(f"🚀 Settlement payment request for group {group_order_id} by {user_id_info}")
    except Exception as e:
        logger.error(f"❌ Error in initial logging: {e}")
        logger.error(tb.format_exc())
    
    try:
        group_order = db.query(GroupOrder).filter(GroupOrder.id == group_order_id).first()
        
        if not group_order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group order not found"
            )
        
        # Permission check: Only leader can create settlement payment
        # If no auth or broken auth, we'll use the leader_id from the group itself
        if current_user and current_user.id > 0:
            if group_order.leader_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only the group leader can create settlement payment"
                )
        else:
            logger.warning(f"⚠️ No valid auth for group {group_order_id} settlement - using leader_id from group")
        
        # First, check and mark settlement if required (in case it wasn't done automatically)
        settlement_service = GroupSettlementService(db)
        settlement_check = settlement_service.check_and_mark_settlement_required(group_order_id)
        
        logger.info(f"Settlement check for group {group_order_id}: {settlement_check}")
        
        # If no settlement is required after the check, return detailed error
        if not settlement_check.get("settlement_required"):
            error_detail = f"No settlement required for this group. Check result: expected_friends={settlement_check.get('expected_friends')}, actual_friends={settlement_check.get('actual_friends')}, message={settlement_check.get('message')}"
            logger.error(error_detail)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_detail
            )
        
        payment_service = PaymentService(db)
        # Use leader_id if current_user is None or invalid
        user_id_to_use = current_user.id if (current_user and current_user.id > 0) else group_order.leader_id
        
        result = await payment_service.create_settlement_payment(
            group_order_id=group_order_id,
            user_id=user_id_to_use
        )
        logger.info(f"✅ Payment service result for group {group_order_id}: {result}")
        
        if not result.get("success"):
            logger.error(f"❌ Payment creation failed for group {group_order_id}: {result.get('error')}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Failed to create settlement payment")
            )
        
        # Return JSON response explicitly
        return JR(content=result)
            
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"❌❌ OUTER Exception in create_settlement_payment for group {group_order_id}: {str(e)}")
        logger.error(f"OUTER Traceback: {tb.format_exc()}")
        return JR(content={"success": False, "error": f"Outer error: {str(e)}"}, status_code=500)

@router.get("/settlement-status/{group_order_id}")
async def get_settlement_status(
    group_order_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Get settlement status for a group order
    """
    group_order = db.query(GroupOrder).filter(GroupOrder.id == group_order_id).first()
    
    if not group_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group order not found"
        )
    
    # Check permissions (leader or admin) - skip if no auth or broken auth
    if current_user and current_user.id > 0:
        if group_order.leader_id != current_user.id and current_user.user_type.value != 'MERCHANT':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the group leader or admin can view settlement status"
            )
    else:
        logger.warning(f"⚠️ No valid auth for settlement-status on group {group_order_id} - allowing access for leader flow")
    
    # Recompute settlement/refund to ensure up-to-date flags (covers pre-change finalized groups)
    try:
        settlement_service = GroupSettlementService(db)
        _ = settlement_service.check_and_mark_settlement_required(group_order_id)
        db.refresh(group_order)
    except Exception as e:
        logger.error(f"Error in check_and_mark_settlement_required: {e}")
        pass

    # Count actual paid friends
    from sqlalchemy import or_
    paid_friends = db.query(Order).filter(
        Order.group_order_id == group_order_id,
        Order.user_id != group_order.leader_id,
        Order.is_settlement_payment == False,
        or_(
            Order.payment_ref_id.isnot(None),
            Order.paid_at.isnot(None),
            Order.status.in_(["تکمیل شده", "paid", "completed"]),
        )
    ).count()

    # Include aggregation bonus and followers shipping to leader (authoritative for UI)
    paid_followers_to_leader = db.query(Order).filter(
        Order.group_order_id == group_order_id,
        Order.user_id != group_order.leader_id,
        Order.is_settlement_payment == False,
        Order.ship_to_leader_address == True,
        or_(
            Order.payment_ref_id.isnot(None),
            Order.paid_at.isnot(None),
            Order.status.in_(["تکمیل شده", "paid", "completed"]),
        ),
    ).count()
    aggregation_bonus = int(paid_followers_to_leader) * 10000

    response_data = {
        "group_order_id": group_order_id,
        "expected_friends": group_order.expected_friends,
        "actual_friends": paid_friends,
        "settlement_required": group_order.settlement_required,
        "settlement_amount": group_order.settlement_amount,
        "settlement_paid": group_order.settlement_paid_at is not None,
        "settlement_paid_at": tz(group_order.settlement_paid_at) if group_order.settlement_paid_at else None,
        "refund_due": (group_order.refund_due_amount or 0) > 0,
        "refund_amount": group_order.refund_due_amount or 0,
        "refund_paid_at": tz(group_order.refund_paid_at) if group_order.refund_paid_at else None,
        "can_finalize": (not group_order.settlement_required or group_order.settlement_paid_at is not None),
        "followers_to_leader": int(paid_followers_to_leader),
        "aggregation_bonus": int(aggregation_bonus),
    }
    
    # DEBUG: Log the response
    logger.info(f"🔍 Settlement status response for group {group_order_id}: settlement_required={response_data['settlement_required']}, amount={response_data['settlement_amount']}")
    
    return response_data 

@router.post("/submit-refund-card/{group_order_id}")
async def submit_refund_card(
    group_order_id: int,
    card_number: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Leader submits bank card number for refund payout when refund is due.
    """
    group = db.query(GroupOrder).filter(GroupOrder.id == group_order_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group order not found")
    if group.leader_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only leader can submit refund info")
    # Recompute settlement/refund in case it wasn't updated yet
    try:
        settlement_service = GroupSettlementService(db)
        info = settlement_service.check_and_mark_settlement_required(group_order_id)
        db.refresh(group)
    except Exception:
        info = None
    # Allow refund card submission in two cases:
    # 1) Normal refund flow (leader overpaid due to more followers)
    # 2) Failed regular group: leader paid but group failed (no followers)
    allow_submit = False
    if (group.refund_due_amount or 0) > 0:
        allow_submit = True
    else:
        # Case 2: failed regular group with real payment by leader
        if group.status == GroupOrderStatus.GROUP_FAILED and not _is_secondary_group(group):
            leader_order = db.query(Order).filter(
                Order.group_order_id == group.id,
                Order.user_id == group.leader_id,
                Order.is_settlement_payment == False
            ).order_by(Order.created_at.asc()).first()
            if leader_order and leader_order.payment_ref_id:
                allow_submit = True
    if not allow_submit:
        # Provide more context if available
        if isinstance(info, dict):
            expected = info.get("expected_friends")
            actual = info.get("actual_friends")
            raise HTTPException(status_code=400, detail=f"No refund eligible (expected={expected}, actual={actual})")
        raise HTTPException(status_code=400, detail="No refund eligible for this group")
    if not card_number or len(card_number.replace('-', '').replace(' ', '')) < 16:
        raise HTTPException(status_code=400, detail="Invalid card number")

    group.refund_card_number = card_number.strip()
    group.refund_requested_at = datetime.now(TEHRAN_TZ)
    db.commit()
    return {"ok": True, "message": "اطلاعات کارت با موفقیت ثبت شد"}


@router.post("/refund-to-wallet/{group_order_id}")
async def refund_failed_group_to_wallet(
    group_order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Refund leader's payment to wallet (coins) when:
    1. A regular group fails with no members (GROUP_FAILED), OR
    2. A finalized group where leader is owed money (GROUP_FINALIZED with refund_due_amount > 0)
    
    - Regular groups only (not secondary)
    - Only group leader can request
    - Idempotent using group.refund_paid_at as marker
    """
    group = db.query(GroupOrder).filter(GroupOrder.id == group_order_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group order not found")
    if group.leader_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only leader can request refund")
    if _is_secondary_group(group):
        raise HTTPException(status_code=400, detail="Refund flow does not apply to secondary groups")
    
    # Check if this group qualifies for refund:
    # 1. Failed groups (old behavior)
    # 2. Finalized groups with refund_due_amount > 0 (new behavior for leader credit)
    is_failed = group.status == GroupOrderStatus.GROUP_FAILED
    is_finalized_with_refund = (
        group.status == GroupOrderStatus.GROUP_FINALIZED and 
        int(getattr(group, 'refund_due_amount', 0) or 0) > 0
    )
    
    if not (is_failed or is_finalized_with_refund):
        raise HTTPException(status_code=400, detail="Group does not qualify for refund")

    # Idempotency: if refund already paid, return success
    if getattr(group, 'refund_paid_at', None):
        return {"ok": True, "message": "Refund already processed", "coins": current_user.coins}

    # Determine refund amount based on group status
    amount = 0
    if is_finalized_with_refund:
        # For finalized groups, use refund_due_amount
        amount = int(getattr(group, 'refund_due_amount', 0) or 0)
    else:
        # For failed groups, use leader's total_amount
        # Find leader's main order
        leader_order = db.query(Order).filter(
            Order.group_order_id == group.id,
            Order.user_id == group.leader_id,
            Order.is_settlement_payment == False
        ).order_by(Order.created_at.asc()).first()
        if not leader_order:
            raise HTTPException(status_code=400, detail="Leader order not found")

        # Must be real payment via gateway (ref_id present); skip FREE/no-charge orders
        if not leader_order.payment_ref_id:
            raise HTTPException(status_code=400, detail="No paid amount to refund (free order)")
        
        amount = int(leader_order.total_amount or 0)
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Refund amount is zero")

    # Credit to wallet (coins are in Tomans)
    leader = db.query(User).filter(User.id == group.leader_id).first()
    if not leader:
        raise HTTPException(status_code=404, detail="Leader user not found")

    leader.coins = max(0, int(getattr(leader, 'coins', 0)) + int(amount))
    group.refund_paid_at = datetime.now(TEHRAN_TZ)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    return {"ok": True, "message": "مبلغ به کیف پول شما واریز شد", "coins": leader.coins}


@router.post("/secondary/refund-to-wallet/{group_order_id}")
async def refund_secondary_group_to_wallet(
    group_order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Refund leader's due amount to wallet for secondary groups when refund_due_amount > 0.
    Conditions:
    - Secondary groups only
    - Only group leader can request
    - refund_due_amount > 0
    - Idempotent via refund_paid_at
    """
    group = db.query(GroupOrder).filter(GroupOrder.id == group_order_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group order not found")
    if group.leader_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only leader can request refund")
    if not _is_secondary_group(group):
        raise HTTPException(status_code=400, detail="Only for secondary groups")
    amount = int(getattr(group, 'refund_due_amount', 0) or 0)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="No refund due for this group")
    if getattr(group, 'refund_paid_at', None):
        return {"ok": True, "message": "Refund already processed", "coins": current_user.coins}

    leader = db.query(User).filter(User.id == group.leader_id).first()
    if not leader:
        raise HTTPException(status_code=404, detail="Leader user not found")

    leader.coins = max(0, int(getattr(leader, 'coins', 0)) + int(amount))
    group.refund_paid_at = datetime.now(TEHRAN_TZ)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    return {"ok": True, "message": "مبلغ به کیف پول شما واریز شد", "coins": leader.coins}

@router.post("/set-expected-friends/{group_order_id}")
async def set_expected_friends(
    group_order_id: int,
    expected_friends: int = Form(..., ge=0, le=3),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Leader can correct the expected friends count (e.g., set to 1) and trigger recalculation.
    """
    group = db.query(GroupOrder).filter(GroupOrder.id == group_order_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group order not found")
    if group.leader_id != current_user.id and current_user.user_type.value != 'MERCHANT':
        raise HTTPException(status_code=403, detail="Only leader or admin can update expected friends")

    group.expected_friends = expected_friends
    db.commit()

    settlement_service = GroupSettlementService(db)
    info = settlement_service.check_and_mark_settlement_required(group_order_id)
    return {"ok": True, "expected_friends": expected_friends, "recalc": info}


 