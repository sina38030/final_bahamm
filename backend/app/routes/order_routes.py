from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import random
import string

from app.database import get_db
from app.models import Product, ProductOption, Order, OrderItem, GroupBuy, GroupBuyParticipant, User
from app.schemas import PurchaseCreate, GroupBuyResponse, OrderSubmit

order_router = APIRouter(prefix="/orders", tags=["orders"])

@order_router.post("/purchase", response_model=GroupBuyResponse)
def submit_purchase(purchase: PurchaseCreate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == purchase.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    option = db.query(ProductOption).filter(ProductOption.id == purchase.option_id).first()
    if not option:
        raise HTTPException(status_code=404, detail="Option not found")

    if option.stock < purchase.quantity:
        raise HTTPException(status_code=400, detail="موجودی کافی نیست")

    price = product.market_price if purchase.is_group_purchase else product.base_price
    total_price = (price + option.price_adjustment) * purchase.quantity

    # Create order and order item
    order = Order(user_id=1, total_amount=total_price, status='در انتظار پرداخت')  # Assume user_id 1 for now
    db.add(order)
    db.flush()

    order_item = OrderItem(order_id=order.id, product_id=purchase.product_id, quantity=purchase.quantity, base_price=price)
    db.add(order_item)

    # Update stock
    option.stock -= purchase.quantity
    
    if purchase.is_group_purchase:
        # Generate a unique invite code
        invite_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        
        # Create a new group buy
        group_buy = GroupBuy(
            product_id=purchase.product_id,
            creator_id=1,  # Assume user_id 1 for now
            invite_code=invite_code,
            status='در انتظار',
            created_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=1)  # Group buy expires in 24 hours
        )
        db.add(group_buy)
        db.flush()

        # Add the creator as the first participant
        participant = GroupBuyParticipant(group_buy_id=group_buy.id, user_id=1)
        db.add(participant)

        response_data = {
            'message': 'خرید گروهی با موفقیت آغاز شد',
            'order_id': order.id,
            'group_buy_id': group_buy.id,
            'invite_code': invite_code
        }
    else:
        response_data = {
            'message': 'سفارش با موفقیت ثبت شد',
            'order_id': order.id
        }

    try:
        db.commit()
        return response_data
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="خطا در ثبت سفارش. لطفا دوباره تلاش کنید.")

@order_router.post("/submit", status_code=200)
def submit_order(order: OrderSubmit, db: Session = Depends(get_db)):
    # TODO: Implement proper user authentication
    user = db.query(User).filter(User.id == 1).first()  # Assuming user with ID 1 for now

    product = db.query(Product).filter(Product.id == order.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    total_price = product.base_price * order.quantity
    coin_discount = min(order.used_coins, user.coins) * 1000  # Assuming 1 coin = 1000 currency units
    final_price = total_price - coin_discount + product.shipping_cost

    new_order = Order(user_id=user.id, total_amount=final_price, status='pending')
    db.add(new_order)
    db.flush()

    order_item = OrderItem(order_id=new_order.id, product_id=order.product_id, quantity=order.quantity, base_price=product.base_price)
    db.add(order_item)

    user.coins -= min(order.used_coins, user.coins)

    try:
        db.commit()
        return {'message': 'Order submitted successfully'}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to submit order") 