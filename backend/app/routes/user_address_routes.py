from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from sqlalchemy import update

from app.database import get_db
from app.models import UserAddress, User
from app.schemas import UserAddress as UserAddressSchema, UserAddressCreate, UserAddressUpdate
from app.utils.security import get_current_user
from app.utils.logging import get_logger

user_address_router = APIRouter(prefix="/users/addresses", tags=["user addresses"])
logger = get_logger("user_addresses")

# Get all addresses for the current user
@user_address_router.get("", response_model=List[UserAddressSchema])
def get_user_addresses(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    addresses = db.query(UserAddress).filter(UserAddress.user_id == current_user.id).all()
    return addresses

# Create a new address
@user_address_router.post("", response_model=UserAddressSchema)
def create_user_address(
    address: UserAddressCreate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    logger.info(f"Create address requested by user_id={current_user.id}: {address.dict()}")
    # If this is the first address or is_default is True, set all other addresses to non-default
    is_default = address.is_default
    if is_default or db.query(UserAddress).filter(UserAddress.user_id == current_user.id).count() == 0:
        # Set all existing addresses to non-default
        db.query(UserAddress).filter(UserAddress.user_id == current_user.id).update({"is_default": False})
        # Ensure this address is default
        is_default = True
    
    # Create new address
    db_address = UserAddress(
        user_id=current_user.id,
        title=address.title,
        full_address=address.full_address,
        postal_code=address.postal_code,
        receiver_name=address.receiver_name,
        phone_number=address.phone_number,
        latitude=address.latitude,
        longitude=address.longitude,
        is_default=is_default
    )
    
    try:
        db.add(db_address)
        db.commit()
        db.refresh(db_address)
        logger.info(f"Address created: id={db_address.id} for user_id={current_user.id}")
    except Exception as e:
        logger.error(f"Failed to create address for user_id={current_user.id}: {e}")
        db.rollback()
        raise
    
    return db_address

# Get a specific address
@user_address_router.get("/{address_id}", response_model=UserAddressSchema)
def get_user_address(
    address_id: int, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    address = db.query(UserAddress).filter(
        UserAddress.id == address_id, 
        UserAddress.user_id == current_user.id
    ).first()
    
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    
    return address

# Update an address
@user_address_router.put("/{address_id}", response_model=UserAddressSchema)
def update_user_address(
    address_id: int, 
    address_update: UserAddressUpdate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    logger.info(f"Update address requested by user_id={current_user.id}, address_id={address_id}: {address_update.dict(exclude_unset=True)}")
    db_address = db.query(UserAddress).filter(
        UserAddress.id == address_id, 
        UserAddress.user_id == current_user.id
    ).first()
    
    if not db_address:
        raise HTTPException(status_code=404, detail="Address not found")
    
    # Handle default status if it's being updated
    if address_update.is_default is not None and address_update.is_default:
        # Set all addresses to non-default
        db.query(UserAddress).filter(UserAddress.user_id == current_user.id).update({"is_default": False})
    
    # Update address fields
    for field, value in address_update.dict(exclude_unset=True).items():
        if value is not None:  # Only update fields that were provided
            setattr(db_address, field, value)
    try:
        db.commit()
        db.refresh(db_address)
        logger.info(f"Address updated: id={db_address.id} for user_id={current_user.id}")
    except Exception as e:
        logger.error(f"Failed to update address id={address_id} for user_id={current_user.id}: {e}")
        db.rollback()
        raise
    
    return db_address

# Delete an address
@user_address_router.delete("/{address_id}")
def delete_user_address(
    address_id: int, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    logger.info(f"Delete address requested by user_id={current_user.id}, address_id={address_id}")
    db_address = db.query(UserAddress).filter(
        UserAddress.id == address_id, 
        UserAddress.user_id == current_user.id
    ).first()
    
    if not db_address:
        raise HTTPException(status_code=404, detail="Address not found")
    
    # Check if this was the default address
    was_default = db_address.is_default
    
    # Delete the address
    db.delete(db_address)
    
    # If the deleted address was default, set the first remaining address as default (if any)
    if was_default:
        first_address = db.query(UserAddress).filter(UserAddress.user_id == current_user.id).first()
        if first_address:
            first_address.is_default = True
    
    try:
        db.commit()
        logger.info(f"Address deleted: id={address_id} for user_id={current_user.id}")
    except Exception as e:
        logger.error(f"Failed to delete address id={address_id} for user_id={current_user.id}: {e}")
        db.rollback()
        raise
    
    return {"message": "Address deleted successfully"}

# Set an address as default
@user_address_router.patch("/{address_id}/default")
def set_default_address(
    address_id: int, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    logger.info(f"Set default address requested by user_id={current_user.id}, address_id={address_id}")
    # Check if address exists and belongs to the user
    db_address = db.query(UserAddress).filter(
        UserAddress.id == address_id, 
        UserAddress.user_id == current_user.id
    ).first()
    
    if not db_address:
        raise HTTPException(status_code=404, detail="Address not found")
    
    # Set all addresses to non-default
    db.query(UserAddress).filter(UserAddress.user_id == current_user.id).update({"is_default": False})
    
    # Set the specified address as default
    db_address.is_default = True
    
    try:
        db.commit()
        logger.info(f"Default address set: id={address_id} for user_id={current_user.id}")
    except Exception as e:
        logger.error(f"Failed to set default address id={address_id} for user_id={current_user.id}: {e}")
        db.rollback()
        raise
    
    return {"message": "Default address set successfully"} 