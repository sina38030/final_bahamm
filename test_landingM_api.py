#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Test landingM APIs to debug missing basket data"""
import requests
import json
import sys
import io

# Fix encoding for Windows console
if sys.platform == 'win32':
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
    except:
        pass

def test_products_api():
    """Test the products API endpoint"""
    print("=" * 60)
    print("Testing /api/admin/products?order=landing")
    print("=" * 60)
    
    try:
        url = "http://localhost:8001/api/admin/products?order=landing"
        response = requests.get(url, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Content-Type: {response.headers.get('content-type', 'N/A')}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\nTotal products returned: {len(data) if isinstance(data, list) else 'N/A'}")
            
            if isinstance(data, list) and len(data) > 0:
                print("\nFirst product sample:")
                first = data[0]
                print(json.dumps(first, indent=2, ensure_ascii=False))
                
                # Check if required fields exist
                required_fields = ['id', 'name', 'base_price', 'market_price', 'solo_price', 
                                  'friend_1_price']
                missing_fields = [f for f in required_fields if f not in first]
                
                if missing_fields:
                    print(f"\n[WARNING] Missing fields: {missing_fields}")
                else:
                    print("\n[OK] All required fields present")
                    
                # Show products with prices
                print("\n" + "-" * 60)
                print("Products summary:")
                print("-" * 60)
                for i, prod in enumerate(data[:5], 1):  # Show first 5
                    name = prod.get('name', 'N/A')
                    solo = prod.get('solo_price', 0)
                    friend1 = prod.get('friend_1_price', 0)
                    print(f"{i}. {name}: Solo={solo}, Friend1={friend1}")
            else:
                print("\n[WARNING] No products returned!")
        else:
            print(f"\n[ERROR] HTTP {response.status_code}: {response.text[:500]}")
            
    except requests.exceptions.ConnectionError:
        print("\n[ERROR] Could not connect to backend (localhost:8001)")
        print("Make sure backend is running:")
        print("  cd backend")
        print("  python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload")
    except Exception as e:
        print(f"\n[ERROR] Exception: {e}")
        import traceback
        traceback.print_exc()


def test_group_invite_api(invite_code):
    """Test the group invite API endpoint"""
    print("\n" + "=" * 60)
    print(f"Testing /api/payment/group-invite/{invite_code}")
    print("=" * 60)
    
    try:
        url = f"http://localhost:8001/api/payment/group-invite/{invite_code}"
        response = requests.get(url, timeout=10)
        
        print(f"Status Code: {response.status_code}")
        print(f"Content-Type: {response.headers.get('content-type', 'N/A')}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\nResponse:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            
            # Check if required fields exist
            if data.get('success'):
                items = data.get('items', [])
                print(f"\n[INFO] Total items in basket: {len(items)}")
                
                if len(items) > 0:
                    print("\nFirst item sample:")
                    print(json.dumps(items[0], indent=2, ensure_ascii=False))
                    
                    # Show items summary
                    print("\n" + "-" * 60)
                    print("Basket items summary:")
                    print("-" * 60)
                    for i, item in enumerate(items, 1):
                        name = item.get('product_name') or item.get('name', 'N/A')
                        qty = item.get('quantity', 1)
                        price = item.get('price') or item.get('base_price', 0)
                        print(f"{i}. {name}: qty={qty}, price={price}")
                else:
                    print("\n[WARNING] No items in basket!")
            else:
                print("\n[WARNING] Response indicates failure")
        else:
            print(f"\n[ERROR] HTTP {response.status_code}: {response.text[:500]}")
            
    except requests.exceptions.ConnectionError:
        print("\n[ERROR] Could not connect to backend (localhost:8001)")
    except Exception as e:
        print(f"\n[ERROR] Exception: {e}")
        import traceback
        traceback.print_exc()


def check_backend():
    """Check if backend is running"""
    print("Checking backend status...")
    try:
        response = requests.get("http://localhost:8001/", timeout=5)
        print(f"[OK] Backend is running (status: {response.status_code})")
        return True
    except:
        print("[ERROR] Backend is not running on port 8001")
        return False


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("landingM API Test Tool")
    print("=" * 60 + "\n")
    
    # Check backend first
    if not check_backend():
        print("\nPlease start the backend server first:")
        print("  Option 1: run start_backend_test.bat")
        print("  Option 2: cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload")
        sys.exit(1)
    
    print()
    
    # Test products API
    test_products_api()
    
    # Test group invite API if invite code is provided
    if len(sys.argv) > 1:
        invite_code = sys.argv[1]
        test_group_invite_api(invite_code)
    else:
        print("\n\n" + "=" * 60)
        print("[INFO] To test group invite, provide invite code as argument:")
        print(f"  python {sys.argv[0]} <invite_code>")
        print("=" * 60)
