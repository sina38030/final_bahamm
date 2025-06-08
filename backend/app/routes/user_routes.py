from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models import User
from app.schemas import UserCoinsResponse, User as UserSchema
from app.utils.security import get_current_user

# Change from '/user' to '/users' to match frontend expectations
user_router = APIRouter(prefix="/users", tags=["users"])

@user_router.get("/me", response_model=UserSchema)
async def get_current_user_profile(current_user = Depends(get_current_user)):
    """Get the current authenticated user's profile"""
    return current_user

@user_router.get("/coins", response_model=UserCoinsResponse)
def get_user_coins(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get the current user's coins"""
    return {'coins': current_user.coins} 