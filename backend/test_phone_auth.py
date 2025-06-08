#!/usr/bin/env python3
import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_phone_authentication():
    # Phone number to test with
    phone_number = "+12345678901"
    
    # Step 1: Send verification code
    print(f"Step 1: Sending verification code to {phone_number}")
    response = requests.post(
        f"{BASE_URL}/auth/send-verification",
        json={"phone_number": phone_number, "user_type": "CUSTOMER"}
    )
    
    if response.status_code == 200:
        print("✅ Verification code sent successfully")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    else:
        print(f"❌ Error sending verification code: {response.status_code}")
        print(f"Response: {response.text}")
        return
    
    # Wait for user to input verification code
    verification_code = input("Enter the verification code from the server console: ")
    
    # Step 2: Verify the code
    print(f"\nStep 2: Verifying code {verification_code}")
    response = requests.post(
        f"{BASE_URL}/auth/verify",
        json={"phone_number": phone_number, "verification_code": verification_code}
    )
    
    if response.status_code == 200:
        print("✅ Verification successful")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        token = response.json().get("access_token")
    else:
        print(f"❌ Error verifying code: {response.status_code}")
        print(f"Response: {response.text}")
        return
    
    # Step 3: Complete profile
    print("\nStep 3: Completing user profile")
    response = requests.post(
        f"{BASE_URL}/auth/complete-profile",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "username": "testuser",
            "phone_number": phone_number,
            "email": "test@example.com",
            "user_type": "CUSTOMER"
        }
    )
    
    if response.status_code == 200:
        print("✅ Profile completed successfully")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    else:
        print(f"❌ Error completing profile: {response.status_code}")
        print(f"Response: {response.text}")

if __name__ == "__main__":
    test_phone_authentication() 