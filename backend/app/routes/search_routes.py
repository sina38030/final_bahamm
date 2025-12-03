from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func
from typing import List

from app.database import get_db
from app.models import Product, OrderItem, Review

search_router = APIRouter(prefix="/search", tags=["search"])

@search_router.get("")
def search_products(q: str = Query("", min_length=1), page: int = 1, limit: int = 20, db: Session = Depends(get_db)):
    if not q:
        return []
    page = max(1, min(page, 100))
    limit = max(1, min(limit, 50))
    offset = (page - 1) * limit

    products = (
        db.query(Product)
        .options(joinedload(Product.category), joinedload(Product.subcategory), joinedload(Product.images))
        .filter(
            or_(
                Product.name.ilike(f'%{q}%'),
                Product.description.ilike(f'%{q}%')
            )
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    # Bulk fetch sales and ratings data to avoid N+1 queries
    product_ids = [p.id for p in products]
    
    sales_data = {}
    if product_ids:
        sales_result = db.query(
            OrderItem.product_id,
            func.coalesce(func.sum(OrderItem.quantity), 0).label('total_sales')
        ).filter(OrderItem.product_id.in_(product_ids)).group_by(OrderItem.product_id).all()
        sales_data = {row.product_id: row.total_sales for row in sales_result}
    
    ratings_data = {}
    ratings_count = {}
    if product_ids:
        ratings_result = db.query(
            Review.product_id,
            func.coalesce(func.sum(Review.rating), 0).label('total_rating'),
            func.count(Review.id).label('review_count')
        ).filter(Review.product_id.in_(product_ids)).group_by(Review.product_id).all()
        ratings_data = {row.product_id: row.total_rating for row in ratings_result}
        ratings_count = {row.product_id: row.review_count for row in ratings_result}

    # Return dict format matching admin endpoint for consistency
    response_products = []
    for product in products:
        # Set main image
        images = []
        if product.images:
            images = [
                img.image_url
                for img in sorted(product.images, key=lambda x: (0 if getattr(x, 'is_main', False) else 1, getattr(x, 'id', 0)))
            ]
        
        # Calculate display fields
        display_sales = ((getattr(product, 'sales_seed_offset', None) or 0) + (
            sales_data.get(product.id, 0) - (getattr(product, 'sales_seed_baseline', None) or 0)
        ))
        
        rating_sum = (getattr(product, 'rating_seed_sum', None) or 0) + (
            ratings_data.get(product.id, 0) - (getattr(product, 'rating_baseline_sum', None) or 0)
        )
        rating_count = 1 + (
            ratings_count.get(product.id, 0) - (getattr(product, 'rating_baseline_count', None) or 0)
        )
        display_rating = round(rating_sum / rating_count, 2) if rating_count > 0 else 0
        
        product_dict = {
            "id": product.id,
            "name": product.name,
            "description": product.description,
            "base_price": product.base_price,
            "market_price": product.market_price,
            "solo_price": product.market_price,
            "friend_1_price": getattr(product, 'friend_1_price', None),
            "friend_2_price": getattr(product, 'friend_2_price', None),
            "friend_3_price": getattr(product, 'friend_3_price', None),
            "discount_price": product.market_price if product.market_price < product.base_price else None,
            "free_shipping": product.shipping_cost == 0,
            "category": product.category.name if product.category else "Unknown",
            "category_slug": product.category.slug if product.category else None,
            "subcategory": product.subcategory.name if product.subcategory else None,
            "subcategory_slug": product.subcategory.slug if product.subcategory else None,
            "in_stock": any(option.stock > 0 for option in product.options) if product.options else True,
            "weight_grams": getattr(product, 'weight_grams', None),
            "weight_tolerance_grams": getattr(product, 'weight_tolerance_grams', None),
            "display_sales": display_sales,
            "display_rating": display_rating,
            "images": images,
            "image": images[0] if images else None
        }
        
        # Calculate discount percentage if discount_price exists
        if product_dict["discount_price"] and product.base_price > 0:
            product_dict["discount"] = round((product.base_price - product_dict["discount_price"]) / product.base_price * 100)
        else:
            product_dict["discount"] = None
            
        response_products.append(product_dict)
    
    return response_products 