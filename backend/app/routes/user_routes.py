from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from app.database import get_db
from app.models import User, Order, GroupOrder
from app.schemas import (
    UserCoinsResponse,
    User as UserSchema,
    TransactionsResponse,
    TransactionItem,
    TransactionType,
    TransactionDirection,
)
from app.utils.security import get_current_user
from datetime import datetime

# Change from '/user' to '/users' to match frontend expectations
user_router = APIRouter(prefix="/users", tags=["users"])

@user_router.get("/me", response_model=UserSchema)
async def get_current_user_profile(current_user = Depends(get_current_user)):
    """Get the current authenticated user's profile"""
    return current_user

@user_router.get("/coins", response_model=UserCoinsResponse)
def get_user_coins(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get the current user's coins"""
    return {'coins': current_user.coins} 

@user_router.get("/transactions", response_model=TransactionsResponse)
def list_user_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Unified list of user's transactions including:
    - Order payments (successful payments)
    - Settlement payments by leader
    - Refund payouts to leader
    - Coins earned events (daily checkins)
    """
    items: List[TransactionItem] = []

    # 1) Order payments (successful)
    orders: List[Order] = db.query(Order).filter(
        Order.user_id == current_user.id,
        (Order.payment_ref_id.isnot(None)) | (Order.paid_at.isnot(None))
    ).all()
    for o in orders:
        items.append(TransactionItem(
            id=f"order-{o.id}",
            type=TransactionType.PAYMENT,
            direction=TransactionDirection.OUT,
            amount=int(float(o.total_amount or 0)),
            currency='TOMAN',
            status=str(getattr(o, 'status', '') or ''),
            title="پرداخت سفارش",
            description=f"پرداخت سفارش #{o.id}",
            timestamp=getattr(o, 'paid_at', None) or getattr(o, 'created_at', datetime.utcnow()),
            order_id=o.id,
            group_order_id=getattr(o, 'group_order_id', None),
            payment_ref_id=getattr(o, 'payment_ref_id', None)
        ))

    # 2) Settlement payments made by leader (stored as separate Order with is_settlement_payment=True)
    settlement_orders: List[Order] = db.query(Order).filter(
        Order.user_id == current_user.id,
        getattr(Order, 'is_settlement_payment') == True
    ).all()
    for so in settlement_orders:
        items.append(TransactionItem(
            id=f"settlement-{so.id}",
            type=TransactionType.SETTLEMENT,
            direction=TransactionDirection.OUT,
            amount=int(float(so.total_amount or 0)),
            currency='TOMAN',
            status=str(getattr(so, 'status', '') or ''),
            title="تسویه اختلاف قیمت گروه",
            description=f"پرداخت تسویه برای گروه #{getattr(so, 'group_order_id', '')}",
            timestamp=getattr(so, 'paid_at', None) or getattr(so, 'created_at', datetime.utcnow()),
            order_id=so.id,
            group_order_id=getattr(so, 'group_order_id', None),
            payment_ref_id=getattr(so, 'payment_ref_id', None)
        ))

    # 3) Refund payouts to leader (site pays leader). Exists on GroupOrder when refund_paid_at set
    groups_with_refunds: List[GroupOrder] = db.query(GroupOrder).filter(
        GroupOrder.leader_id == current_user.id,
        GroupOrder.refund_paid_at.isnot(None),
        (GroupOrder.refund_due_amount > 0)
    ).all()
    for g in groups_with_refunds:
        items.append(TransactionItem(
            id=f"refund-{g.id}",
            type=TransactionType.REFUND_PAYOUT,
            direction=TransactionDirection.IN_,
            amount=int(getattr(g, 'refund_due_amount', 0) or 0),
            currency='TOMAN',
            status="پرداخت شد",
            title="واریز بازگشت وجه گروه",
            description=f"واریز به کارت برای گروه #{g.id}",
            timestamp=getattr(g, 'refund_paid_at'),
            group_order_id=g.id,
        ))

    # 4) Coins earned events (from daily rewards)
    try:
        from app.models import DailyReward
        coin_rewards = db.query(DailyReward).filter(DailyReward.user_id == current_user.id).all()
        for r in coin_rewards:
            items.append(TransactionItem(
                id=f"coins-{r.id}",
                type=TransactionType.COINS_EARNED,
                direction=TransactionDirection.IN_,
                amount=int(getattr(r, 'coins_rewarded', 0) or 0),
                currency='COIN',
                status="ثبت شد",
                title="سکه های دریافتی",
                description="پاداش روزانه یا فعالیت کاربری",
                timestamp=getattr(r, 'date', None) or getattr(r, 'created_at', datetime.utcnow()),
            ))
    except Exception:
        # If model missing or query fails, skip coins entries
        pass

    # Sort by timestamp desc
    items.sort(key=lambda x: x.timestamp or datetime.utcnow(), reverse=True)

    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = items[start:end]

    return TransactionsResponse(
        items=page_items,
        total=total,
        page=page,
        page_size=page_size,
    )