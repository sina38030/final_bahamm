import requests
import json
from typing import Dict, Any
from app.utils.logging import get_logger
from app.config import get_settings

logger = get_logger(__name__)
settings = get_settings()

class ZarinPalPayment:
    def __init__(self, merchant_id: str, sandbox: bool = True, test_mode: bool = False):
        self.merchant_id = merchant_id
        self.sandbox = sandbox
        self.test_mode = test_mode
        
        # Use new ZarinPal API v4 endpoints
        if sandbox:
            self.base_url = "https://sandbox.zarinpal.com/pg/v4/payment/"
            self.payment_url = "https://sandbox.zarinpal.com/pg/StartPay/"
        else:
            self.base_url = "https://payment.zarinpal.com/pg/v4/payment/"
            self.payment_url = "https://payment.zarinpal.com/pg/StartPay/"
    
    async def request_payment(self, amount: int, description: str, callback_url: str, mobile: str = None, email: str = None) -> Dict[str, Any]:
        """
        درخواست پرداخت به زرین‌پال
        amount: مبلغ به ریال
        description: توضیحات پرداخت
        callback_url: آدرس بازگشت پس از پرداخت
        """
        # Test mode - return fake successful response
        if self.test_mode:
            import random
            fake_authority = f"TEST{random.randint(100000, 999999)}"
            logger.info(f"TEST MODE: Fake payment request for amount {amount}")
            return {
                "success": True,
                "authority": fake_authority,
                "payment_url": f"{settings.FRONTEND_URL}/payment/test-success?authority={fake_authority}&amount={amount}"
            }
        
        try:
            # ZarinPal v4 API format
            data = {
                "merchant_id": self.merchant_id,
                "amount": amount,
                "description": description,
                "callback_url": callback_url,
            }
            
            # Add metadata if mobile or email provided
            if mobile or email:
                metadata = {}
                if mobile:
                    metadata["mobile"] = mobile
                if email:
                    metadata["email"] = email
                data["metadata"] = metadata
            
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
            
            logger.info(f"Sending payment request to ZarinPal: {self.base_url}request.json")
            logger.info(f"Request data: {data}")
            
            # Use httpx for async support with timeout
            import httpx
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    f"{self.base_url}request.json",
                    json=data,
                    headers=headers
                )
            
            logger.info(f"ZarinPal response status: {response.status_code}")
            logger.info(f"ZarinPal response text: {response.text}")
            
            if response.status_code != 200:
                return {
                    "success": False,
                    "error": f"ZarinPal HTTP error: {response.status_code} - {response.text}"
                }
            
            try:
                result = response.json()
                logger.info(f"ZarinPal payment request response: {result}")
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse ZarinPal response as JSON: {e}")
                logger.error(f"Raw response: {response.text[:500]}")
                
                # Check if response contains HTML (likely an error page)
                if response.text.strip().startswith('<'):
                    return {
                        "success": False,
                        "error": "ZarinPal returned HTML instead of JSON. This usually indicates an invalid Merchant ID or API endpoint issue."
                    }
                else:
                    return {
                        "success": False,
                        "error": f"Invalid JSON response from ZarinPal: {response.text[:200]}"
                    }
            
            # ZarinPal v4 API response format
            if result.get('data', {}).get('code') == 100:
                authority = result.get('data', {}).get('authority')
                payment_url = f"{self.payment_url}{authority}"
                return {
                    "success": True,
                    "authority": authority,
                    "payment_url": payment_url
                }
            else:
                error_code = result.get('data', {}).get('code', 'Unknown error')
                error_message = result.get('data', {}).get('message', 'Unknown error')
                return {
                    "success": False,
                    "error": f"ZarinPal error: {error_code} - {error_message}"
                }
                
        except Exception as e:
            logger.error(f"ZarinPal payment request error: {str(e)}")
            return {
                "success": False,
                "error": f"Payment request failed: {str(e)}"
            }
    
    async def verify_payment(self, authority: str, amount: int) -> Dict[str, Any]:
        """
        تایید پرداخت
        authority: کد authority دریافتی از زرین‌پال
        amount: مبلغ پرداخت شده
        """
        # Test mode - return fake successful verification
        if self.test_mode:
            import random
            fake_ref_id = f"TEST{random.randint(1000000, 9999999)}"
            logger.info(f"TEST MODE: Fake payment verification for authority {authority}")
            return {
                "success": True,
                "ref_id": fake_ref_id,
                "status": "verified"
            }
        
        try:
            # ZarinPal v4 API format
            data = {
                "merchant_id": self.merchant_id,
                "amount": amount,
                "authority": authority
            }
            
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
            
            # Use httpx for async support with timeout  
            import httpx
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    f"{self.base_url}verify.json",
                    json=data,
                    headers=headers
                )
            
            result = response.json()
            logger.info(f"ZarinPal payment verification response: {result}")
            
            # ZarinPal v4 API response format
            if result.get('data', {}).get('code') == 100:
                return {
                    "success": True,
                    "ref_id": result.get('data', {}).get('ref_id'),
                    "status": "verified"
                }
            elif result.get('data', {}).get('code') == 101:
                return {
                    "success": True,
                    "ref_id": result.get('data', {}).get('ref_id'),
                    "status": "already_verified"
                }
            else:
                error_code = result.get('data', {}).get('code', 'Unknown error')
                error_message = result.get('data', {}).get('message', 'Unknown error')
                return {
                    "success": False,
                    "error": f"Payment verification failed: {error_code} - {error_message}"
                }
                
        except Exception as e:
            logger.error(f"ZarinPal payment verification error: {str(e)}")
            return {
                "success": False,
                "error": f"Payment verification failed: {str(e)}"
            }

# Initialize ZarinPal with settings from configuration
zarinpal = ZarinPalPayment(
    merchant_id=settings.ZARINPAL_MERCHANT_ID,
    sandbox=settings.ZARINPAL_SANDBOX,
    test_mode=False
)

logger.info(f"💳 ZarinPal initialized - Sandbox: {settings.ZARINPAL_SANDBOX}, Merchant ID configured: {bool(settings.ZARINPAL_MERCHANT_ID)}") 