import random
import string
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models import User, PhoneVerification, UserType
from app.schemas import PhoneVerificationRequest, VerifyCodeRequest
from app.services.sms import sms_service
from app.utils.logging import get_logger

# Get auth-specific logger
logger = get_logger("auth")

# SMS Service Integration (Replace with actual SMS service)
class SMSService:
    @staticmethod
    async def send_verification_code(phone_number: str, code: str) -> bool:
        # TODO: Implement actual SMS service integration
        # For now, just print the code for testing
        print(f"Sending verification code {code} to {phone_number}")
        return True

def generate_verification_code() -> str:
    """Generate a 5-digit verification code"""
    return ''.join(random.choices(string.digits, k=5))

def create_verification_code(db: Session, user: User) -> str:
    """Create a new verification code for a user"""
    logger.info(f"Creating verification code for user ID: {user.id}, phone: {user.phone_number}")
    
    # Invalidate any existing codes
    db.query(PhoneVerification).filter(
        PhoneVerification.user_id == user.id,
        PhoneVerification.is_used == False
    ).update({"is_used": True})
    
    # Generate new code
    code = generate_verification_code()
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    
    verification = PhoneVerification(
        user_id=user.id,
        verification_code=code,
        expires_at=expires_at
    )
    
    db.add(verification)
    db.commit()
    
    logger.info(f"Verification code created for user ID: {user.id}, expires at: {expires_at}")
    return code

async def send_verification_code(db: Session, phone_number: str, user_type: str) -> dict:
    """Send verification code to phone number"""
    logger.info(f"Request to send verification code to phone number: {phone_number}, user type: {user_type}")
    
    try:
        # Check if user exists
        user = db.query(User).filter(User.phone_number == phone_number).first()
        
        # Convert string user_type to enum type
        if user_type.upper() == "CUSTOMER":
            user_type_enum = UserType.CUSTOMER
        elif user_type.upper() == "MERCHANT":
            user_type_enum = UserType.MERCHANT
        else:
            logger.warning(f"Invalid user type: {user_type}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user type. Must be 'CUSTOMER' or 'MERCHANT'"
            )
        
        if not user:
            logger.info(f"Creating new user for phone number: {phone_number}")
            # Create new user if doesn't exist
            user = User(
                phone_number=phone_number,
                user_type=user_type_enum,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"New user created with ID: {user.id}")
        else:
            logger.info(f"Found existing user with ID: {user.id} for phone number: {phone_number}")
        
        # Generate and send verification code
        code = create_verification_code(db, user)
        logger.info(f"Verification code: {code}")
        logger.info(f"Attempting to send verification code to {phone_number}")
        
        sms_result = await sms_service.send_verification_code(phone_number, code)
        logger.debug(f"SMS service returned: {sms_result}")
        
        if isinstance(sms_result, tuple):
            success, fallback_code = sms_result
        else:
            # Handle backward compatibility
            success = sms_result
            fallback_code = None
        
        logger.debug(f"SMS success: {success}, fallback_code: {fallback_code}")
        
        if not success:
            logger.error(f"Failed to send verification code to {phone_number}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send verification code"
            )
        
        logger.info(f"Verification code sent successfully to {phone_number}")
        
        response_data = {
            "message": "کد تایید با موفقیت ارسال شد",
            "expires_in": 15  # minutes
        }
        
        # If we have a fallback code, it means SMS failed and we're in fallback mode
        if fallback_code:
            response_data["message"] = "ارسال پیامک با مشکل مواجه شد. کد تایید در زیر نمایش داده شده است:"
            response_data["test_code"] = fallback_code
            response_data["fallback_mode"] = True
            logger.info(f"SMS failed, providing fallback code {fallback_code} for {phone_number}")
        
        logger.debug(f"Final response data: {response_data}")
        return response_data
    except Exception as e:
        if isinstance(e, HTTPException):
            logger.warning(f"HTTP Exception while sending verification code: {str(e)}")
            raise e
        logger.error(f"Error in send_verification_code: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process verification: {str(e)}"
        )

def verify_code(db: Session, phone_number: str, code: str) -> User:
    """Verify the provided code and return the user"""
    logger.info(f"Verifying code for phone number: {phone_number}")
    
    user = db.query(User).filter(User.phone_number == phone_number).first()
    if not user:
        logger.warning(f"User not found for phone number: {phone_number}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    logger.debug(f"Found user ID: {user.id} for verification")
    
    # First, try to verify against our database
    verification = db.query(PhoneVerification).filter(
        PhoneVerification.user_id == user.id,
        PhoneVerification.verification_code == code,
        PhoneVerification.is_used == False,
        PhoneVerification.expires_at > datetime.utcnow()
    ).first()
    
    # If not found in database, check if it's a Melipayamak code stored in memory
    if not verification:
        from app.services.sms import sms_service
        test_code = sms_service.get_test_code(phone_number)
        if test_code and test_code == code:
            logger.info(f"Code verified against Melipayamak stored code for {phone_number}")
            # Find any recent verification record for this user to mark as used
            recent_verification = db.query(PhoneVerification).filter(
                PhoneVerification.user_id == user.id,
                PhoneVerification.is_used == False,
                PhoneVerification.expires_at > datetime.utcnow()
            ).first()
            
            if recent_verification:
                recent_verification.is_used = True
            else:
                # Create a verification record for tracking
                verification = PhoneVerification(
                    user_id=user.id,
                    verification_code=code,
                    expires_at=datetime.utcnow() + timedelta(minutes=15),
                    is_used=True
                )
                db.add(verification)
            
            user.is_phone_verified = True
            db.commit()
            logger.info(f"Phone verification successful for user ID: {user.id} using Melipayamak code")
            return user
    
    if not verification:
        logger.warning(f"Invalid or expired verification code for user ID: {user.id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code"
        )
    
    # Mark code as used and verify user
    verification.is_used = True
    user.is_phone_verified = True
    db.commit()
    
    logger.info(f"Phone verification successful for user ID: {user.id}")
    return user 