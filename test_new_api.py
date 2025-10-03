#!/usr/bin/env python3
"""
تست API جدید برای تشخیص رهبر و دریافت گروه‌ها و سفارش‌ها
"""

import requests
import json

# تنظیمات
BASE_URL = "http://127.0.0.1:8001"
API_URL = f"{BASE_URL}/api/group-orders/my-groups-and-orders"

def test_api():
    """تست API جدید"""
    print("🔍 Testing new unified API...")
    
    # شما باید توکن معتبر کاربری که گروه ایجاد کرده را اینجا قرار دهید
    # این توکن را می‌توانید از localStorage مرورگر کپی کنید
    token = "YOUR_AUTH_TOKEN_HERE"  # جایگزین کنید
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(API_URL, headers=headers)
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ API Response:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            
            # تحلیل نتایج
            groups = data.get('groups', [])
            orders = data.get('orders', [])
            has_leader_groups = data.get('has_leader_groups', False)
            
            print(f"\n📋 Summary:")
            print(f"  Groups: {len(groups)}")
            print(f"  Orders: {len(orders)}")
            print(f"  Has Leader Groups: {has_leader_groups}")
            
            # بررسی سفارشات رهبر
            leader_orders = [o for o in orders if o.get('is_leader_order')]
            print(f"  Leader Orders: {len(leader_orders)}")
            
            for order in leader_orders:
                print(f"    Order {order['id']}: Group {order.get('group_order_id')} - Status: {order.get('group_status')}")
                
        else:
            print(f"❌ API Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Request failed: {e}")

def test_old_apis():
    """مقایسه با API‌های قدیمی"""
    print("\n🔄 Comparing with old APIs...")
    
    token = "YOUR_AUTH_TOKEN_HERE"  # همان توکن
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # تست API گروه‌ها
    try:
        groups_response = requests.get(f"{BASE_URL}/api/group-orders/my-groups", headers=headers)
        if groups_response.status_code == 200:
            groups_data = groups_response.json()
            print(f"📁 Old Groups API: {len(groups_data)} groups")
        else:
            print(f"❌ Old Groups API failed: {groups_response.status_code}")
    except Exception as e:
        print(f"❌ Old Groups API error: {e}")
    
    # تست API سفارشات
    try:
        orders_response = requests.get(f"{BASE_URL}/api/payment/orders", headers=headers)
        if orders_response.status_code == 200:
            orders_data = orders_response.json()
            orders_list = orders_data.get('orders', [])
            print(f"📦 Old Orders API: {len(orders_list)} orders")
            
            # بررسی فیلدهای جدید
            for order in orders_list[:3]:  # فقط 3 تای اول
                has_leader_field = 'is_leader_order' in order
                has_group_status = 'group_status' in order
                print(f"    Order {order['id']}: has_leader_field={has_leader_field}, has_group_status={has_group_status}")
        else:
            print(f"❌ Old Orders API failed: {orders_response.status_code}")
    except Exception as e:
        print(f"❌ Old Orders API error: {e}")

if __name__ == "__main__":
    print("🚀 Testing Leader Detection Fix")
    print("=" * 50)
    
    print("\n⚠️  IMPORTANT: Please replace 'YOUR_AUTH_TOKEN_HERE' with a valid token")
    print("You can get this from browser localStorage after logging in")
    print("=" * 50)
    
    test_api()
    test_old_apis()
    
    print("\n" + "=" * 50)
    print("✅ Test completed!")
    print("\nNext steps:")
    print("1. Replace the token in this file with a real one")
    print("2. Run: python test_new_api.py")
    print("3. Check if leader detection works correctly")
