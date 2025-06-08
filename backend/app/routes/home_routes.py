from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Product
from app.schemas import RecommendationResponse, ProductResponse

home_router = APIRouter(tags=["home"])

@home_router.get("/home", response_model=List[ProductResponse])
def home(db: Session = Depends(get_db)):
    products = db.query(Product).all()
    
    # Set computed fields for each product
    for product in products:
        product.store_name = product.store.name if product.store else None
        product.category_name = product.category.name if product.category else None
        main_image = next((image for image in product.images if image.is_main), None)
        product.main_image = main_image.image_url if main_image else None
        if not product.main_image and product.images:
            product.main_image = product.images[0].image_url
    
    return products

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