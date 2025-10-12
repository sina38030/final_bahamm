from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any

from app.database import get_db
from app.models import Order

router = APIRouter(prefix="/pricing", tags=["pricing"])


@router.get("/tiers")
async def get_secondary_pricing_tiers(
    type: str = Query(..., alias="type"),
    order_id: int = Query(..., alias="order_id"),
    db: Session = Depends(get_db),
):
    if (type or "").lower() != "secondary":
        raise HTTPException(status_code=400, detail="Unsupported pricing type")
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    base = float(order.total_amount or 0)
    leaderPrices = {
        "with1Friend": base,
        "with2Friends": round(base * 0.667, 2),
        "with3Friends": round(base * 0.334, 2),
        "with4Friends": 0.0,
    }
    return {
        "basePrice": base,
        "leaderPrices": leaderPrices,
        "inviteePrice": base,
    }


