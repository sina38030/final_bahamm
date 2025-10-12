#!/usr/bin/env python3
"""
تست API افزودن موجودی کاربران
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8001/api"

def test_list_users():
    """لیست کاربران را بگیر"""
    print("\n🔍 گرفتن لیست کاربران...")
    response = requests.get(f"{BASE_URL}/admin/users")
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        users = response.json()
        print(f"✅ تعداد کاربران: {len(users)}")
        if users:
            user = users[0]
            print(f"\n👤 کاربر اول:")
            print(f"   ID: {user.get('id')}")
            print(f"   نام: {user.get('first_name')} {user.get('last_name')}")
            print(f"   تلفن: {user.get('phone_number')}")
            print(f"   موجودی فعلی: {user.get('coins', 0)} تومان")
            return user
    else:
        print(f"❌ خطا: {response.text}")
    return None

def test_set_coins(user_id, amount):
    """تنظیم موجودی دقیق"""
    print(f"\n💰 تنظیم موجودی کاربر {user_id} به {amount} تومان...")
    response = requests.put(
        f"{BASE_URL}/admin/users/{user_id}/coins",
        json={"coins": amount},
        headers={"Content-Type": "application/json"}
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ موجودی به‌روز شد: {result.get('coins')} تومان")
        return True
    else:
        print(f"❌ خطا در تنظیم موجودی")
        return False

def test_adjust_coins(user_id, delta):
    """افزایش/کاهش موجودی"""
    print(f"\n➕ افزودن {delta} تومان به موجودی کاربر {user_id}...")
    response = requests.post(
        f"{BASE_URL}/admin/users/{user_id}/coins/adjust",
        json={"delta": delta},
        headers={"Content-Type": "application/json"}
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ موجودی به‌روز شد: {result.get('coins')} تومان")
        return True
    else:
        print(f"❌ خطا در تغییر موجودی")
        return False

def verify_user_coins(user_id):
    """بررسی موجودی نهایی کاربر"""
    print(f"\n🔎 بررسی موجودی نهایی کاربر {user_id}...")
    response = requests.get(f"{BASE_URL}/admin/users")
    
    if response.status_code == 200:
        users = response.json()
        user = next((u for u in users if u['id'] == user_id), None)
        if user:
            print(f"✅ موجودی نهایی: {user.get('coins', 0)} تومان")
            return user.get('coins', 0)
    
    print(f"❌ خطا در بررسی موجودی")
    return None

if __name__ == "__main__":
    print("=" * 60)
    print("🧪 تست API مدیریت موجودی کاربران")
    print("=" * 60)
    
    # 1. لیست کاربران را بگیر
    user = test_list_users()
    
    if not user:
        print("\n❌ کاربری یافت نشد!")
        exit(1)
    
    user_id = user['id']
    initial_coins = user.get('coins', 0)
    
    # 2. موجودی را به 100000 تنظیم کن
    print("\n" + "=" * 60)
    print("تست 1: تنظیم موجودی به 100000 تومان")
    print("=" * 60)
    test_set_coins(user_id, 100000)
    coins_after_set = verify_user_coins(user_id)
    
    # 3. 50000 تومان اضافه کن
    print("\n" + "=" * 60)
    print("تست 2: اضافه کردن 50000 تومان")
    print("=" * 60)
    test_adjust_coins(user_id, 50000)
    coins_after_adjust = verify_user_coins(user_id)
    
    # 4. نتیجه نهایی
    print("\n" + "=" * 60)
    print("📊 نتیجه نهایی")
    print("=" * 60)
    print(f"موجودی اولیه: {initial_coins} تومان")
    print(f"بعد از set(100000): {coins_after_set} تومان")
    print(f"بعد از adjust(+50000): {coins_after_adjust} تومان")
    
    if coins_after_adjust == 150000:
        print("\n✅ همه تست‌ها موفق بودند!")
    else:
        print(f"\n❌ مشکل! انتظار 150000 بود، ولی {coins_after_adjust} شد")

