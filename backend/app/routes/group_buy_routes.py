from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app import models, schemas, services
from app.database import get_db
from app.utils.security import get_current_user

group_buy_router = APIRouter(prefix="/group-buy", tags=["group-buy"])

@group_buy_router.post("/join", status_code=200)
def join_group_buy(request: schemas.JoinGroupBuyRequest, db: Session = Depends(get_db)):
    invite_code = request.invite_code
    user_id = request.user_id if request.user_id else 1  # Assume user_id 1 for now if not provided

    group_buy = db.query(models.GroupBuy).filter(models.GroupBuy.invite_code == invite_code).first()
    
    if not group_buy:
        raise HTTPException(status_code=400, detail="کد دعوت نامعتبر است")

    if group_buy.status != 'در انتظار':
        raise HTTPException(status_code=400, detail="این خرید گروهی دیگر فعال نیست")

    if datetime.utcnow() > group_buy.expires_at:
        raise HTTPException(status_code=400, detail="مهلت این خرید گروهی به پایان رسیده است")

    existing_participant = db.query(models.GroupBuyParticipant).filter(
        models.GroupBuyParticipant.group_buy_id == group_buy.id,
        models.GroupBuyParticipant.user_id == user_id
    ).first()
    
    if existing_participant:
        raise HTTPException(status_code=400, detail="شما قبلا به این خرید گروهی پیوسته‌اید")

    new_participant = models.GroupBuyParticipant(group_buy_id=group_buy.id, user_id=user_id)
    db.add(new_participant)

    try:
        db.commit()
        return {'message': 'با موفقیت به خرید گروهی پیوستید'}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="خطا در پیوستن به خرید گروهی. لطفا دوباره تلاش کنید.")

@group_buy_router.get("/invite/{invite_code}", response_model=schemas.GroupBuyReferralDetailResponse)
def get_group_buy_by_invite_code(invite_code: str, db: Session = Depends(get_db)):
    """
    Get group buy details by invite code.
    This is used for the referral landing page.
    """
    group_buy = db.query(models.GroupBuy).filter(models.GroupBuy.invite_code == invite_code).first()
    if not group_buy:
        raise HTTPException(status_code=404, detail="Group buy not found with this invite code.")

    product_db = group_buy.product
    if not product_db:
        raise HTTPException(status_code=404, detail="Product associated with this group buy not found.")

    # Prepare product details using ProductDetailResponse logic if possible
    # This might involve calling a service function or manually constructing it
    # For simplicity, directly accessing attributes and letting Pydantic handle it.
    
    # Ensure images are loaded if ProductDetailResponse expects them
    # This is a simplified representation; you might have a service for this.
    images_urls = [img.image_url for img in product_db.images]
    main_image_url = None
    for img in product_db.images:
        if img.is_main:
            main_image_url = img.image_url
            break
    if not main_image_url and images_urls:
        main_image_url = images_urls[0]

    # Constructing the product part of the response
    # This mirrors some logic from ProductDetailResponse validators
    product_data = {
        "id": product_db.id,
        "name": product_db.name,
        "description": product_db.description,
        "base_price": product_db.base_price,
        "discount_price": product_db.market_price, # Assuming market_price is the discount_price for group buy
        "shipping_cost": product_db.shipping_cost,
        "category": product_db.category.name if product_db.category else "Unknown",
        "category_slug": product_db.category.slug if product_db.category else None,
        "subcategory": product_db.subcategory.name if product_db.subcategory else None,
        "subcategory_slug": product_db.subcategory.slug if product_db.subcategory else None,
        "image": main_image_url,
        "images": images_urls,
        "store_id": product_db.store.id if product_db.store else None,
        "store_name": product_db.store.name if product_db.store else None,
        # market_price is used for discount_price, so calculate discount based on that
        "discount": round((product_db.base_price - product_db.market_price) / product_db.base_price * 100) if product_db.base_price > 0 and product_db.market_price < product_db.base_price else 0,
        # You might want to calculate in_stock based on product_db.options stock
        "in_stock": any(opt.stock > 0 for opt in product_db.options) if product_db.options else True, 
         "group_buy_options": { # Example, adjust as per your logic
                "twoPersonPrice": product_db.market_price,
                "fourPersonPrice": round(product_db.market_price * 0.9, 2) 
            }
    }

    # Get creator's first name
    creator_first_name = group_buy.creator.first_name if group_buy.creator else None
    
    return schemas.GroupBuyReferralDetailResponse(
        invite_code=group_buy.invite_code,
        status=group_buy.status,
        expires_at=group_buy.expires_at,
        creator_first_name=creator_first_name,
        product=schemas.ProductDetailResponse(**product_data) # type: ignore
    )

# You might already have a route to create a group buy, which generates the invite_code.
# Ensure that the invite_code is generated there.
# Example structure for creating a group buy (if you don't have one):
# import secrets
# @router.post("/", response_model=schemas.GroupBuyDB) # Or your preferred response
# def create_group_buy(
#     group_buy_data: schemas.GroupBuyCreate, 
#     db: Session = Depends(get_db), 
#     current_user: models.User = Depends(get_current_user)
# ):
#     # Check if product exists
#     product = db.query(models.Product).filter(models.Product.id == group_buy_data.product_id).first()
#     if not product:
#         raise HTTPException(status_code=404, detail="Product not found")

#     # Generate a unique invite code
#     while True:
#         invite_code = secrets.token_urlsafe(8) # Generates a random 8-character string
#         existing_group_buy = db.query(models.GroupBuy).filter(models.GroupBuy.invite_code == invite_code).first()
#         if not existing_group_buy:
#             break
            
#     db_group_buy = models.GroupBuy(
#         **group_buy_data.model_dump(),
#         creator_id=current_user.id,
#         invite_code=invite_code 
#     )
#     db.add(db_group_buy)
#     db.commit()
#     db.refresh(db_group_buy)
#     return db_group_buy 