from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from typing import List
from sqlalchemy import or_

from app.database import get_db
from app.models import Product
from app.schemas import ProductResponse

search_router = APIRouter(prefix="/search", tags=["search"])

@search_router.get("", response_model=List[ProductResponse])
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
            "in_stock": any(option.stock > 0 for option in product.options) if product.options else True
        }
        
        # Set main image
        if product.images:
            main_image = next((img for img in product.images if img.is_main), None)
            product_dict["image"] = main_image.image_url if main_image else (product.images[0].image_url if product.images else None)
        else:
            product_dict["image"] = None
            
        # Calculate discount percentage if discount_price exists
        if product_dict["discount_price"] and product.base_price > 0:
            product_dict["discount"] = round((product.base_price - product_dict["discount_price"]) / product.base_price * 100)
        else:
            product_dict["discount"] = None
            
        response_products.append(ProductResponse(**product_dict))
    
    return response_products 