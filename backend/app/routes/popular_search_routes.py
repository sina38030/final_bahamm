from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.models import PopularSearch, TEHRAN_TZ
from app.schemas import PopularSearchCreate, PopularSearchUpdate, PopularSearchResponse
from app.utils.security import get_current_user

popular_search_router = APIRouter(prefix="/popular-searches", tags=["popular-searches"])

@popular_search_router.get("", response_model=List[PopularSearchResponse])
def get_popular_searches(
    include_inactive: bool = False,
    db: Session = Depends(get_db)
):
    """Get all popular searches (public endpoint)"""
    query = db.query(PopularSearch)
    
    if not include_inactive:
        query = query.filter(PopularSearch.is_active == True)
    
    searches = query.order_by(PopularSearch.sort_order.asc()).all()
    return searches

@popular_search_router.get("/{search_id}", response_model=PopularSearchResponse)
def get_popular_search(
    search_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific popular search by ID"""
    search = db.query(PopularSearch).filter(PopularSearch.id == search_id).first()
    if not search:
        raise HTTPException(status_code=404, detail="Popular search not found")
    return search

@popular_search_router.post("", response_model=PopularSearchResponse)
def create_popular_search(
    search_data: PopularSearchCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new popular search (admin only)"""
    new_search = PopularSearch(
        search_term=search_data.search_term,
        sort_order=search_data.sort_order,
        is_active=search_data.is_active
    )
    db.add(new_search)
    db.commit()
    db.refresh(new_search)
    return new_search

@popular_search_router.put("/{search_id}", response_model=PopularSearchResponse)
def update_popular_search(
    search_id: int,
    search_data: PopularSearchUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing popular search (admin only)"""
    search = db.query(PopularSearch).filter(PopularSearch.id == search_id).first()
    if not search:
        raise HTTPException(status_code=404, detail="Popular search not found")
    
    if search_data.search_term is not None:
        search.search_term = search_data.search_term
    if search_data.sort_order is not None:
        search.sort_order = search_data.sort_order
    if search_data.is_active is not None:
        search.is_active = search_data.is_active
    
    search.updated_at = datetime.now(TEHRAN_TZ)
    db.commit()
    db.refresh(search)
    return search

@popular_search_router.delete("/{search_id}")
def delete_popular_search(
    search_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a popular search (admin only)"""
    search = db.query(PopularSearch).filter(PopularSearch.id == search_id).first()
    if not search:
        raise HTTPException(status_code=404, detail="Popular search not found")
    
    db.delete(search)
    db.commit()
    return {"message": "Popular search deleted successfully"}

@popular_search_router.post("/reorder")
def reorder_popular_searches(
    search_ids: List[int],
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reorder popular searches by providing ordered list of IDs (admin only)"""
    for index, search_id in enumerate(search_ids):
        search = db.query(PopularSearch).filter(PopularSearch.id == search_id).first()
        if search:
            search.sort_order = index
            search.updated_at = datetime.now(TEHRAN_TZ)
    
    db.commit()
    return {"message": "Popular searches reordered successfully"}

