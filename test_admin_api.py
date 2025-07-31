#!/usr/bin/env python3
"""
Test script to verify admin API endpoints
"""
import requests
import json
from time import sleep

def test_admin_endpoints():
    base_url = "http://localhost:8001/api/admin"
    
    # Wait for server to be ready
    print("Waiting for server to start...")
    sleep(3)
    
    # Test endpoints
    endpoints = [
        ("Dashboard", "/dashboard"),
        ("Categories", "/categories"),
        ("Products", "/products"),
        ("Orders", "/orders"),
        ("Users", "/users"),
        ("Group Buys", "/group-buys")
    ]
    
    print("Testing Admin API Endpoints:")
    print("=" * 40)
    
    for name, endpoint in endpoints:
        try:
            response = requests.get(f"{base_url}{endpoint}", timeout=5)
            if response.status_code == 200:
                data = response.json()
                print(f"✓ {name}: OK (Status: {response.status_code})")
                if isinstance(data, list):
                    print(f"  - Returned {len(data)} items")
                elif isinstance(data, dict):
                    print(f"  - Returned object with {len(data)} keys")
            else:
                print(f"✗ {name}: ERROR (Status: {response.status_code})")
        except requests.exceptions.RequestException as e:
            print(f"✗ {name}: CONNECTION ERROR - {e}")
        except json.JSONDecodeError:
            print(f"✗ {name}: JSON DECODE ERROR")
    
    print("\n" + "=" * 40)
    print("Test completed!")

if __name__ == "__main__":
    test_admin_endpoints() 