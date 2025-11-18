from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
import json

from app.database import get_db
from app.models import User, Order, GroupOrder, Review, Product, OrderItem
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

@user_router.get("/reviews")
async def get_user_reviews(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all reviews by the current user with associated order information"""
    try:
        # Get all reviews by the user
        reviews = db.query(Review).filter(Review.user_id == current_user.id).order_by(Review.created_at.desc()).all()
        
        result = []
        for review in reviews:
            # Get the product information
            product = db.query(Product).filter(Product.id == review.product_id).first()
            
            # Find the order that contains this product for this user
            # Look for orders that have this product
            order = db.query(Order).join(OrderItem).filter(
                Order.user_id == current_user.id,
                OrderItem.product_id == review.product_id
            ).order_by(Order.created_at.desc()).first()
            
            order_info = None
            order_items = []
            
            if order:
                # Get all items in this order
                items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
                for item in items:
                    item_product = db.query(Product).filter(Product.id == item.product_id).first()
                    if item_product:
                        # Get first image
                        images = []
                        if item_product.images:
                            try:
                                images = json.loads(item_product.images) if isinstance(item_product.images, str) else item_product.images
                            except:
                                images = []
                        
                        order_items.append({
                            "product_id": item.product_id,
                            "name": item_product.name,
                            "quantity": item.quantity,
                            "image": images[0] if images else None,
                            "base_price": item.base_price
                        })
                
                order_info = {
                    "id": order.id,
                    "status": order.status,
                    "total_amount": order.total_amount,
                    "created_at": order.created_at.isoformat() if order.created_at else None,
                    "items": order_items
                }
            
            # Get product images
            product_images = []
            if product and product.images:
                try:
                    product_images = json.loads(product.images) if isinstance(product.images, str) else product.images
                except:
                    product_images = []
            
            result.append({
                "id": review.id,
                "rating": review.rating,
                "comment": review.comment,
                "display_name": review.display_name,
                "product_id": review.product_id,
                "product_name": product.name if product else "محصول حذف شده",
                "product_image": product_images[0] if product_images else None,
                "user_id": review.user_id,
                "approved": review.approved,
                "created_at": review.created_at.isoformat() if review.created_at else None,
                "order": order_info
            })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))