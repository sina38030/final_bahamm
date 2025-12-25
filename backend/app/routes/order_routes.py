from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

# Tehran timezone: UTC+3:30
TEHRAN_TZ = timezone(timedelta(hours=3, minutes=30))
import random
import string
from typing import Optional

from app.database import get_db
from app.models import (
    Product, Order, OrderItem, User, GroupOrder, 
    OrderType, GroupOrderStatus
)
from app.utils.security import get_current_user

order_router = APIRouter(prefix="/orders", tags=["orders"])

@order_router.post("/create")
async def create_order(
    items: str = Form(...),  # JSON string of cart items
    order_type: str = Form(default="ALONE"),  # ALONE or GROUP
    group_order_id: Optional[int] = Form(default=None),
    ship_to_leader_address: bool = Form(default=False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new order (alone or as part of a group)
    """
    import json
    
    try:
        # Parse cart items
        cart_items = json.loads(items)
        
        if not cart_items:
            raise HTTPException(
                status_code=400,
                detail="Cart is empty"
            )
        
        # Validate order type
        if order_type not in ["ALONE", "GROUP"]:
            raise HTTPException(
                status_code=400,
                detail="Invalid order type"
            )
        
        # Validate group order if specified
        group_order = None
        if order_type == "GROUP":
            if not group_order_id:
                raise HTTPException(
                    status_code=400,
                    detail="Group order ID required for group orders"
                )
            
            group_order = db.query(GroupOrder).filter(GroupOrder.id == group_order_id).first()
            if not group_order:
                raise HTTPException(
                    status_code=404,
                    detail="Group order not found"
                )
            
            if group_order.status != GroupOrderStatus.GROUP_FORMING:
                raise HTTPException(
                    status_code=400,
                    detail="Group order is not accepting new members"
                )
            
            # Check if user is already in this group
            existing_order = db.query(Order).filter(
                Order.group_order_id == group_order_id,
                Order.user_id == current_user.id
            ).first()
            
            if existing_order:
                raise HTTPException(
                    status_code=400,
                    detail="You already have an order in this group"
                )
        
        # Calculate total amount and validate products
        total_amount = 0
        order_items_data = []
        
        for item in cart_items:
            product_id = item.get('product_id')
            quantity = item.get('quantity', 1)
            
            product = db.query(Product).filter(Product.id == product_id).first()
            if not product:
                raise HTTPException(
                    status_code=404,
                    detail=f"Product {product_id} not found"
                )
            
            # Calculate price (base price for now, can be enhanced later)
            item_price = product.base_price * quantity
            total_amount += item_price
            
            order_items_data.append({
                'product_id': product_id,
                'quantity': quantity,
                'base_price': product.base_price
            })
        
        # Create the order
        order = Order(
            user_id=current_user.id,
            total_amount=total_amount,
            status='pending',
            order_type=OrderType.GROUP if order_type == "GROUP" else OrderType.ALONE,
            group_order_id=group_order_id,
            ship_to_leader_address=ship_to_leader_address
        )
        
        db.add(order)
        db.flush()  # Get the order ID
        
        # Create order items
        for item_data in order_items_data:
            order_item = OrderItem(
                order_id=order.id,
                product_id=item_data['product_id'],
                quantity=item_data['quantity'],
                base_price=item_data['base_price']
            )
            db.add(order_item)
        
        db.commit()
        
        return {
            "order_id": order.id,
            "total_amount": total_amount,
            "order_type": order_type,
            "group_order_id": group_order_id,
            "message": "Order created successfully"
        }
        
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Invalid cart items format"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create order: {str(e)}"
        )

@order_router.get("/{order_id}")
async def get_order_public(order_id: int, db: Session = Depends(get_db)):
    """Public order fetch for success page (masked fields only)."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    # Build items with product names and image if exists
    items = []
    for it in order.items:
        product = getattr(it, 'product', None)
        image_url = None
        try:
            if product and getattr(product, 'images', None):
                image_url = next((img.image_url for img in product.images if getattr(img, 'is_main', False)), None)
        except Exception:
            image_url = None
        items.append({
            "productId": it.product_id,
            "name": getattr(product, 'name', None) or f"محصول {it.product_id}",
            "qty": it.quantity,
            "unitPrice": it.base_price,
            "image": image_url,
        })
    # Masked payment
    masked_card = None
    bank_ref = getattr(order, 'payment_ref_id', None)

    # Calculate totals based on order type
    total_original = float(order.total_amount or 0)
    total_paid = total_original

    # For group orders, apply the 10,000 toman discount that was applied during payment
    if order.order_type == OrderType.GROUP and order.group_order_id:
        total_paid = max(0, total_original - 10000)

    return {
        "id": order.id,
        "userId": order.user_id,
        "status": (order.status or ""),
        "totalOriginal": total_original,
        "totalPaid": total_paid,
        "paidAt": order.paid_at.isoformat() if order.paid_at else None,
        "items": items,
        "payment": {"maskedCard": masked_card or "****-****-****-****", "bankRef": bank_ref or ""},
        "delivery_slot": order.delivery_slot,
        "address": order.shipping_address,
    }

@order_router.post("/payment-success/{order_id}")
async def mark_payment_success(
    order_id: int,
    payment_authority: str = Form(...),
    payment_ref_id: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark an order as paid and handle group order logic
    """
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user.id
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )
    
    if order.paid_at:
        raise HTTPException(
            status_code=400,
            detail="Order already paid"
        )
    
    # Mark order as paid
    order.status = 'paid'
    order.paid_at = datetime.now(TEHRAN_TZ)
    order.payment_authority = payment_authority
    order.payment_ref_id = payment_ref_id
    
    # Handle group order logic
    if order.order_type == OrderType.GROUP and order.group_order_id:
        group_order = db.query(GroupOrder).filter(GroupOrder.id == order.group_order_id).first()
        
        if group_order:
            # If this is the leader's payment, start the countdown
            if group_order.leader_id == current_user.id and not group_order.leader_paid_at:
                group_order.leader_paid_at = datetime.now(TEHRAN_TZ)
                group_order.expires_at = datetime.now(TEHRAN_TZ) + timedelta(hours=24)
                
            # Check if we should auto-finalize
            orders_in_group = db.query(Order).filter(Order.group_order_id == group_order.id).all()
            paid_members = len([o for o in orders_in_group if o.paid_at and o.user_id != group_order.leader_id])
            
            # Auto-finalize if minimum requirements are met and 24 hours have passed
            if (
                group_order.expires_at
                and datetime.now(TEHRAN_TZ) >= group_order.expires_at
                and group_order.status == GroupOrderStatus.GROUP_FORMING
            ):
                # Intentionally no-op here. Expiry outcomes are handled centrally by the
                # expiry service based on whether at least one follower paid.
                pass
    
    db.commit()
    
    return {
        "message": "Payment confirmed successfully",
        "order_id": order.id,
        "status": order.status
    }

@order_router.put("/{order_id}/delivery-slot")
async def update_order_delivery_slot(
    order_id: int,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update order delivery slot for authenticated user"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Check if user owns this order
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You don't have permission to update this order")

    delivery_slot = request.get("delivery_slot")
    if delivery_slot is None:
        raise HTTPException(status_code=400, detail="delivery_slot is required")

    try:
        import json
        # Store delivery slot as JSON to maintain consistency with existing format
        delivery_slot_json = json.dumps({
            "date": request.get("date"),
            "from": request.get("from"),
            "to": request.get("to"),
            "delivery_slot": delivery_slot
        })
        
        # Update the current order
        order.delivery_slot = delivery_slot_json
        
        # If this order is part of a group, update all orders in the same group
        if order.group_order_id:
            # Get all orders in the same group
            group_orders = db.query(Order).filter(
                Order.group_order_id == order.group_order_id,
                Order.is_settlement_payment == False
            ).all()
            
            # Update delivery_slot for all orders in the group
            for group_order in group_orders:
                group_order.delivery_slot = delivery_slot_json
        
        db.commit()
        return {"message": "Delivery slot updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
 