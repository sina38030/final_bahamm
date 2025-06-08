from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Optional, List
import re

from app.database import get_db
from app.models import Product, ProductOption, ProductImage, Review, User
from app.schemas import ProductDetailResponse, ProductOptionsResponse, ProductCreate, ProductUpdate, ReviewResponse, ReviewCreate

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
def get_product_reviews(product_id: int, db: Session = Depends(get_db)):
    # Check if product exists
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Get all reviews for the product
    reviews = db.query(Review).filter(Review.product_id == product_id).all()
    
    # Prepare response with first_name and last_name
    response_reviews = []
    for review in reviews:
        review_dict = {
            "id": review.id,
            "rating": review.rating,
            "comment": review.comment,
            "product_id": review.product_id,
            "user_id": review.user_id,
            "created_at": review.created_at,
            "first_name": review.user.first_name if review.user else None,
            "last_name": review.user.last_name if review.user else None
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
    
    # Ensure user exists if user_id is provided
    if review_data.user_id:
        user = db.query(User).filter(User.id == review_data.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
    
    # Create review
    review = Review(
        product_id=product_id,
        user_id=review_data.user_id,
        rating=review_data.rating,
        comment=review_data.comment
    )
    
    db.add(review)
    db.commit()
    db.refresh(review)
    
    # Prepare response
    review_dict = {
        "id": review.id,
        "rating": review.rating,
        "comment": review.comment,
        "product_id": review.product_id,
        "user_id": review.user_id,
        "created_at": review.created_at,
        "first_name": review.user.first_name if review.user else None,
        "last_name": review.user.last_name if review.user else None
    }
    
    return ReviewResponse(**review_dict) 