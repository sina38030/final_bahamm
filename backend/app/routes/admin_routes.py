from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.models import Product, Category, SubCategory, Order, User, Store, ProductImage, OrderItem
from app.schemas import Product as ProductSchema, Category as CategorySchema, Order as OrderSchema, User as UserSchema
from app.utils.admin import get_admin_user
from app.utils.logging import get_logger

logger = get_logger("admin_routes")

admin_router = APIRouter(prefix="/admin", tags=["admin"])

# Dashboard endpoint
@admin_router.get("/dashboard")
async def get_dashboard_stats(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics"""
    total_users = db.query(func.count(User.id)).scalar()
    total_products = db.query(func.count(Product.id)).scalar()
    total_orders = db.query(func.count(Order.id)).scalar()
    total_categories = db.query(func.count(Category.id)).scalar()
    
    # Get recent orders count (last 7 days)
    from datetime import timedelta
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_orders = db.query(func.count(Order.id)).filter(Order.created_at >= seven_days_ago).scalar()
    
    # Get total revenue
    total_revenue = db.query(func.sum(Order.total_amount)).scalar() or 0
    
    return {
        "total_users": total_users,
        "total_products": total_products,
        "total_orders": total_orders,
        "total_categories": total_categories,
        "recent_orders": recent_orders,
        "total_revenue": total_revenue
    }

# Products management
@admin_router.get("/products", response_model=List[ProductSchema])
async def get_all_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all products with pagination and search"""
    query = db.query(Product)
    
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
    
    if category_id:
        query = query.filter(Product.category_id == category_id)
    
    products = query.offset(skip).limit(limit).all()
    
    # Add computed fields
    for product in products:
        if product.store:
            product.store_name = product.store.name
        if product.category:
            product.category_name = product.category.name
        if product.subcategory:
            product.subcategory_name = product.subcategory.name
        
        # Get main image
        main_image = next((img for img in product.images if img.is_main), None)
        if main_image:
            product.main_image = main_image.image_url
        elif product.images:
            product.main_image = product.images[0].image_url
    
    return products

@admin_router.delete("/products/{product_id}")
async def delete_product(
    product_id: int,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a product"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db.delete(product)
    db.commit()
    
    return {"message": "Product deleted successfully"}

# Categories management
@admin_router.get("/categories", response_model=List[CategorySchema])
async def get_all_categories(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all categories"""
    categories = db.query(Category).all()
    return categories

@admin_router.post("/categories", response_model=CategorySchema)
async def create_category(
    category: CategorySchema,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new category"""
    db_category = Category(**category.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@admin_router.delete("/categories/{category_id}")
async def delete_category(
    category_id: int,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a category"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check if there are products in this category
    products_count = db.query(func.count(Product.id)).filter(Product.category_id == category_id).scalar()
    if products_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete category with {products_count} products")
    
    db.delete(category)
    db.commit()
    
    return {"message": "Category deleted successfully"}

# Orders management
@admin_router.get("/orders")
async def get_all_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = None,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all orders with pagination"""
    query = db.query(Order).join(User)
    
    if status:
        query = query.filter(Order.status == status)
    
    orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    
    # Format response with user info
    result = []
    for order in orders:
        order_data = {
            "id": order.id,
            "user_id": order.user_id,
            "user_name": f"{order.user.first_name or ''} {order.user.last_name or ''}".strip() or order.user.phone_number,
            "user_phone": order.user.phone_number,
            "total_amount": order.total_amount,
            "status": order.status,
            "created_at": order.created_at,
            "items_count": len(order.items)
        }
        result.append(order_data)
    
    return result

@admin_router.get("/orders/{order_id}")
async def get_order_details(
    order_id: int,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get detailed order information with items"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get order items with product details
    items = []
    for item in order.items:
        product = item.product
        item_data = {
            "id": item.id,
            "product_id": item.product_id,
            "product_name": product.name if product else "Unknown Product",
            "quantity": item.quantity,
            "base_price": item.base_price,
            "total_price": item.base_price * item.quantity
        }
        items.append(item_data)
    
    # Get user details
    user = order.user
    
    # Prepare response
    order_details = {
        "id": order.id,
        "user_id": order.user_id,
        "user_name": f"{user.first_name or ''} {user.last_name or ''}".strip() or user.phone_number,
        "user_phone": user.phone_number,
        "user_email": user.email,
        "total_amount": order.total_amount,
        "status": order.status,
        "created_at": order.created_at,
        "items": items,
        # Add more fields if they exist in your Order model
        # "shipping_address": order.shipping_address if hasattr(order, 'shipping_address') else None,
        # "payment_method": order.payment_method if hasattr(order, 'payment_method') else None,
    }
    
    return order_details

@admin_router.put("/orders/{order_id}/status")
async def update_order_status(
    order_id: int,
    request: dict,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Update order status"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.status = request.get("status")
    db.commit()
    
    return {"message": "Order status updated successfully"}

# Users management
@admin_router.get("/users")
async def get_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    user_type: Optional[str] = None,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get all users with pagination and search"""
    query = db.query(User)
    
    if search:
        query = query.filter(
            or_(
                User.first_name.ilike(f"%{search}%"),
                User.last_name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
                User.phone_number.ilike(f"%{search}%")
            )
        )
    
    if user_type:
        query = query.filter(User.user_type == user_type)
    
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    
    # Format response
    result = []
    for user in users:
        user_data = {
            "id": user.id,
            "name": f"{user.first_name or ''} {user.last_name or ''}".strip() or "N/A",
            "email": user.email,
            "phone_number": user.phone_number,
            "user_type": user.user_type.value if user.user_type else None,
            "coins": user.coins,
            "is_phone_verified": user.is_phone_verified,
            "created_at": user.created_at,
            "orders_count": len(user.orders)
        }
        result.append(user_data)
    
    return result

@admin_router.get("/users/{user_id}")
async def get_user_details(
    user_id: int,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Get detailed user information"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user statistics
    orders_count = db.query(func.count(Order.id)).filter(Order.user_id == user_id).scalar()
    total_spent = db.query(func.sum(Order.total_amount)).filter(Order.user_id == user_id).scalar() or 0
    
    return {
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "phone_number": user.phone_number,
        "user_type": user.user_type.value if user.user_type else None,
        "coins": user.coins,
        "is_phone_verified": user.is_phone_verified,
        "created_at": user.created_at,
        "statistics": {
            "orders_count": orders_count,
            "total_spent": total_spent
        }
    } 