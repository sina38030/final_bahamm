from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.models import Banner

public_router = APIRouter(tags=["public"])

@public_router.get("/banners")
async def get_public_banners(db: Session = Depends(get_db)):
    """Get all active banners (public endpoint, no auth required)"""
    banners = db.query(Banner).filter(Banner.is_active == True).order_by(Banner.sort_order.asc(), Banner.id.asc()).all()
    return [
        {
            "id": b.id,
            "image_url": b.image_url,
            "title": b.title,
            "description": b.description,
            "sort_order": b.sort_order,
            "is_active": b.is_active,
        }
        for b in banners
    ]

@public_router.get("/settings")
async def get_public_settings(db: Session = Depends(get_db)):
    """Get public settings for the storefront (no auth required)"""
    try:
        rows = db.execute(text("SELECT key, value FROM app_settings WHERE key IN ('all_category_image', 'all_category_label', 'fruit_category_image', 'fruit_category_label', 'veggie_category_image', 'veggie_category_label')"))
        data = {row[0]: row[1] for row in rows}
        return {
            "all_category_image": data.get("all_category_image"),
            "all_category_label": data.get("all_category_label", "همه"),
            "fruit_category_image": data.get("fruit_category_image"),
            "fruit_category_label": data.get("fruit_category_label", "میوه ها"),
            "veggie_category_image": data.get("veggie_category_image"),
            "veggie_category_label": data.get("veggie_category_label", "صیفی جات"),
        }
    except Exception as e:
        # Return defaults if database error
        return {
            "all_category_image": None,
            "all_category_label": "همه",
            "fruit_category_image": None,
            "fruit_category_label": "میوه ها",
            "veggie_category_image": None,
            "veggie_category_label": "صیفی جات",
        }

