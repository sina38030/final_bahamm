from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import logging
import time
import random

from app.database import get_db
from app.models import Favorite, Product, User
from app.schemas import FavoriteAdd, FavoriteRemove, ProductResponse
from app.utils.security import get_current_user

# Set up logging
logger = logging.getLogger(__name__)

favorite_router = APIRouter(prefix="/favorites", tags=["favorites"])

@favorite_router.post("/add", status_code=200)
def add_to_favorites(
    favorite: FavoriteAdd, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product_id = favorite.product_id
    user_id = current_user.id

    existing_favorite = db.query(Favorite).filter(
        Favorite.user_id == user_id,
        Favorite.product_id == product_id
    ).first()
    
    if existing_favorite:
        return {'message': 'Product is already in favorites'}

    new_favorite = Favorite(user_id=user_id, product_id=product_id)
    db.add(new_favorite)

    try:
        db.commit()
        return {'message': 'Product added to favorites successfully'}
    except Exception as e:
        logger.error(f"Error adding to favorites: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to add product to favorites")

@favorite_router.post("/remove", status_code=200)
def remove_from_favorites(
    favorite: FavoriteRemove, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product_id = favorite.product_id
    user_id = current_user.id

    favorite_item = db.query(Favorite).filter(
        Favorite.user_id == user_id,
        Favorite.product_id == product_id
    ).first()
    
    if not favorite_item:
        return {'message': 'Product is not in favorites'}

    db.delete(favorite_item)

    try:
        db.commit()
        return {'message': 'Product removed from favorites successfully'}
    except Exception as e:
        logger.error(f"Error removing from favorites: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to remove product from favorites")

@favorite_router.get("/user", response_model=List[ProductResponse])
def get_user_favorites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_id = current_user.id
    request_id = f"{time.time()}-{random.randint(1000, 9999)}"
    logger.info(f"[FAVORITES-{request_id}] Getting favorites for user {user_id}")
    
    try:
        favorites = db.query(Favorite).filter(Favorite.user_id == user_id).all()
        logger.info(f"[FAVORITES-{request_id}] Found {len(favorites)} favorites for user {user_id}")
        
        if not favorites:
            logger.info(f"[FAVORITES-{request_id}] No favorites found for user {user_id}, returning empty array")
            return []
            
        response_products = []
        
        for favorite in favorites:
            try:
                product = favorite.product
                if not product:
                    logger.warning(f"[FAVORITES-{request_id}] Favorite {favorite.id} has no associated product")
                    continue
                    
                # Create product dict with all required fields for ProductResponse
                product_dict = {
                    "id": product.id,
                    "name": product.name,
                    "base_price": product.base_price,
                    "discount_price": product.market_price if product.market_price < product.base_price else None,
                    "shipping_cost": product.shipping_cost,
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
                    product_dict["image"] = main_image.image_url if main_image else (product.images[0].image_url if product.images else "")
                else:
                    product_dict["image"] = ""
                    
                # Calculate discount percentage if discount_price exists
                if product_dict["discount_price"] and product.base_price > 0:
                    product_dict["discount"] = round((product.base_price - product_dict["discount_price"]) / product.base_price * 100)
                else:
                    product_dict["discount"] = None
                
                # Create ProductResponse from dict and add to response list
                response_products.append(ProductResponse(**product_dict))
                logger.info(f"[FAVORITES-{request_id}] Added product {product.id} to response")
                
            except Exception as e:
                logger.error(f"[FAVORITES-{request_id}] Error processing favorite product {favorite.id}: {str(e)}")
                continue
                
        logger.info(f"[FAVORITES-{request_id}] Returning {len(response_products)} products for user {user_id}")
        return response_products
        
    except Exception as e:
        logger.error(f"[FAVORITES-{request_id}] Error getting user favorites: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get user favorites: {str(e)}")

@favorite_router.get("/check-auth", status_code=200)
def check_auth(current_user: User = Depends(get_current_user)):
    """
    Simple endpoint to check if the user is authenticated.
    Will return 401 if authentication fails, 200 if successful.
    """
    return {
        "authenticated": True,
        "user_id": current_user.id,
        "user_type": current_user.user_type
    } 