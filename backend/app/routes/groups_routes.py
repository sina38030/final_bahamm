from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import logging

# Tehran timezone: UTC+3:30 (Tehran Standard Time - IRST)
TEHRAN_TZ = timezone(timedelta(hours=3, minutes=30))
import json

from app.database import get_db
from app.models import GroupOrder, Order, User, GroupOrderStatus
from app.utils.security import get_current_user

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/groups", tags=["groups"])


class CreateSecondaryGroupBody(BaseModel):
    kind: str
    source_group_id: Optional[int]
    source_order_id: int
    leader_user_id: Optional[int] = None
    expires_at: Optional[str] = None


def _parse_snapshot(snapshot: Optional[str]) -> Dict[str, Any]:
    if not snapshot:
        return {}
    try:
        data = json.loads(snapshot)
        if isinstance(data, dict):
            return data
        return {}
    except Exception:
        return {}


def _serialize_group(g: GroupOrder, db: Session) -> Dict[str, Any]:
    # Participants derived from orders table
    orders = db.query(Order).filter(Order.group_order_id == g.id, Order.is_settlement_payment == False).all()
    participants = []
    for o in orders:
        # Get user info to include phone number for leader detection
        user_info = db.query(User).filter(User.id == o.user_id).first() if o.user_id else None
        telegram_username = getattr(user_info, 'telegram_username', None) if user_info else None
        telegram_id = getattr(user_info, 'telegram_id', None) if user_info else None
        # Determine if participant has paid (by payment evidence: payment_ref_id or paid_at)
        has_payment_evidence = bool(o.payment_ref_id is not None or o.paid_at is not None)
        participants.append({
            "userId": o.user_id,
            "isLeader": (o.user_id == g.leader_id),
            "is_leader": (o.user_id == g.leader_id),  # Alternative field name for compatibility
            "phone": user_info.phone_number if user_info else None,
            "phone_number": user_info.phone_number if user_info else None,  # Alternative field name
            "telegram_username": telegram_username,
            "telegramUsername": telegram_username,
            "telegram_id": telegram_id,
            "telegramId": telegram_id,
            "paid": has_payment_evidence,  # True if participant has paid
            "hasUser": bool(o.user_id),  # True if has user ID
        })
    
    # اطمینان از اینکه رهبر همیشه در لیست participants باشد (حتی اگر سفارش نداشته باشد)
    leader_in_participants = any(p["userId"] == g.leader_id for p in participants)
    if not leader_in_participants and g.leader_id:
        leader_info = db.query(User).filter(User.id == g.leader_id).first()
        participants.append({
            "userId": g.leader_id,
            "isLeader": True,
            "is_leader": True,
            "phone": leader_info.phone_number if leader_info else None,
            "phone_number": leader_info.phone_number if leader_info else None,
        })

    status_map = {
        GroupOrderStatus.GROUP_FORMING: "ongoing",
        GroupOrderStatus.GROUP_FINALIZED: "success",
        GroupOrderStatus.GROUP_FAILED: "failed",
    }
    meta = _parse_snapshot(getattr(g, "basket_snapshot", None))

    share_url = f"/landingM?invite={g.invite_token}" if getattr(g, "invite_token", None) else None

    # Get leader info
    leader_info = db.query(User).filter(User.id == g.leader_id).first() if g.leader_id else None
    # Determine expected friends intelligently (avoid hardcoded 1)
    is_secondary = (meta.get("kind") == "secondary")
    expected_friends = getattr(g, 'expected_friends', None)
    if (expected_friends is None) and (not is_secondary):
        try:
            # Re-evaluate settlement which also infers expected_friends when missing
            from app.services.group_settlement_service import GroupSettlementService
            GroupSettlementService(db).check_and_mark_settlement_required(g.id)
            # Refresh group to get updated expected_friends
            g = db.query(GroupOrder).filter(GroupOrder.id == g.id).first() or g
            expected_friends = getattr(g, 'expected_friends', None)
        except Exception:
            expected_friends = None
    # For secondary groups, expected_friends is not applicable
    if is_secondary:
        expected_friends = None
    # Backward-compatible minJoinersForSuccess: use expected_friends when available,
    # otherwise 0 for secondary groups, else fallback to 1
    min_joiners = (
        int(expected_friends) if isinstance(expected_friends, int) else (0 if is_secondary else 1)
    )
    
    # Calculate remaining time in seconds
    remaining_seconds = None
    expires_at_ms = None
    server_now_ms = None
    current_time = datetime.now(TEHRAN_TZ)

    # For finalized groups (success or failed), remaining time should always be 0
    if getattr(g, "status", None) in [GroupOrderStatus.GROUP_FINALIZED, GroupOrderStatus.GROUP_FAILED]:
        remaining_seconds = 0
        expires_at_ms = int(current_time.timestamp() * 1000)  # Set to current time
        server_now_ms = int(current_time.timestamp() * 1000)
    elif g.expires_at:
        # اطمینان از اینکه هر دو datetime در یک timezone هستند
        expires_at = g.expires_at
        if expires_at.tzinfo is None:
            # If naive, assume it's already Tehran time (as stored by the app)
            expires_at = expires_at.replace(tzinfo=TEHRAN_TZ)

        remaining_seconds = max(0, int((expires_at - current_time).total_seconds()))

        # If group has expired and is still ongoing, mark it as failed
        if remaining_seconds == 0 and getattr(g, "status", None) == GroupOrderStatus.GROUP_FORMING:
            try:
                # Count paid followers to determine if it should be success or failed
                orders = db.query(Order).filter(Order.group_order_id == g.id, Order.is_settlement_payment == False).all()
                paid_followers = sum(1 for o in orders if o.user_id != g.leader_id and (o.payment_ref_id is not None or o.paid_at is not None))

                if paid_followers >= 1:
                    g.status = GroupOrderStatus.GROUP_FINALIZED
                    status = "success"
                else:
                    g.status = GroupOrderStatus.GROUP_FAILED
                    status = "failed"

                # Save the changes
                db.commit()
                logger.info(f"Auto-marked expired group {g.id} as {status} (paid followers: {paid_followers})")
            except Exception as e:
                logger.error(f"Error auto-marking expired group {g.id}: {e}")
                db.rollback()

        # Also provide millisecond timestamps for more precise client-side countdown
        expires_at_ms = int(expires_at.timestamp() * 1000)
        server_now_ms = int(current_time.timestamp() * 1000)
    
    # Build basket items from snapshot or orders
    basket_items = []
    original_total = 0
    
    # Helper to get price from product with all pricing tiers
    def get_product_pricing(product, order_item=None):
        if product:
            solo = float(getattr(product, "solo_price", 0) or getattr(product, "market_price", 0) or 0)
            f1 = float(getattr(product, "friend_1_price", 0) or 0)
            f2 = float(getattr(product, "friend_2_price", 0) or 0)
            f3 = float(getattr(product, "friend_3_price", 0) or 0)
            return {
                "solo_price": solo if solo > 0 else (float(getattr(order_item, "base_price", 0) or 0) if order_item else 0),
                "friend_1_price": f1,
                "friend_2_price": f2,
                "friend_3_price": f3,
            }
        elif order_item:
            base = float(getattr(order_item, "base_price", 0) or 0)
            return {"solo_price": base, "friend_1_price": 0, "friend_2_price": 0, "friend_3_price": 0}
        return {"solo_price": 0, "friend_1_price": 0, "friend_2_price": 0, "friend_3_price": 0}
    
    # Try to get items from meta (basket_snapshot)
    if meta.get("items"):
        from app.models import Product
        for item in meta.get("items", []):
            unit_price = float(item.get("unit_price", 0) or 0)
            qty = int(item.get("quantity", 1) or 1)
            product_id = item.get("product_id")
            
            # Try to get product pricing
            product = db.query(Product).filter(Product.id == product_id).first() if product_id else None
            pricing = get_product_pricing(product)
            
            # Use solo_price if unit_price is 0
            if unit_price == 0 and pricing["solo_price"] > 0:
                unit_price = pricing["solo_price"]
            
            basket_items.append({
                "productId": str(product_id or ""),
                "name": item.get("product_name") or (getattr(product, "name", None) if product else None) or f"محصول {product_id}",
                "qty": qty,
                "unitPrice": unit_price,
                "discountedUnitPrice": unit_price,
                "image": item.get("image"),
                # Include pricing tiers for frontend calculation
                "solo_price": pricing["solo_price"] if pricing["solo_price"] > 0 else unit_price,
                "friend_1_price": pricing["friend_1_price"],
                "friend_2_price": pricing["friend_2_price"],
                "friend_3_price": pricing["friend_3_price"],
            })
            original_total += (pricing["solo_price"] if pricing["solo_price"] > 0 else unit_price) * qty
    
    # If no items in snapshot, try to get from orders
    if not basket_items and orders:
        for o in orders:
            if hasattr(o, 'items') and o.items:
                for item in o.items:
                    product = getattr(item, "product", None)
                    pricing = get_product_pricing(product, item)
                    unit_price = pricing["solo_price"] if pricing["solo_price"] > 0 else float(getattr(item, "base_price", 0) or 0)
                    qty = int(getattr(item, "quantity", 1) or 1)
                    basket_items.append({
                        "productId": str(item.product_id),
                        "name": getattr(product, "name", f"محصول {item.product_id}") if product else f"محصول {item.product_id}",
                        "qty": qty,
                        "unitPrice": unit_price,
                        "discountedUnitPrice": unit_price,
                        "image": getattr(product, "image_url", None) if product else None,
                        # Include pricing tiers for frontend calculation
                        "solo_price": pricing["solo_price"] if pricing["solo_price"] > 0 else unit_price,
                        "friend_1_price": pricing["friend_1_price"],
                        "friend_2_price": pricing["friend_2_price"],
                        "friend_3_price": pricing["friend_3_price"],
                    })
                    original_total += unit_price * qty
                break  # Only get items from first order (leader's order)
    
    # Calculate pricing based on group type and number of paid members
    non_leader_paid = sum(1 for p in participants if not p.get("isLeader") and p.get("paid", False))
    current_total = original_total
    
    if is_secondary and original_total > 0:
        # Secondary group: Each friend reduces payment by 1/4
        capped_friends = min(non_leader_paid, 3)
        quarter = original_total / 4
        current_total = max(0, original_total - capped_friends * quarter)
        if non_leader_paid >= 4:
            current_total = 0
    elif not is_secondary and basket_items:
        # Regular group: Calculate based on pricing tiers
        def get_item_price_for_friends(item, friends):
            if friends == 0:
                return item.get("solo_price", item.get("unitPrice", 0))
            elif friends == 1:
                f1 = item.get("friend_1_price", 0)
                return f1 if f1 > 0 else item.get("solo_price", item.get("unitPrice", 0)) / 2
            elif friends == 2:
                f2 = item.get("friend_2_price", 0)
                return f2 if f2 > 0 else item.get("solo_price", item.get("unitPrice", 0)) / 3
            else:  # 3 or more friends = free
                return item.get("friend_3_price", 0)
        
        if non_leader_paid >= 3:
            current_total = 0
        else:
            current_total = sum(
                get_item_price_for_friends(item, non_leader_paid) * item.get("qty", 1)
                for item in basket_items
            )
    
    # Calculate consolidation reward (aggregation bonus)
    # Count paid members who opted to ship to leader address
    paid_followers_to_leader = db.query(Order).filter(
        Order.group_order_id == g.id,
        Order.user_id != g.leader_id,
        Order.is_settlement_payment == False,
        Order.ship_to_leader_address == True,
        or_(
            Order.payment_ref_id.isnot(None),
            Order.paid_at.isnot(None),
        ),
    ).count()
    aggregation_bonus = int(paid_followers_to_leader) * 10000  # 10,000 Tomans per member
    
    # Get leader's initial payment amount and shipping cost from their order
    leader_order = db.query(Order).filter(
        Order.group_order_id == g.id,
        Order.user_id == g.leader_id,
        Order.is_settlement_payment == False,
    ).order_by(Order.created_at.asc()).first()
    
    amount_paid = 0
    shipping_cost = 0
    if leader_order:
        amount_paid = float(getattr(leader_order, 'total_amount', 0) or 0)
        # Shipping cost is typically included in total_amount, calculate as difference
        # from basket items if possible, otherwise use fixed shipping cost
        shipping_cost = 0  # Will be calculated on frontend based on current rules
    
    return {
        "id": g.id,
        "kind": (meta.get("kind") or "primary"),
        "status": status_map.get(getattr(g, "status", GroupOrderStatus.GROUP_FORMING), "ongoing"),
        "leaderUserId": g.leader_id,
        "leader": {
            "id": g.leader_id,
            "phone_number": leader_info.phone_number if leader_info else None,
        } if leader_info else None,
        "minJoinersForSuccess": min_joiners,
        "expectedFriends": expected_friends,
        "participants": participants,
        "expiresAt": g.expires_at.isoformat() if g.expires_at else None,
        "remainingSeconds": remaining_seconds,
        "expiresAtMs": expires_at_ms,
        "serverNowMs": server_now_ms,
        "sourceGroupId": meta.get("source_group_id"),
        "sourceOrderId": meta.get("source_order_id"),
        "joinCode": g.invite_token,
        "shareUrl": share_url,
        # Additional fields for secondary_invite page
        "basket": basket_items,
        "pricing": {
            "originalTotal": original_total,
            "currentTotal": current_total,
            "expectedTotal": 0 if is_secondary else original_total,
        },
        "invite": {
            "shareUrl": share_url,
        },
        "isSecondaryGroup": is_secondary,
        "groupType": "secondary" if is_secondary else "primary",
        # Consolidation reward
        "rewardCredit": aggregation_bonus,
        "aggregationBonus": aggregation_bonus,
        "followersToLeader": int(paid_followers_to_leader),
        # Leader payment info
        "amountPaid": amount_paid,
        "initialPayment": amount_paid,
        "shippingCost": shipping_cost,
    }


@router.get("/{group_id}")
async def get_group(group_id: str, db: Session = Depends(get_db)):
    # Try to parse as int first (numeric group ID)
    group = None
    try:
        gid = int(group_id)
        group = db.query(GroupOrder).filter(GroupOrder.id == gid).first()
    except ValueError:
        # Not a numeric ID, try as invite_token/code
        pass
    
    # If not found by ID, try by invite_token
    if not group:
        from sqlalchemy import func
        group = db.query(GroupOrder).filter(
            func.lower(GroupOrder.invite_token) == str(group_id).lower()
        ).order_by(GroupOrder.created_at.desc()).first()
    
    # If still not found, try legacy GB code format
    if not group and group_id and str(group_id).startswith("GB"):
        try:
            raw = str(group_id)[2:]
            digits = ""
            for ch in raw:
                if ch.isdigit():
                    digits += ch
                else:
                    break
            if digits:
                from app.models import Order
                order_id = int(digits)
                order = db.query(Order).filter(Order.id == order_id).first()
                if order and order.group_order_id:
                    group = db.query(GroupOrder).filter(GroupOrder.id == order.group_order_id).first()
        except Exception:
            pass
    
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return _serialize_group(group, db)

@router.get("/{group_id}/status")
async def get_group_status(group_id: int, db: Session = Depends(get_db)):
    group = db.query(GroupOrder).filter(GroupOrder.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    # Proactively re-evaluate settlement only if it hasn't been paid yet
    try:
        if not getattr(group, 'settlement_paid_at', None):
            from app.services.group_settlement_service import GroupSettlementService
            GroupSettlementService(db).check_and_mark_settlement_required(group_id)
    except Exception:
        pass
    orders = db.query(Order).filter(Order.group_order_id == group.id, Order.is_settlement_payment == False).all()
    # Count paid followers STRICTLY by payment evidence (ignore textual statuses)
    paid_followers = [
        o for o in orders
        if o.user_id != group.leader_id and (o.payment_ref_id is not None or o.paid_at is not None)
    ]
    now = datetime.now(TEHRAN_TZ)
    is_expired = group.expires_at is not None and now >= group.expires_at
    status = "ongoing"
    if getattr(group, "status", None) == GroupOrderStatus.GROUP_FINALIZED:
        status = "success"
    elif getattr(group, "status", None) == GroupOrderStatus.GROUP_FAILED:
        status = "failed"
    elif is_expired:
        status = "success" if len(paid_followers) >= 1 else "failed"
    return {
        "id": group.id,
        "status": status,
        "participantsCount": len(orders),
        "paidFollowers": len(paid_followers),
        "expiresAt": group.expires_at.isoformat() if group.expires_at else None,
    }


@router.post("")
async def create_group(
    body: CreateSecondaryGroupBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    x_idempotency_key: Optional[str] = Header(default=None, alias="X-Idempotency-Key"),
):
    # Enable secondary group creation

    # Validate kind
    if (body.kind or "").lower() != "secondary":
        raise HTTPException(status_code=400, detail="Only secondary group creation is supported here")

    # Validate source order is paid
    order = db.query(Order).filter(Order.id == body.source_order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Source order not found")
    if not (order.paid_at or str(getattr(order, "status", "")).lower() in ["paid", "completed"] or order.payment_ref_id):
        raise HTTPException(status_code=400, detail="Source order is not paid")

    # Enforce one active secondary group per (leader, source_order)
    existing_groups: List[GroupOrder] = db.query(GroupOrder).filter(
        GroupOrder.leader_id == current_user.id,
        GroupOrder.status == GroupOrderStatus.GROUP_FORMING,
    ).all()
    for g in existing_groups:
        meta = _parse_snapshot(getattr(g, "basket_snapshot", None))
        if meta.get("kind") == "secondary" and meta.get("source_order_id") == body.source_order_id:
            return _serialize_group(g, db)

    # Create new group
    from .group_order_routes import generate_invite_token  # reuse helper
    token = generate_invite_token()
    # Ensure uniqueness
    while db.query(GroupOrder).filter(GroupOrder.invite_token == token).first():
        token = generate_invite_token()

    # Determine expiry based on payment time + 24h, fallback to now+24h
    try:
        paid_at = order.paid_at or datetime.now(TEHRAN_TZ)
    except Exception:
        paid_at = datetime.now(TEHRAN_TZ)
    # Normalize to Tehran TZ and add 24 hours
    from datetime import timedelta
    if paid_at.tzinfo is None:
        paid_at = paid_at.replace(tzinfo=TEHRAN_TZ)
    expires_at = paid_at + timedelta(hours=24)

    # Build items list from source order
    items = []
    if order and hasattr(order, 'items'):
        for item in order.items:
            product = getattr(item, "product", None)
            items.append({
                "product_id": item.product_id,
                "quantity": item.quantity,
                "unit_price": item.base_price,
                "product_name": getattr(product, "name", None) if product else f"محصول {item.product_id}",
            })

    meta = {
        "kind": "secondary",
        "source_group_id": body.source_group_id,
        "source_order_id": body.source_order_id,
        "idempotency_key": x_idempotency_key,
        "items": items,  # Add items to snapshot
    }

    group = GroupOrder(
        leader_id=current_user.id,
        invite_token=token,
        status=GroupOrderStatus.GROUP_FORMING,
        leader_paid_at=paid_at,
        expires_at=expires_at,
        basket_snapshot=json.dumps(meta),
    )
    db.add(group)
    db.commit()
    db.refresh(group)

    return _serialize_group(group, db)

