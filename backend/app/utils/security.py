from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import TokenData
from app.config import get_settings
from app.utils.logging import get_logger

logger = get_logger("security")
settings = get_settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/verify")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="auth/verify", auto_error=False)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    logger.debug(f"Creating access token with data: {to_encode}")
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        logger.debug(f"Decoding token")
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            logger.warning("Token missing 'sub' claim")
            raise credentials_exception
            
        # Get user_type as string from token
        user_type = payload.get("user_type")
        
        logger.debug(f"Token payload: user_id={user_id}, user_type={user_type}")
        
        token_data = TokenData(
            user_id=int(user_id),
            phone_number=payload.get("phone_number"),
            user_type=user_type
        )
    except JWTError as e:
        logger.error(f"JWT decode error: {str(e)}")
        raise credentials_exception
    
    user = db.query(User).filter(User.id == token_data.user_id).first()
    if user is None:
        logger.warning(f"User not found for ID: {token_data.user_id}")
        raise credentials_exception
    
    logger.debug(f"User authenticated: ID={user.id}, type={user.user_type}")
    return user

async def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Optional authentication: returns User if valid token provided, None otherwise.
    Does not raise an exception if token is missing or invalid.
    """
    if not token:
        logger.debug("No token provided for optional authentication")
        return None
    
    try:
        logger.debug(f"Decoding optional token")
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            logger.warning("Optional token missing 'sub' claim")
            return None
            
        user_type = payload.get("user_type")
        logger.debug(f"Optional token payload: user_id={user_id}, user_type={user_type}")
        
        token_data = TokenData(
            user_id=int(user_id),
            phone_number=payload.get("phone_number"),
            user_type=user_type
        )
    except JWTError as e:
        logger.error(f"Optional JWT decode error: {str(e)}")
        return None
    
    user = db.query(User).filter(User.id == token_data.user_id).first()
    if user is None:
        logger.warning(f"Optional auth: User not found for ID: {token_data.user_id}")
        return None
    
    logger.debug(f"Optional auth: User authenticated: ID={user.id}, type={user.user_type}")
    return user