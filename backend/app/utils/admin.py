from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.utils.security import get_current_user
from app.utils.logging import get_logger

logger = get_logger("admin")

ADMIN_PHONE_NUMBER = "+989155106656"

async def get_admin_user(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to ensure the current user is an admin.
    Admin is determined by phone number.
    """
    logger.debug(f"Checking admin access for user: {current_user.id}, phone: {current_user.phone_number}")
    
    # Normalize phone number for comparison
    user_phone = current_user.phone_number
    if user_phone and not user_phone.startswith("+"):
        user_phone = "+" + user_phone
    
    if user_phone != ADMIN_PHONE_NUMBER:
        logger.warning(f"Unauthorized admin access attempt by user: {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    logger.info(f"Admin access granted to user: {current_user.id}")
    return current_user 