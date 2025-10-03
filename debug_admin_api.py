#!/usr/bin/env python3
"""
Debug script to test admin API calls exactly as the frontend does
"""

import requests
import json

# Same base URL as frontend
ADMIN_API_BASE_URL = "http://localhost:8001/api"

def test_dashboard():
    """Test dashboard API call"""
    url = f"{ADMIN_API_BASE_URL}/admin/dashboard"
    headers = {
        'Accept': 'application/json',
    }
    
    print(f"Testing: {url}")
    print(f"Headers: {headers}")
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Data: {json.dumps(data, indent=2)}")
        else:
            print(f"Error Response: {response.text}")
            
    except Exception as e:
        print(f"Exception: {e}")

def test_orders():
    """Test orders API call"""
    url = f"{ADMIN_API_BASE_URL}/admin/orders"
    headers = {
        'Accept': 'application/json',
    }
    
    print(f"\nTesting: {url}")
    print(f"Headers: {headers}")
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Orders count: {len(data)}")
            if data:
                print(f"First order: {json.dumps(data[0], indent=2)}")
        else:
            print(f"Error Response: {response.text}")
            
    except Exception as e:
        print(f"Exception: {e}")

def test_products():
    """Test products API call"""
    url = f"{ADMIN_API_BASE_URL}/admin/products"
    headers = {
        'Accept': 'application/json',
    }
    
    print(f"\nTesting: {url}")
    print(f"Headers: {headers}")
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Products count: {len(data)}")
            if data:
                print(f"First product: {json.dumps(data[0], indent=2)}")
        else:
            print(f"Error Response: {response.text}")
            
    except Exception as e:
        print(f"Exception: {e}")

def main():
    print("🔍 Debug Admin API Calls")
    print("=" * 50)
    
    test_dashboard()
    test_orders()
    test_products()
    
    print("\n" + "=" * 50)
    print("✅ Debug complete!")
    print("If all calls work here but frontend shows loading,")
    print("check browser dev tools for CORS or network errors.")

if __name__ == "__main__":
    main() 