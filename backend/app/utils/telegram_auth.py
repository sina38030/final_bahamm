"""
Telegram Mini App authentication utilities.

Handles verification of Telegram WebApp initData and parsing of user information.
"""

import hashlib
import hmac
from typing import Optional, Dict, Any
from urllib.parse import parse_qsl
from app.utils.logging import get_logger

logger = get_logger("telegram_auth")


def verify_telegram_init_data(init_data: str, bot_token: str) -> bool:
    """
    Verify the authenticity of Telegram WebApp initData.
    
    According to Telegram's documentation:
    https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
    
    Args:
        init_data: The initData string from Telegram.WebApp.initData
        bot_token: Your Telegram bot token
        
    Returns:
        True if the data is authentic, False otherwise
    """
    try:
        # Parse the init_data query string
        parsed_data = dict(parse_qsl(init_data))
        
        # Extract the hash
        received_hash = parsed_data.pop('hash', None)
        if not received_hash:
            logger.warning("No hash found in initData")
            return False
        
        # Create data-check-string: sorted key=value pairs joined with \n
        data_check_string = '\n'.join(
            f"{k}={v}" for k, v in sorted(parsed_data.items())
        )
        
        # Create secret key: HMAC-SHA256(bot_token, "WebAppData")
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=bot_token.encode(),
            digestmod=hashlib.sha256
        ).digest()
        
        # Calculate hash: HMAC-SHA256(data-check-string, secret_key)
        calculated_hash = hmac.new(
            key=secret_key,
            msg=data_check_string.encode(),
            digestmod=hashlib.sha256
        ).hexdigest()
        
        # Compare hashes
        is_valid = calculated_hash == received_hash
        
        if is_valid:
            logger.info("Telegram initData verification successful")
        else:
            logger.warning("Telegram initData verification failed: hash mismatch")
            
        return is_valid
        
    except Exception as e:
        logger.error(f"Error verifying Telegram initData: {str(e)}")
        return False


def parse_telegram_user(init_data_unsafe: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Parse Telegram user information from initDataUnsafe.
    
    Args:
        init_data_unsafe: The initDataUnsafe object from Telegram.WebApp
        
    Returns:
        Dictionary with user information or None if invalid
    """
    try:
        user_data = init_data_unsafe.get('user')
        if not user_data:
            logger.warning("No user data in initDataUnsafe")
            return None
        
        # Extract user fields
        telegram_user = {
            'telegram_id': str(user_data.get('id')),
            'first_name': user_data.get('first_name'),
            'last_name': user_data.get('last_name'),
            'username': user_data.get('username'),
            'language_code': user_data.get('language_code'),
            'photo_url': user_data.get('photo_url'),
        }
        
        # Optional phone number (if user shared it)
        if 'phone_number' in user_data:
            telegram_user['phone_number'] = user_data['phone_number']
        
        logger.info(f"Parsed Telegram user: ID={telegram_user['telegram_id']}, "
                   f"username={telegram_user.get('username')}")
        
        return telegram_user
        
    except Exception as e:
        logger.error(f"Error parsing Telegram user data: {str(e)}")
        return None

