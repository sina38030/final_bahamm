from fastapi import APIRouter, Depends, HTTPException, status, Form
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
from app.models import User as UserModel, UserType
from app.utils.auth import send_verification_code, verify_code
from app.utils.security import create_access_token, get_current_user
from app.config import get_settings
from app.utils.logging import get_logger

# Initialize logger
logger = get_logger("auth.routes")

router = APIRouter(prefix="/auth", tags=["authentication"])
settings = get_settings()

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
    
    # Create access token with configured expiry
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
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

@router.post("/simple-register")
async def simple_register(
    phone_number: str = Form(...),
    db: Session = Depends(get_db)
):
    """Simple phone registration without OTP - creates user and returns token"""
    logger.info(f"Simple registration request for phone: {phone_number}")
    
    try:
        # Check if user already exists
        existing_user = db.query(UserModel).filter(UserModel.phone_number == phone_number).first()
        
        if existing_user:
            logger.info(f"User already exists for phone: {phone_number}")
            # Return existing user with new token
            access_token = create_access_token(data={"sub": str(existing_user.id)})
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "user": {
                    "id": existing_user.id,
                    "phone_number": existing_user.phone_number,
                    "first_name": existing_user.first_name,
                    "last_name": existing_user.last_name,
                    "email": existing_user.email,
                    "user_type": existing_user.user_type.value,
                    "coins": existing_user.coins,
                    "created_at": existing_user.created_at.isoformat(),
                    "is_phone_verified": True  # Mark as verified for simple registration
                }
            }
        
        # Create new user
        new_user = UserModel(
            phone_number=phone_number,
            user_type=UserType.CUSTOMER,  # Default to customer
            is_phone_verified=True  # Mark as verified for simple registration
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        logger.info(f"New user created with ID: {new_user.id}")
        
        # Create access token
        access_token = create_access_token(data={"sub": str(new_user.id)})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": new_user.id,
                "phone_number": new_user.phone_number,
                "first_name": new_user.first_name,
                "last_name": new_user.last_name,
                "email": new_user.email,
                "user_type": new_user.user_type.value,
                "coins": new_user.coins,
                "created_at": new_user.created_at.isoformat(),
                "is_phone_verified": True
            }
        }
        
    except Exception as e:
        logger.error(f"Error in simple registration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        ) 