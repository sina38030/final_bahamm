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
        self.is_test_mode = True  # Default to test until provider is confirmed
        self.force_test_mode = getattr(settings, "SMS_FORCE_TEST_MODE", False)
        
        try:
            # Check if we're using custom API key from settings
            if hasattr(settings, 'MELIPAYAMAK_API_KEY') and settings.MELIPAYAMAK_API_KEY and settings.MELIPAYAMAK_API_KEY != "":
                # Extract API key ID for URL construction
                api_key = settings.MELIPAYAMAK_API_KEY
                self.melipayamak_api_url = f'https://console.melipayamak.com/api/send/otp/{api_key}'
                self.is_test_mode = False
                logger.info(f"Using Melipayamak API key: {api_key}")
            else:
                logger.warning("MELIPAYAMAK_API_KEY is not set or empty. Using test mode.")
                self.is_test_mode = True
        
            if self.provider == "melipayamak" and not self.is_test_mode:
                logger.info(f"Melipayamak SMS service initialized with API URL: {self.melipayamak_api_url}")
            else:
                logger.info("SMS service initialized in TEST MODE")
            if self.force_test_mode:
                logger.warning("SMS_FORCE_TEST_MODE is enabled. All SMS messages will be logged only.")
        except Exception as e:
            self.is_test_mode = True
            logger.error(f"Failed to initialize SMS provider: {str(e)}", exc_info=True)

    async def send_verification_code(self, phone_number: str, code: str):
        """
        Send OTP verification code using Melipayamak's OTP API.
        Note: Melipayamak's OTP API sends its own predefined message and code.
        The 'code' parameter is ignored when using the real API.
        """
        
        if self.is_test_mode or self.force_test_mode:
            message = f"Your verification code is: {code}"
            logger.info(f"[TEST MODE] SMS to {phone_number}: {message}")
            # Store the code for testing
            test_verification_codes[phone_number] = code
            logger.info(f"*** TEST VERIFICATION CODE FOR {phone_number}: {code} ***")
            print(f"*** VERIFICATION CODE FOR {phone_number}: {code} ***")
            return True, code
        
        try:
            if self.provider == "melipayamak":
                # Format phone number for Melipayamak (ensure it starts with 09)
                formatted_phone = phone_number
                if formatted_phone.startswith('+98'):
                    formatted_phone = '0' + formatted_phone[3:]  # Convert +98... to 0...
                elif formatted_phone.startswith('98'):
                    formatted_phone = '0' + formatted_phone[2:]  # Convert 98... to 0...
                elif formatted_phone.startswith('+'):
                    formatted_phone = phone_number[1:]  # Just remove the + sign
                
                # Ensure it starts with 09
                if not formatted_phone.startswith('09'):
                    logger.error(f"Invalid phone number format: {phone_number} -> {formatted_phone}")
                    return False, "Invalid phone number format"
                
                logger.info(f"Sending OTP via Melipayamak to original: {phone_number}, formatted: {formatted_phone}")
                
                # Prepare request data for OTP API - exactly as specified by user
                data = {'to': formatted_phone}
                logger.info(f"Melipayamak OTP request data: {json.dumps(data)}")
                logger.info(f"Melipayamak API URL: {self.melipayamak_api_url}")
                
                # Send request with timeout and proper error handling
                # Reduced timeout to 15s to prevent request timeouts
                try:
                    logger.info("Sending HTTP POST request to Melipayamak OTP API")
                    response = requests.post(
                        self.melipayamak_api_url, 
                        json=data,
                        timeout=15,  # 15 second timeout (reduced from 30s)
                        headers={'Content-Type': 'application/json'}
                    )
                    logger.info(f"Melipayamak response status code: {response.status_code}")
                    logger.info(f"Melipayamak response headers: {dict(response.headers)}")
                    
                    # Try to get response body
                    try:
                        response_data = response.json()
                        logger.info(f"Melipayamak response body: {json.dumps(response_data, ensure_ascii=False)}")
                        
                        # Check for successful response
                        if response.status_code == 200:
                            # Check if the response contains the OTP code
                            if 'code' in response_data:
                                melipayamak_code = str(response_data['code'])
                                logger.info(f"OTP sent successfully via Melipayamak to {phone_number}, code: {melipayamak_code}")
                                # Store the actual code from Melipayamak for verification
                                test_verification_codes[phone_number] = melipayamak_code
                                return True, None
                            else:
                                # Check for success status even without explicit code
                                status_msg = response_data.get('status', '')
                                if 'موفق' in status_msg or 'ارسال شد' in status_msg or response_data.get('success', False):
                                    logger.info(f"OTP sent successfully via Melipayamak to {phone_number}")
                                    return True, None
                                else:
                                    logger.warning(f"Melipayamak API returned unexpected response: {response_data}")
                                    # Try fallback methods
                                    return await self._handle_sms_fallback(phone_number, code)
                        else:
                            logger.error(f"Melipayamak API returned error status {response.status_code}: {response_data}")
                            return await self._handle_sms_fallback(phone_number, code)
                    except Exception as e:
                        logger.warning(f"Could not parse Melipayamak response as JSON: {str(e)}")
                        logger.debug(f"Raw response text: {response.text}")
                        
                        # If we can't parse JSON but got 200, assume success
                        if response.status_code == 200:
                            logger.info(f"OTP sent successfully via Melipayamak to {phone_number} (no JSON response)")
                            test_verification_codes[phone_number] = code
                            return True, None
                        else:
                            logger.error(f"Failed to send OTP via Melipayamak: HTTP {response.status_code}")
                            return False, None
                    
                except requests.RequestException as e:
                    logger.error(f"HTTP request to Melipayamak failed: {str(e)}", exc_info=True)
                    # Try alternative SMS API on request failure
                    logger.info(f"Trying alternative SMS API due to request failure for phone: {phone_number}")
                    alt_success = await self._try_alternative_sms_api(phone_number, code, is_verification=True)
                    if alt_success:
                        return True, None
                    # Try SOAP API as final attempt
                    logger.info(f"Trying SOAP API for phone: {phone_number}")
                    soap_success = await self._try_soap_api(phone_number, code)
                    if soap_success:
                        return True, None
                    # Final fallback to test mode
                    logger.info(f"All methods failed, falling back to test mode for phone: {phone_number}")
                    test_verification_codes[phone_number] = code
                    logger.info(f"*** FALLBACK VERIFICATION CODE FOR {phone_number}: {code} ***")
                    print(f"*** FALLBACK VERIFICATION CODE FOR {phone_number}: {code} ***")
                    return True, code
            else:
                logger.error(f"Unsupported SMS provider: {self.provider}")
                return False, None
        except Exception as e:
            logger.error(f"Failed to send OTP to {phone_number}: {str(e)}", exc_info=True)
            # Always fallback to test mode on any exception
            logger.info(f"Exception occurred, falling back to test mode for phone: {phone_number}")
            test_verification_codes[phone_number] = code
            logger.info(f"*** FALLBACK VERIFICATION CODE FOR {phone_number}: {code} ***")
            print(f"*** FALLBACK VERIFICATION CODE FOR {phone_number}: {code} ***")
            return True, code

    async def _try_soap_api(self, phone_number: str, code: str) -> bool:
        """Try SOAP API as alternative"""
        try:
            logger.info(f"Trying SOAP API for {phone_number}")
            
            # Skip credit check - let's try sending SMS directly
            logger.info(f"Attempting SMS send via SOAP API (skipping credit check)")
            
            url = "https://api.payamak-panel.com/post/Send.asmx/SendSimpleSMS"
            
            data = {
                "username": settings.MELIPAYAMAK_API_KEY,
                "password": "",
                "to": phone_number,
                "from": "50004001",
                "text": f"کد تایید: {code}",
                "isflash": "false"
            }
            
            response = requests.post(url, data=data, timeout=15)
            logger.debug(f"SOAP API response status: {response.status_code}")
            logger.debug(f"SOAP API response: {response.text[:200]}")
            
            if response.status_code == 200:
                # Parse the response to check for success
                import re
                strings = re.findall(r'<string>([^<]*)</string>', response.text)
                logger.info(f"SOAP API response strings: {strings}")
                
                # If it was working before with 0, let's trust it
                if strings and strings[0] == '0':
                    logger.info(f"SOAP API returned success code 0 for {phone_number}")
                    # Store the code for verification in case SMS doesn't arrive
                    test_verification_codes[phone_number] = code
                    return True
                else:
                    logger.warning(f"SOAP API returned non-zero or invalid response: {strings}")
                    return False
            else:
                logger.warning(f"SOAP API returned HTTP {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"SOAP API failed: {str(e)}")
            return False

    async def _try_alternative_sms_api(self, phone_number: str, message: str, is_verification: bool = False) -> bool:
        """Try alternative Melipayamak SMS API for sending messages"""
        try:
            # Format phone number
            formatted_phone = phone_number
            if formatted_phone.startswith('+98'):
                formatted_phone = '0' + formatted_phone[3:]
            elif formatted_phone.startswith('98'):
                formatted_phone = '0' + formatted_phone[2:]
            elif formatted_phone.startswith('+'):
                formatted_phone = phone_number[1:]

            if not formatted_phone.startswith('09'):
                logger.error(f"Invalid phone format for alternative SMS: {phone_number}")
                return False

            # Extract API key for SMS API
            api_key = settings.MELIPAYAMAK_API_KEY
            sms_url = f'https://console.melipayamak.com/api/send/simple/{api_key}'

            # If this is for verification, format the message accordingly
            if is_verification:
                final_message = f"کد تایید شما: {message}\nاین کد تا 15 دقیقه معتبر است."
            else:
                final_message = message

            data = {
                'to': formatted_phone,
                'text': final_message
            }

            logger.info(f"Trying alternative SMS API for {formatted_phone}")
            logger.debug(f"Alternative SMS data: {json.dumps(data)}")

            response = requests.post(sms_url, json=data, timeout=20)
            logger.debug(f"Alternative SMS response status: {response.status_code}")

            if response.status_code == 200:
                try:
                    response_data = response.json()
                    logger.debug(f"Alternative SMS response: {json.dumps(response_data)}")

                    # Check for success indicators
                    status_msg = response_data.get('status', '')
                    if ('ارسال شده' in status_msg or
                        'ارسال موفق' in status_msg or
                        'sent' in status_msg.lower() or
                        response_data.get('success') == True or
                        'ok' in status_msg.lower() or
                        'موفق' in status_msg):
                        logger.info(f"SMS sent successfully via alternative API to {formatted_phone}")
                        if is_verification:
                            test_verification_codes[formatted_phone] = message
                        return True
                    else:
                        logger.warning(f"Alternative SMS API returned: {status_msg}")
                        return False

                except Exception as e:
                    logger.warning(f"Could not parse alternative SMS response: {str(e)}")
                    logger.debug(f"Raw response: {response.text}")
                    # If we got 200 but can't parse, assume success for development
                    if response.status_code == 200:
                        logger.info(f"Alternative SMS assumed successful (unparseable response)")
                        if is_verification:
                            test_verification_codes[formatted_phone] = message
                        return True
                    return False
            else:
                logger.warning(f"Alternative SMS API returned HTTP {response.status_code}")
                logger.debug(f"Response: {response.text}")
                return False
        except requests.exceptions.Timeout:
            logger.warning("SMS API timeout while calling alternative endpoint")
            return False
        except requests.exceptions.RequestException as e:
            logger.error(f"SMS API connection error: {e}")
            return False

        except Exception as e:
            logger.error(f"Alternative SMS API failed: {str(e)}")
            return False

    async def send_sms(self, phone_number: str, message: str) -> bool:
        """
        Send a general SMS message to a phone number

        Args:
            phone_number: The recipient's phone number
            message: The message to send

        Returns:
            bool: True if SMS was sent successfully, False otherwise
        """
        logger.info(f"Sending SMS to {phone_number}: {message[:50]}...")

        if self.is_test_mode or self.force_test_mode:
            logger.info(f"[TEST MODE] SMS to {phone_number}: {message}")
            try:
                print(f"*** SMS TO {phone_number}: {message} ***".encode('utf-8').decode('utf-8'))
            except:
                print(f"*** SMS TO {phone_number}: [Persian message - check logs] ***")
            return True

        try:
            if self.provider == "melipayamak":
                # Format phone number for Melipayamak (remove '+' and country code if necessary)
                formatted_phone = phone_number
                if formatted_phone.startswith('+98'):
                    formatted_phone = '0' + formatted_phone[3:]  # Convert +98... to 0...
                elif formatted_phone.startswith('98'):
                    formatted_phone = '0' + formatted_phone[2:]  # Convert 98... to 0...
                elif formatted_phone.startswith('+'):
                    formatted_phone = phone_number[1:]  # Just remove the + sign

                # Ensure it starts with 09
                if not formatted_phone.startswith('09'):
                    logger.error(f"Invalid phone number format: {phone_number} -> {formatted_phone}")
                    return False

                logger.info(f"Sending SMS via Melipayamak to original: {phone_number}, formatted: {formatted_phone}")

                # Use the alternative SMS API for general SMS messages
                final_message = message
                alt_success = await self._try_alternative_sms_api(formatted_phone, final_message, is_verification=False)
                if alt_success:
                    return True

                logger.warning(f"Alternative SMS API failed for {formatted_phone}, trying SOAP fallback")
                soap_success = await self._send_general_via_soap(formatted_phone, final_message)
                if soap_success:
                    return True

                logger.error(f"All SMS delivery attempts failed for {formatted_phone}")
                return False

            else:
                logger.error(f"Unsupported SMS provider: {self.provider}")
                return False
        except Exception as e:
            logger.error(f"Failed to send SMS to {phone_number}: {str(e)}", exc_info=True)
            return False

    async def _send_general_via_soap(self, phone_number: str, message: str) -> bool:
        """Send general SMS via legacy SOAP API as a fallback."""
        try:
            logger.info(f"Trying SOAP fallback for {phone_number}")
            url = "https://api.payamak-panel.com/post/Send.asmx/SendSimpleSMS"

            data = {
                "username": settings.MELIPAYAMAK_API_KEY,
                "password": "",
                "to": phone_number,
                "from": "50004001",
                "text": message,
                "isflash": "false"
            }

            response = requests.post(url, data=data, timeout=20)
            logger.debug(f"SOAP fallback status: {response.status_code}")
            logger.debug(f"SOAP fallback response body: {response.text[:200]}")

            if response.status_code == 200:
                import re
                strings = re.findall(r'<string>([^<]*)</string>', response.text)
                if strings and strings[0] == '0':
                    logger.info(f"SOAP fallback succeeded for {phone_number}")
                    return True
                logger.warning(f"SOAP fallback returned non-success response: {strings}")
                return False

            logger.warning(f"SOAP fallback returned HTTP {response.status_code}")
            return False
        except requests.exceptions.Timeout:
            logger.error(f"SOAP fallback timed out for {phone_number}")
            return False
        except Exception as exc:
            logger.error(f"SOAP fallback failed for {phone_number}: {exc}")
            return False

    async def _handle_sms_fallback(self, phone_number: str, code: str):
        """Handle SMS fallback when primary API fails"""
        try:
            # Try alternative SMS API first
            logger.info(f"Trying alternative SMS API for phone: {phone_number}")
            alt_success = await self._try_alternative_sms_api(phone_number, code)
            if alt_success:
                return True, None
            
            # Try SOAP API as final attempt
            logger.info(f"Trying SOAP API for phone: {phone_number}")
            soap_success = await self._try_soap_api(phone_number, code)
            if soap_success:
                return True, None
            
            # Final fallback to test mode
            logger.info(f"All SMS methods failed, falling back to test mode for phone: {phone_number}")
            test_verification_codes[phone_number] = code
            logger.info(f"*** FALLBACK VERIFICATION CODE FOR {phone_number}: {code} ***")
            print(f"*** FALLBACK VERIFICATION CODE FOR {phone_number}: {code} ***")
            return True, code
        except Exception as e:
            logger.error(f"Error in SMS fallback: {str(e)}", exc_info=True)
            # Ultimate fallback
            test_verification_codes[phone_number] = code
            return True, code

    def get_test_code(self, phone_number: str) -> Optional[str]:
        """Get the test verification code for a phone number"""
        code = test_verification_codes.get(phone_number)
        logger.debug(f"Retrieved test code for {phone_number}: {code}")
        return code
    
    @staticmethod
    def get_test_code_static(phone_number: str) -> Optional[str]:
        """Static method to get the test verification code for a phone number"""
        code = test_verification_codes.get(phone_number)
        logger.debug(f"Retrieved test code for {phone_number}: {code}")
        return code

# Create a singleton instance
sms_service = SMSService() 