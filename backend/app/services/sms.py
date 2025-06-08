from typing import Optional, Dict
import requests
import json
from app.config import get_settings
from app.utils.logging import get_logger

# Get SMS-specific logger
logger = get_logger("sms")

settings = get_settings()

# Dictionary to store verification codes for testing
test_verification_codes: Dict[str, str] = {}

class SMSService:
    def __init__(self):
        self.provider = settings.SMS_PROVIDER.lower()
        logger.info(f"Initializing SMS service with provider: {self.provider}")
        
        # Check if we're using custom API key from settings
        if hasattr(settings, 'MELIPAYAMAK_API_KEY') and settings.MELIPAYAMAK_API_KEY:
            # Extract API key ID for URL construction
            api_key = settings.MELIPAYAMAK_API_KEY
            self.melipayamak_api_url = f'https://console.melipayamak.com/api/send/otp/{api_key}'
            logger.info(f"Using custom Melipayamak API key: {api_key}")
        else:
            raise ValueError("MELIPAYAMAK_API_KEY is not set in the environment variables")
        
        self.is_test_mode = False  # Set to False to use actual SMS service
        
        try:
            if self.provider == "melipayamak":
                # No initialization needed for Melipayamak
                logger.info(f"Melipayamak SMS service initialized with API URL: {self.melipayamak_api_url}")
            else:
                self.is_test_mode = True
                logger.warning(f"Unsupported SMS provider '{self.provider}'. Using test mode.")
        except Exception as e:
            self.is_test_mode = True
            logger.error(f"Failed to initialize SMS provider: {str(e)}", exc_info=True)

    async def send_verification_code(self, phone_number: str, code: str) -> bool:
        message = f"Your verification code is: {code}"
        
        if self.is_test_mode:
            logger.info(f"[TEST MODE] SMS to {phone_number}: {message}")
            # Store the code for testing
            test_verification_codes[phone_number] = code
            logger.info(f"*** TEST VERIFICATION CODE: {code} ***")
            return True
        
        try:
            if self.provider == "melipayamak":
                # Format phone number for Melipayamak (remove '+' and country code if necessary)
                # Assuming the phone number is in international format like +989123456789
                formatted_phone = phone_number
                if formatted_phone.startswith('+98'):
                    formatted_phone = '0' + formatted_phone[3:]  # Convert +98... to 0...
                elif formatted_phone.startswith('+'):
                    formatted_phone = phone_number[1:]  # Just remove the + sign
                
                logger.info(f"Sending SMS via Melipayamak to original: {phone_number}, formatted: {formatted_phone}")
                
                # Prepare request data
                data = {'to': formatted_phone}
                logger.debug(f"Melipayamak request data: {json.dumps(data)}")
                logger.debug(f"Melipayamak API URL: {self.melipayamak_api_url}")
                
                # Send request with detailed logs
                try:
                    logger.debug("Sending HTTP POST request to Melipayamak API")
                    response = requests.post(self.melipayamak_api_url, json=data)
                    logger.debug(f"Melipayamak response status code: {response.status_code}")
                    logger.debug(f"Melipayamak response headers: {dict(response.headers)}")
                    
                    # Try to get response body
                    try:
                        response_data = response.json()
                        logger.debug(f"Melipayamak response body: {json.dumps(response_data)}")
                    except Exception as e:
                        logger.warning(f"Could not parse Melipayamak response as JSON: {str(e)}")
                        logger.debug(f"Raw response text: {response.text}")
                    
                    if response.status_code == 200:
                        logger.info(f"SMS sent successfully via Melipayamak to {phone_number}")
                        # Store the code locally since Melipayamak sends its own code
                        test_verification_codes[phone_number] = code
                        return True
                    else:
                        logger.error(f"Failed to send SMS via Melipayamak: HTTP {response.status_code}")
                        logger.error(f"Response text: {response.text}")
                        return False
                except requests.RequestException as e:
                    logger.error(f"HTTP request to Melipayamak failed: {str(e)}", exc_info=True)
                    return False
            else:
                logger.error(f"Unsupported SMS provider: {self.provider}")
                return False
        except Exception as e:
            logger.error(f"Failed to send SMS to {phone_number}: {str(e)}", exc_info=True)
            return False

    @staticmethod
    def get_test_code(phone_number: str) -> Optional[str]:
        """Get the test verification code for a phone number"""
        code = test_verification_codes.get(phone_number)
        logger.debug(f"Retrieved test code for {phone_number}: {code}")
        return code

# Create a singleton instance
sms_service = SMSService() 