from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import re

from app.database import get_db
from app.models import Category, SubCategory, Product
from app.schemas import Category as CategorySchema, SubCategory as SubCategorySchema, SubCategoryCreate, SubCategoryUpdate, CategoryCreate, CategoryUpdate

category_router = APIRouter(prefix="/categories", tags=["categories"])

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

# GET all categories
@category_router.get("", response_model=List[CategorySchema])
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).all()
    return categories

# CREATE a new category
@category_router.post("", response_model=CategorySchema)
def create_category(category: CategoryCreate, db: Session = Depends(get_db)):
    # Generate slug from name if not provided
    if not hasattr(category, 'slug') or not category.slug:
        slug = slugify(category.name)
    else:
        slug = category.slug
    
    # Check if slug already exists
    existing_category = db.query(Category).filter(Category.slug == slug).first()
    if existing_category:
        raise HTTPException(status_code=400, detail=f"Slug '{slug}' already exists")
    
    # Create new category with slug
    new_category = Category(
        name=category.name,
        slug=slug,
        image_url=getattr(category, 'image_url', None)
    )
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    return new_category

# GET a specific category by slug
@category_router.get("/{slug}", response_model=CategorySchema)
def get_category(slug: str, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.slug == slug).first()
    if not category:
        raise HTTPException(status_code=404, detail=f"Category with slug '{slug}' not found")
    return category

# UPDATE a category
@category_router.put("/{slug}", response_model=CategorySchema)
def update_category(slug: str, category: CategoryUpdate, db: Session = Depends(get_db)):
    db_category = db.query(Category).filter(Category.slug == slug).first()
    if not db_category:
        raise HTTPException(status_code=404, detail=f"Category with slug '{slug}' not found")
    
    # Update slug if name is changing
    if hasattr(category, 'name') and category.name and category.name != db_category.name:
        if not hasattr(category, 'slug') or not category.slug:
            category.slug = slugify(category.name)
        
        # Check if new slug already exists (and it's not this category's current slug)
        if category.slug != db_category.slug:
            existing_category = db.query(Category).filter(Category.slug == category.slug).first()
            if existing_category:
                raise HTTPException(status_code=400, detail=f"Slug '{category.slug}' already exists")
    
    # Update category fields
    for field, value in category.dict(exclude_unset=True, exclude_none=True).items():
        setattr(db_category, field, value)
    
    db.commit()
    db.refresh(db_category)
    return db_category

# DELETE a category
@category_router.delete("/{slug}")
def delete_category(slug: str, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.slug == slug).first()
    if not category:
        raise HTTPException(status_code=404, detail=f"Category with slug '{slug}' not found")
    
    # Prevent deleting default bucket
    if getattr(category, 'slug', None) == 'uncategorized':
        raise HTTPException(status_code=400, detail="Cannot delete the default 'Uncategorized' category")

    # Reassign products to 'Uncategorized' and clear subcategory
    products_in_cat = db.query(Product).filter(Product.category_id == category.id)
    products_count = products_in_cat.count()
    if products_count > 0:
        default_cat = db.query(Category).filter(Category.slug == 'uncategorized').first()
        if not default_cat:
            default_cat = Category(name='Uncategorized', slug='uncategorized')
            db.add(default_cat)
            db.commit()
            db.refresh(default_cat)
        products_in_cat.update({Product.category_id: default_cat.id, Product.subcategory_id: None})

    db.delete(category)
    db.commit()
    
    return {"message": f"Category with slug '{slug}' deleted successfully"}

# GET subcategories for a category
@category_router.get("/{slug}/subcategories", response_model=List[SubCategorySchema])
def get_subcategories(slug: str, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.slug == slug).first()
    if not category:
        raise HTTPException(status_code=404, detail=f"Category with slug '{slug}' not found")
    
    subcategories = db.query(SubCategory).filter(SubCategory.category_id == category.id).all()
    return subcategories

# CREATE a new subcategory
@category_router.post("/{slug}/subcategories", response_model=SubCategorySchema)
def create_subcategory(
    slug: str, 
    subcategory: SubCategoryCreate, 
    db: Session = Depends(get_db)
):
    category = db.query(Category).filter(Category.slug == slug).first()
    if not category:
        raise HTTPException(status_code=404, detail=f"Category with slug '{slug}' not found")
    
    # Generate slug from name if not provided
    if not hasattr(subcategory, 'slug') or not subcategory.slug:
        subcat_slug = slugify(subcategory.name)
    else:
        subcat_slug = subcategory.slug
    
    # Check if slug already exists
    existing_subcategory = db.query(SubCategory).filter(SubCategory.slug == subcat_slug).first()
    if existing_subcategory:
        raise HTTPException(status_code=400, detail=f"Subcategory slug '{subcat_slug}' already exists")
    
    # Create new subcategory
    new_subcategory = SubCategory(
        name=subcategory.name,
        slug=subcat_slug,
        image_url=getattr(subcategory, 'image_url', None),
        category_id=category.id
    )
    
    db.add(new_subcategory)
    db.commit()
    db.refresh(new_subcategory)
    return new_subcategory

# GET a specific subcategory by slug
@category_router.get("/subcategory/{slug}", response_model=SubCategorySchema)
def get_subcategory(slug: str, db: Session = Depends(get_db)):
    subcategory = db.query(SubCategory).filter(SubCategory.slug == slug).first()
    if not subcategory:
        raise HTTPException(status_code=404, detail=f"Subcategory with slug '{slug}' not found")
    return subcategory

# UPDATE a subcategory
@category_router.put("/subcategory/{slug}", response_model=SubCategorySchema)
def update_subcategory(slug: str, subcategory: SubCategoryUpdate, db: Session = Depends(get_db)):
    db_subcategory = db.query(SubCategory).filter(SubCategory.slug == slug).first()
    if not db_subcategory:
        raise HTTPException(status_code=404, detail=f"Subcategory with slug '{slug}' not found")
    
    # Update slug if name is changing
    if hasattr(subcategory, 'name') and subcategory.name and subcategory.name != db_subcategory.name:
        if not hasattr(subcategory, 'slug') or not subcategory.slug:
            subcategory.slug = slugify(subcategory.name)
        
        # Check if new slug already exists (and it's not this subcategory's current slug)
        if subcategory.slug != db_subcategory.slug:
            existing_subcategory = db.query(SubCategory).filter(SubCategory.slug == subcategory.slug).first()
            if existing_subcategory:
                raise HTTPException(status_code=400, detail=f"Subcategory slug '{subcategory.slug}' already exists")
    
    # Update subcategory fields
    for field, value in subcategory.dict(exclude_unset=True, exclude_none=True).items():
        setattr(db_subcategory, field, value)
    
    db.commit()
    db.refresh(db_subcategory)
    return db_subcategory

# DELETE a subcategory
@category_router.delete("/subcategory/{slug}")
def delete_subcategory(slug: str, db: Session = Depends(get_db)):
    subcategory = db.query(SubCategory).filter(SubCategory.slug == slug).first()
    if not subcategory:
        raise HTTPException(status_code=404, detail=f"Subcategory with slug '{slug}' not found")
    
    db.delete(subcategory)
    db.commit()
    
    return {"message": f"Subcategory with slug '{slug}' deleted successfully"} 