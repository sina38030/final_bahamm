from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func
from typing import List, Optional

from app.database import get_db
from app.models import Product, Category, SubCategory, Store, OrderItem, Review
from app.schemas import ProductResponse

products_router = APIRouter(prefix="/products", tags=["products"])

# Get all products with optional filters - SIMPLIFIED VERSION
@products_router.get("")
def get_products(
    category_id: Optional[int] = None,
    min_price: Optional[float] = None, 
    max_price: Optional[float] = None,
    free_shipping: Optional[bool] = None,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    page = max(1, min(page, 100))
    limit = max(1, min(limit, 50))
    skip = (page - 1) * limit
    query = db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.images)
    )
    
    # Apply filters
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if min_price is not None:
        query = query.filter(Product.base_price >= min_price)
    if max_price is not None:
        query = query.filter(Product.base_price <= max_price)
    if free_shipping:
        query = query.filter(Product.shipping_cost == 0)
    
    products = query.offset(skip).limit(limit).all()
    
    # Response with all pricing fields to match admin
    return [
        {
            "id": product.id,
            "name": product.name,
            "base_price": product.base_price,
            "market_price": product.market_price,
            "product_cost": product.base_price,
            "solo_price": product.market_price,
            "friend_1_price": product.friend_1_price,
            "friend_2_price": product.friend_2_price,
            "friend_3_price": product.friend_3_price,
            "description": product.description,
            "category": product.category.name if product.category else "Unknown",
            "shipping_cost": product.shipping_cost,
            "free_shipping": product.shipping_cost == 0,
            "in_stock": True,
            "image": product.images[0].image_url if product.images else None
        }
        for product in products
    ]

# Get featured products for home page
@products_router.get("/featured")
def get_featured_products(db: Session = Depends(get_db)):
    # Get the 10 most recent products
    products = (
        db.query(Product)
        .options(joinedload(Product.category), joinedload(Product.images))
        .order_by(desc(Product.id))
        .limit(10)
        .all()
    )
    
    # Simple response matching the main products endpoint
    return [
        {
            "id": product.id,
            "name": product.name,
            "base_price": product.base_price,
            "market_price": product.market_price,
            "product_cost": product.base_price,
            "solo_price": product.market_price,
            "friend_1_price": product.friend_1_price,
            "friend_2_price": product.friend_2_price,
            "friend_3_price": product.friend_3_price,
            "description": product.description,
            "category": product.category.name if product.category else "Unknown",
            "shipping_cost": product.shipping_cost,
            "free_shipping": product.shipping_cost == 0,
            "in_stock": True,
            "image": product.images[0].image_url if product.images else None
        }
        for product in products
    ]

# Get products by category slug
@products_router.get("/category/{category_slug}", response_model=List[ProductResponse])
def get_products_by_category(category_slug: str, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.slug == category_slug).first()
    if not category:
        raise HTTPException(status_code=404, detail=f"Category with slug '{category_slug}' not found")
    
    products = (
        db.query(Product)
        .options(joinedload(Product.subcategory), joinedload(Product.images))
        .filter(Product.category_id == category.id)
        .all()
    )
    
    # Convert products to response model objects with computed fields
    response_products = []
    for product in products:
        product_dict = {
            "id": product.id,
            "name": product.name,
            "base_price": product.base_price,
            "discount_price": product.market_price if product.market_price < product.base_price else None,
            "free_shipping": product.shipping_cost == 0,
            "description": product.description,
            "category": category.name,
            "category_slug": category.slug,
            "subcategory": product.subcategory.name if product.subcategory else None,
            "subcategory_slug": product.subcategory.slug if product.subcategory else None,
            "in_stock": True  # Simplified for now since ProductOption model may not have stock field
        }
        
        # Set main image
        if product.images:
            product_dict["image"] = product.images[0].image_url
        else:
            product_dict["image"] = None
            
        # Calculate discount percentage if discount_price exists
        if product_dict["discount_price"] and product.base_price > 0:
            product_dict["discount"] = round((product.base_price - product_dict["discount_price"]) / product.base_price * 100)
        else:
            product_dict["discount"] = None
            
        response_products.append(ProductResponse(**product_dict))
    
    return response_products

# Get products by subcategory slug
@products_router.get("/subcategory/{subcategory_slug}", response_model=List[ProductResponse])
def get_products_by_subcategory(subcategory_slug: str, db: Session = Depends(get_db)):
    subcategory = db.query(SubCategory).filter(SubCategory.slug == subcategory_slug).first()
    if not subcategory:
        raise HTTPException(status_code=404, detail=f"Subcategory with slug '{subcategory_slug}' not found")
    
    products = (
        db.query(Product)
        .options(joinedload(Product.category), joinedload(Product.images))
        .filter(Product.subcategory_id == subcategory.id)
        .all()
    )
    
    # Convert products to response model objects with computed fields
    response_products = []
    for product in products:
        product_dict = {
            "id": product.id,
            "name": product.name,
            "base_price": product.base_price,
            "discount_price": product.market_price if product.market_price < product.base_price else None,
            "free_shipping": product.shipping_cost == 0,
            "description": product.description,
            "category": product.category.name if product.category else "Unknown",
            "category_slug": product.category.slug if product.category else None,
            "subcategory": subcategory.name,
            "subcategory_slug": subcategory.slug,
            "in_stock": True  # Simplified for now since ProductOption model may not have stock field
        }
        
        # Set main image
        if product.images:
            product_dict["image"] = product.images[0].image_url
        else:
            product_dict["image"] = None
            
        # Calculate discount percentage if discount_price exists
        if product_dict["discount_price"] and product.base_price > 0:
            product_dict["discount"] = round((product.base_price - product_dict["discount_price"]) / product.base_price * 100)
        else:
            product_dict["discount"] = None
            
        response_products.append(ProductResponse(**product_dict))
    
    return response_products

# Search products
@products_router.get("/search")
def search_products(
    query: str = Query(..., min_length=1),
    db: Session = Depends(get_db)
):
    search_term = f"%{query}%"
    products = db.query(Product).options(
        joinedload(Product.category),
        joinedload(Product.subcategory),
        joinedload(Product.images)
    ).filter(
        Product.name.ilike(search_term) | 
        Product.description.ilike(search_term)
    ).all()
    
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
            "in_stock": True,
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

# Get products by store ID
@products_router.get("/store/{store_id}", response_model=List[ProductResponse])
def get_products_by_store(store_id: int, db: Session = Depends(get_db)):
    # First check if store exists
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail=f"Store with ID {store_id} not found")
    
    products = (
        db.query(Product)
        .options(joinedload(Product.category), joinedload(Product.subcategory), joinedload(Product.images))
        .filter(Product.store_id == store_id)
        .all()
    )
    
    # Convert products to response model objects with computed fields
    response_products = []
    for product in products:
        product_dict = {
            "id": product.id,
            "name": product.name,
            "base_price": product.base_price,
            "discount_price": product.market_price if product.market_price < product.base_price else None,
            "free_shipping": product.shipping_cost == 0,
            "description": product.description,
            "category": product.category.name if product.category else "Unknown",
            "category_slug": product.category.slug if product.category else None,
            "subcategory": product.subcategory.name if product.subcategory else None,
            "subcategory_slug": product.subcategory.slug if product.subcategory else None,
            "in_stock": True,  # Simplified for now since ProductOption model may not have stock field
            "store_name": store.name
        }
        
        # Set main image
        if product.images:
            product_dict["image"] = product.images[0].image_url
        else:
            product_dict["image"] = None
            
        # Calculate discount percentage if discount_price exists
        if product_dict["discount_price"] and product.base_price > 0:
            product_dict["discount"] = round((product.base_price - product_dict["discount_price"]) / product.base_price * 100)
        else:
            product_dict["discount"] = None
            
        response_products.append(ProductResponse(**product_dict))
    
    return response_products 