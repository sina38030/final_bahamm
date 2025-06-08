from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Optional

from app.database import get_db
from app.schemas import (
    PhoneVerificationRequest,
    PhoneVerificationResponse,
    VerifyCodeRequest,
    Token,
    UserCreate,
    ProfileUpdate,
    User
)
from app.utils.auth import send_verification_code, verify_code
from app.utils.security import create_access_token, get_current_user
from app.utils.logging import get_logger

# Initialize logger
logger = get_logger("auth.routes")

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/send-verification", response_model=PhoneVerificationResponse)
async def request_verification(
    request: PhoneVerificationRequest,
    db: Session = Depends(get_db)
):
    """Send verification code to phone number"""
    logger.info(f"Received verification request for phone: {request.phone_number}")
    result = await send_verification_code(db, request.phone_number, request.user_type)
    logger.info(f"Verification code sent for phone: {request.phone_number}")
    return result

@router.post("/verify", response_model=Token)
async def verify_phone(
    request: VerifyCodeRequest,
    db: Session = Depends(get_db)
):
    """Verify phone number with code and return access token"""
    logger.info(f"Received code verification request for phone: {request.phone_number}")
    user = verify_code(db, request.phone_number, request.verification_code)
    
    # Create access token
    access_token_expires = timedelta(minutes=30)
    
    # Convert UserType enum to string to make it JSON serializable
    user_type_str = user.user_type.value if user.user_type else None
    
    access_token = create_access_token(
        data={"sub": str(user.id), "phone_number": user.phone_number, "user_type": user_type_str},
        expires_delta=access_token_expires
    )
    
    logger.info(f"User {user.id} successfully verified and authenticated")
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/complete-profile", response_model=User)
async def complete_profile(
    user_data: ProfileUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Complete user profile after phone verification"""
    if not current_user.is_phone_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number not verified"
        )
    
    # Update user profile
    if user_data.first_name:
        current_user.first_name = user_data.first_name
    if user_data.last_name:
        current_user.last_name = user_data.last_name
    if user_data.email:
        current_user.email = user_data.email
    if user_data.password:
        current_user.password = user_data.password
    
    db.commit()
    db.refresh(current_user)
    
    return current_user 