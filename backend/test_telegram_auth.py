"""
Test script for Telegram Mini App authentication.

This script helps verify that the Telegram authentication endpoint is working correctly.
"""

import sys
import requests
import json
from datetime import datetime
import hashlib
import hmac
from urllib.parse import urlencode

# Configuration
API_BASE_URL = "http://localhost:8001/api"
BOT_TOKEN = "your_bot_token_here"  # Replace with your actual bot token

def create_test_init_data(user_data: dict, bot_token: str) -> str:
    """
    Create a test initData string with valid signature.
    
    In production, this comes from Telegram. This is only for testing.
    """
    # Create data check string
    auth_date = int(datetime.now().timestamp())
    
    data_dict = {
        'auth_date': str(auth_date),
        'user': json.dumps(user_data, separators=(',', ':'))
    }
    
    # Sort and create data check string
    data_check_string = '\n'.join(f"{k}={v}" for k, v in sorted(data_dict.items()))
    
    # Create secret key
    secret_key = hmac.new(
        key=b"WebAppData",
        msg=bot_token.encode(),
        digestmod=hashlib.sha256
    ).digest()
    
    # Calculate hash
    hash_value = hmac.new(
        key=secret_key,
        msg=data_check_string.encode(),
        digestmod=hashlib.sha256
    ).hexdigest()
    
    # Create initData query string
    data_dict['hash'] = hash_value
    init_data = urlencode(data_dict)
    
    return init_data

def test_telegram_login():
    """Test the Telegram login endpoint."""
    
    print("=" * 60)
    print("Testing Telegram Mini App Authentication")
    print("=" * 60)
    
    # Check if bot token is set
    if BOT_TOKEN == "your_bot_token_here":
        print("\n❌ Error: Please set your BOT_TOKEN in this script")
        print("   Get it from @BotFather on Telegram")
        return False
    
    # Test user data
    test_user = {
        'id': 123456789,
        'first_name': 'Test',
        'last_name': 'User',
        'username': 'testuser',
        'language_code': 'fa',
    }
    
    print(f"\n📱 Creating test user data:")
    print(f"   User ID: {test_user['id']}")
    print(f"   Name: {test_user['first_name']} {test_user['last_name']}")
    print(f"   Username: @{test_user['username']}")
    
    # Create valid initData
    try:
        init_data = create_test_init_data(test_user, BOT_TOKEN)
        print(f"\n✓ Generated initData (length: {len(init_data)} chars)")
    except Exception as e:
        print(f"\n❌ Error generating initData: {e}")
        return False
    
    # Prepare request
    request_data = {
        'init_data': init_data,
        'init_data_unsafe': {
            'user': test_user,
            'auth_date': int(datetime.now().timestamp()),
        }
    }
    
    print(f"\n🔄 Sending request to {API_BASE_URL}/auth/telegram-login")
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/auth/telegram-login",
            json=request_data,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"\n📊 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("\n✅ Authentication Successful!")
            print(f"   Access Token: {data['access_token'][:50]}...")
            print(f"   Token Type: {data['token_type']}")
            
            # Try to fetch user profile with the token
            print("\n🔄 Fetching user profile...")
            profile_response = requests.get(
                f"{API_BASE_URL}/users/me",
                headers={'Authorization': f"Bearer {data['access_token']}"}
            )
            
            if profile_response.status_code == 200:
                profile = profile_response.json()
                print("\n✅ Profile Fetched Successfully!")
                print(f"   User ID: {profile.get('id')}")
                print(f"   Name: {profile.get('first_name')} {profile.get('last_name')}")
                print(f"   Telegram ID: {profile.get('telegram_id')}")
                print(f"   Phone: {profile.get('phone_number', 'Not set')}")
                print(f"   Coins: {profile.get('coins', 0)}")
                return True
            else:
                print(f"\n⚠️  Profile fetch failed: {profile_response.status_code}")
                print(f"   {profile_response.text}")
                return False
                
        else:
            print(f"\n❌ Authentication Failed")
            try:
                error_data = response.json()
                print(f"   Error: {error_data.get('detail', 'Unknown error')}")
            except:
                print(f"   Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"\n❌ Connection Error")
        print(f"   Make sure the backend server is running at {API_BASE_URL}")
        return False
    except Exception as e:
        print(f"\n❌ Unexpected Error: {e}")
        return False

def test_invalid_signature():
    """Test that invalid signatures are rejected."""
    print("\n" + "=" * 60)
    print("Testing Invalid Signature Rejection")
    print("=" * 60)
    
    # Create request with invalid signature
    request_data = {
        'init_data': 'user={"id":123}&auth_date=123456&hash=invalid_hash',
        'init_data_unsafe': {
            'user': {
                'id': 123,
                'first_name': 'Fake',
            }
        }
    }
    
    print(f"\n🔄 Sending request with invalid signature...")
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/auth/telegram-login",
            json=request_data,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 401:
            print("\n✅ Invalid signature correctly rejected")
            return True
        else:
            print(f"\n⚠️  Expected 401, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("\n🚀 Telegram Authentication Test Suite\n")
    
    # Test 1: Valid authentication
    test1_passed = test_telegram_login()
    
    # Test 2: Invalid signature rejection
    if test1_passed:
        test2_passed = test_invalid_signature()
    else:
        test2_passed = False
        print("\n⚠️  Skipping invalid signature test due to previous failure")
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print(f"✓ Valid Authentication: {'PASS' if test1_passed else 'FAIL'}")
    print(f"✓ Invalid Signature Rejection: {'PASS' if test2_passed else 'FAIL'}")
    print("=" * 60)
    
    if test1_passed and test2_passed:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed")
        sys.exit(1)

