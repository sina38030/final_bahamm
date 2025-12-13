from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Optional, List
import re

from app.database import get_db
from app.models import Product, ProductOption, ProductImage, Review, User
from app.schemas import ProductDetailResponse, ProductOptionsResponse, ProductCreate, ProductUpdate, ReviewResponse, ReviewCreate, ReviewBase

product_router = APIRouter(prefix="/product", tags=["product"])

def slugify(text):
    """Convert a string to a slug format suitable for URLs"""
    text = text.lower()
    # Replace spaces with hyphens
    text = re.sub(r'\s+', '-', text)
    # Remove all non-word chars
    text = re.sub(r'[^\w\-]', '', text)
    # Replace multiple hyphens with single hyphen
    text = re.sub(r'\-+', '-', text)
    # Remove leading/trailing hyphens
    text = text.strip('-')
    
    return text

# Get product details by ID
@product_router.get("/{product_id}", response_model=ProductDetailResponse)
def product_detail(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Create response object with computed fields
    product_dict = {
        "id": product.id,
        "name": product.name,
        "description": product.description,
        "base_price": product.base_price,
        "discount_price": product.market_price if product.market_price < product.base_price else None,
        "shipping_cost": product.shipping_cost,
        "category": product.category.name if product.category else "Unknown",
        "category_slug": product.category.slug if product.category else None,
        "subcategory": product.subcategory.name if product.subcategory else None,
        "subcategory_slug": product.subcategory.slug if product.subcategory else None,
        "in_stock": any(option.stock > 0 for option in product.options) if product.options else True,
        "store": product.store,
        "store_id": product.store_id,
        "store_name": product.store.name if product.store else None
    }
    
    # Set main image and all images
    if product.images:
        main_image = next((img for img in product.images if img.is_main), None)
        product_dict["image"] = main_image.image_url if main_image else (product.images[0].image_url if product.images else None)
        product_dict["images"] = [img.image_url for img in product.images]
    else:
        product_dict["image"] = None
        product_dict["images"] = []
    
    # Calculate discount percentage if discount_price exists
    if product_dict["discount_price"] and product.base_price > 0:
        product_dict["discount"] = round((product.base_price - product_dict["discount_price"]) / product.base_price * 100)
    else:
        product_dict["discount"] = None
    
    # Add group buy options
    product_dict["group_buy_options"] = {
        "twoPersonPrice": product.market_price,
        "fourPersonPrice": round(product.market_price * 0.9, 2)  # 10% additional discount for 4 people
    }
    
    return ProductDetailResponse(**product_dict)

# Get product options
@product_router.get("/{product_id}/options", response_model=ProductOptionsResponse)
def product_options(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"options": product.options}

# Create a new product
@product_router.post("", response_model=ProductDetailResponse)
def create_product(product_data: ProductCreate, db: Session = Depends(get_db)):
    # Create product
    product = Product(
        name=product_data.name,
        description=product_data.description,
        base_price=product_data.base_price,
        market_price=product_data.market_price,
        option1_name=product_data.option1_name,
        option2_name=product_data.option2_name,
        shipping_cost=product_data.shipping_cost,
        store_id=product_data.store_id,
        category_id=product_data.category_id,
        subcategory_id=product_data.subcategory_id
    )
    
    db.add(product)
    db.flush()  # Get the product ID
    
    # Add options if provided
    if product_data.options:
        for option_data in product_data.options:
            option = ProductOption(
                product_id=product.id,
                option1_value=option_data.option1_value,
                option2_value=option_data.option2_value,
                stock=option_data.stock,
                price_adjustment=option_data.price_adjustment
            )
            db.add(option)
    
    # Add images if provided
    if product_data.images:
        for img_data in product_data.images:
            image = ProductImage(
                product_id=product.id,
                image_url=img_data.image_url,
                is_main=img_data.is_main
            )
            db.add(image)
    
    db.commit()
    db.refresh(product)
    
    return product_detail(product.id, db)

# Update an existing product
@product_router.put("/{product_id}", response_model=ProductDetailResponse)
def update_product(product_id: int, product_data: ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Update product fields
    for field, value in product_data.dict(exclude_unset=True, exclude_none=True).items():
        setattr(product, field, value)
    
    db.commit()
    db.refresh(product)
    
    return product_detail(product.id, db)

# Delete a product
@product_router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db.delete(product)
    db.commit()
    
    return {"message": f"Product {product_id} deleted successfully"}

# Get reviews for a product
@product_router.get("/{product_id}/reviews", response_model=List[ReviewResponse])
def get_product_reviews(
    product_id: int, 
    user_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    # Check if product exists
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Build query for reviews
    query = db.query(Review).filter(Review.product_id == product_id)
    
    # If user_id is provided, include that user's reviews (even if not approved)
    # Otherwise, only show approved reviews
    if user_id:
        query = query.filter(
            (Review.approved == True) | (Review.user_id == user_id)
        )
    else:
        query = query.filter(Review.approved == True)
    
    reviews = query.order_by(Review.created_at.desc(), Review.id.desc()).all()

    # Prepare response with first_name and last_name
    response_reviews = []
    for review in reviews:
        user = db.query(User).filter(User.id == review.user_id).first()
        review_dict = {
            "id": review.id,
            "rating": review.rating,
            "comment": review.comment,
            "display_name": review.display_name,
            "product_id": review.product_id,
            "user_id": review.user_id,
            "created_at": review.created_at,
            "approved": review.approved,
            "first_name": user.first_name if user else None,
            "last_name": user.last_name if user else None
        }
        response_reviews.append(ReviewResponse(**review_dict))

    return response_reviews

# Create a review for a product
@product_router.post("/{product_id}/reviews", response_model=ReviewResponse)
def create_product_review(
    product_id: int, 
    review_data: ReviewCreate,
    db: Session = Depends(get_db)
):
    # Check if product exists
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Ensure user exists if user_id is provided (skip validation for user_id 1 which is used for fake reviews)
    user = None
    if review_data.user_id and review_data.user_id != 1:
        user = db.query(User).filter(User.id == review_data.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
    
    # Create review
    # Derive a display name if not provided
    computed_display_name = None
    try:
        if review_data.display_name and str(review_data.display_name).strip():
            computed_display_name = str(review_data.display_name).strip()
        elif user and (user.first_name or user.last_name):
            parts = [p for p in [user.first_name, user.last_name] if p]
            computed_display_name = " ".join(parts)
    except Exception:
        computed_display_name = None

    # Use provided approved value if set (for admin-created reviews), otherwise default to False
    is_approved = review_data.approved if review_data.approved is not None else False
    
    review = Review(
        product_id=product_id,
        user_id=review_data.user_id,
        rating=review_data.rating,
        comment=review_data.comment,
        display_name=computed_display_name,
        approved=is_approved  # Admin reviews can be auto-approved, user reviews need approval
    )

    # Allow overriding created_at if provided (admin/manual entry)
    if review_data.created_at:
        try:
            review.created_at = review_data.created_at
        except Exception:
            pass

    db.add(review)
    db.commit()
    db.refresh(review)

    # Get user info for response
    user = db.query(User).filter(User.id == review.user_id).first()

    # Prepare response
    review_dict = {
        "id": review.id,
        "rating": review.rating,
        "comment": review.comment,
        "display_name": review.display_name,
        "product_id": review.product_id,
        "user_id": review.user_id,
        "created_at": review.created_at,
        "approved": review.approved,
        "first_name": user.first_name if user else None,
        "last_name": user.last_name if user else None
    }

    return ReviewResponse(**review_dict)

# Delete a review
@product_router.delete("/{product_id}/reviews/{review_id}")
def delete_product_review(
    product_id: int,
    review_id: int,
    db: Session = Depends(get_db)
):
    # Check if product exists
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Check if review exists and belongs to the product
    review = db.query(Review).filter(
        Review.id == review_id,
        Review.product_id == product_id
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    # Delete the review
    db.delete(review)
    db.commit()

    return {"message": "Review deleted successfully"}

# Update a review
@product_router.put("/{product_id}/reviews/{review_id}", response_model=ReviewResponse)
def update_product_review(
    product_id: int,
    review_id: int,
    review_update: ReviewBase,
    db: Session = Depends(get_db)
):
    # Check if product exists
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Check if review exists and belongs to the product
    review = db.query(Review).filter(
        Review.id == review_id,
        Review.product_id == product_id
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    # Check if comment is being changed
    comment_changed = review.comment != review_update.comment
    
    # Update the review
    review.rating = review_update.rating
    review.comment = review_update.comment
    review.display_name = review_update.display_name
    
    # If comment is changed by user, reset approval status (needs re-approval by admin)
    # Rating changes don't require re-approval (rating is always visible)
    # Keep it approved only if it's an admin updating (when created_at is being overridden)
    if review_update.created_at:
        # Admin override - keep approval status
        try:
            review.created_at = review_update.created_at
        except Exception:
            pass
    else:
        # User edit - if comment changed, reset approval for re-review by admin
        if comment_changed:
            review.approved = False

    db.commit()
    db.refresh(review)

    # Get user info for response
    user = db.query(User).filter(User.id == review.user_id).first()

    # Prepare response
    review_dict = {
        "id": review.id,
        "rating": review.rating,
        "comment": review.comment,
        "display_name": review.display_name,
        "product_id": review.product_id,
        "user_id": review.user_id,
        "created_at": review.created_at,
        "approved": review.approved,
        "first_name": user.first_name if user else None,
        "last_name": user.last_name if user else None
    }

    return ReviewResponse(**review_dict) 