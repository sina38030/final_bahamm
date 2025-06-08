#!/usr/bin/env python3
import asyncio
import sys
import os
import requests
import json
import logging

# Configure basic logging for the test script
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("melipayamak_test")

# Make sure this script can find the app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config import get_settings
from app.services.sms import SMSService

async def test_melipayamak_direct():
    """Test Melipayamak SMS service directly"""
    settings = get_settings()
    api_key = settings.MELIPAYAMAK_API_KEY
    api_url = f'https://console.melipayamak.com/api/send/otp/{api_key}'
    
    # Input phone number
    phone_number = input("Enter phone number to test (format: 09xxxxxxxxx or +989xxxxxxxxx): ")
    
    # Format phone number for Melipayamak if necessary
    formatted_phone = phone_number
    if formatted_phone.startswith('+98'):
        formatted_phone = '0' + formatted_phone[3:]
    elif formatted_phone.startswith('+'):
        formatted_phone = formatted_phone[1:]
    
    logger.info(f"Original phone: {phone_number}, Formatted: {formatted_phone}")
    logger.info(f"Using API URL: {api_url}")
    
    # Prepare request
    data = {'to': formatted_phone}
    logger.info(f"Request payload: {json.dumps(data)}")
    
    # Send the request
    try:
        logger.info("Sending request to Melipayamak...")
        response = requests.post(api_url, json=data, timeout=10)
        
        logger.info(f"Response status code: {response.status_code}")
        logger.info(f"Response headers: {dict(response.headers)}")
        
        # Parse response
        try:
            response_data = response.json()
            logger.info(f"Response JSON: {json.dumps(response_data, indent=2)}")
        except Exception as e:
            logger.warning(f"Failed to parse response as JSON: {e}")
            logger.info(f"Raw response: {response.text}")
        
        # Analyze the result
        if response.status_code == 200:
            logger.info("✅ Request was successful!")
        else:
            logger.error("❌ Request failed!")
        
        return response.status_code == 200
        
    except requests.RequestException as e:
        logger.error(f"Request exception: {e}")
        return False

async def test_service_integration():
    """Test the actual SMSService integration"""
    # Input phone number
    phone_number = input("Enter phone number to test (format: 09xxxxxxxxx or +989xxxxxxxxx): ")
    
    logger.info(f"Testing SMS service with phone number: {phone_number}")
    
    # Create service instance
    sms_service = SMSService()
    
    # Send verification code
    test_code = "12345"
    logger.info(f"Sending test code {test_code}...")
    
    # Call the service
    success = await sms_service.send_verification_code(phone_number, test_code)
    
    if success:
        logger.info("✅ SMS service reported success!")
    else:
        logger.error("❌ SMS service reported failure!")
    
    return success

async def main():
    print("=== Melipayamak SMS Testing Tool ===")
    print("1. Test direct API call")
    print("2. Test SMS service integration")
    
    choice = input("Enter your choice (1-2): ")
    
    if choice == "1":
        await test_melipayamak_direct()
    elif choice == "2":
        await test_service_integration()
    else:
        print("Invalid choice!")

if __name__ == "__main__":
    asyncio.run(main()) 