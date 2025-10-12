from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database import get_db
from app.models import Product, Banner
from sqlalchemy import text
from app.schemas import RecommendationResponse, ProductResponse

home_router = APIRouter(tags=["home"])

_HOME_CACHE: dict[str, tuple[float, list]] = {}
_BANNERS_CACHE: dict[str, tuple[float, list]] = {}

@home_router.get("/home", response_model=List[ProductResponse])
def home(db: Session = Depends(get_db)):
    # 60s lightweight cache to avoid repeated heavy joins
    import time
    now = time.time()
    cached = _HOME_CACHE.get("home")
    if cached and now - cached[0] < 60:
        return cached[1]

    try:
        # Prefer curated order by home_position, then newest
        products = (
            db.query(Product)
            .options(joinedload(Product.store), joinedload(Product.category), joinedload(Product.images))
            .order_by(Product.home_position.asc().nulls_last(), Product.id.desc())
            .limit(30)
            .all()
        )
    except Exception:
        products = (
            db.query(Product)
            .options(joinedload(Product.store), joinedload(Product.category), joinedload(Product.images))
            .order_by(Product.home_position.asc(), Product.id.desc())
            .limit(30)
            .all()
        )
    
    # Set computed fields for each product
    for product in products:
        product.store_name = product.store.name if product.store else None
        product.category_name = product.category.name if product.category else None
        main_image = next((image for image in product.images if image.is_main), None)
        product.main_image = main_image.image_url if main_image else None
        if not product.main_image and product.images:
            product.main_image = product.images[0].image_url
    
    _HOME_CACHE["home"] = (now, products)
    return products

@home_router.get("/banners")
def get_banners(db: Session = Depends(get_db)):
    # 5 minutes cache; banners change rarely
    import time
    now = time.time()
    cached = _BANNERS_CACHE.get("banners")
    if cached and now - cached[0] < 300:
        return cached[1]

    banners = (
        db.query(Banner)
        .filter(Banner.is_active == True)
        .order_by(Banner.sort_order.asc(), Banner.id.asc())
        .limit(20)
        .all()
    )
    result = [
        {
            "id": b.id,
            "image_url": b.image_url,
            "title": b.title,
            "description": b.description,
            "sort_order": b.sort_order,
        }
        for b in banners
    ]
    _BANNERS_CACHE["banners"] = (now, result)
    return result

@home_router.get("/settings")
def get_public_settings(db: Session = Depends(get_db)):
    # Read optional "all" category image from a tiny settings table; tolerate absence
    try:
        rows = db.execute(text("SELECT key, value FROM app_settings WHERE key IN ('all_category_image', 'all_category_label')"))
        data = {row[0]: row[1] for row in rows}
        all_image = data.get('all_category_image')
        all_label = data.get('all_category_label', 'همه')
    except Exception:
        all_image = None
        all_label = 'همه'
    return {"all_category_image": all_image, "all_category_label": all_label}

@home_router.get("/recommendations", response_model=List[RecommendationResponse])
def get_recommendations(db: Session = Depends(get_db)):
    # TODO: Implement actual recommendation logic
    products = db.query(Product).limit(5).all()
    
    # Set computed fields for each product
    for product in products:
        main_image = next((image for image in product.images if image.is_main), None)
        product.main_image = main_image.image_url if main_image else None
        if not product.main_image and product.images:
            product.main_image = product.images[0].image_url
    
    return products 