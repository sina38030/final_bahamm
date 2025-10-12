#!/usr/bin/env python3
"""
تست نمایش موجودی در پروفایل کاربر
"""
import requests

BASE_URL = "http://127.0.0.1:8001/api"

def test_user_profile(user_id):
    """بررسی پروفایل کاربر"""
    print(f"\n📱 بررسی پروفایل کاربر {user_id}...")
    response = requests.get(f"{BASE_URL}/users/{user_id}")
    
    if response.status_code == 200:
        user = response.json()
        print(f"✅ پروفایل کاربر:")
        print(f"   ID: {user.get('id')}")
        print(f"   نام: {user.get('first_name')} {user.get('last_name')}")
        print(f"   تلفن: {user.get('phone_number')}")
        print(f"   💰 موجودی: {user.get('coins', 0)} تومان")
        return user
    else:
        print(f"❌ خطا: {response.text}")
        return None

def test_me_endpoint_with_phone(phone_number):
    """تست endpoint /auth/me با شماره تلفن مشخص"""
    print(f"\n🔐 بررسی اطلاعات کاربر با تلفن {phone_number}...")
    
    # ابتدا باید لیست کاربران را بگیریم و user_id را پیدا کنیم
    response = requests.get(f"{BASE_URL}/admin/users")
    if response.status_code == 200:
        users = response.json()
        user = next((u for u in users if u.get('phone_number') == phone_number), None)
        if user:
            print(f"✅ کاربر پیدا شد:")
            print(f"   ID: {user.get('id')}")
            print(f"   💰 موجودی: {user.get('coins', 0)} تومان")
            return user
        else:
            print(f"❌ کاربر با شماره {phone_number} یافت نشد")
    return None

if __name__ == "__main__":
    print("=" * 60)
    print("🧪 تست نمایش موجودی در پروفایل کاربر")
    print("=" * 60)
    
    # 1. کاربر 1 را تست کن (که موجودیش را تغییر دادیم)
    user = test_user_profile(1)
    
    # 2. لیست همه کاربران با موجودی
    print("\n" + "=" * 60)
    print("📋 لیست کاربران با موجودی:")
    print("=" * 60)
    response = requests.get(f"{BASE_URL}/admin/users")
    if response.status_code == 200:
        users = response.json()
        users_with_coins = [u for u in users if u.get('coins', 0) > 0]
        
        if users_with_coins:
            print(f"\n✅ {len(users_with_coins)} کاربر با موجودی بیشتر از صفر:")
            for u in users_with_coins[:10]:  # فقط 10 تای اول
                print(f"   ID: {u['id']} | تلفن: {u.get('phone_number', 'N/A')} | موجودی: {u.get('coins', 0):,} تومان")
        else:
            print("\n⚠️ هیچ کاربری با موجودی بیشتر از صفر پیدا نشد!")
    
    # 3. تست با یک شماره تلفن خاص
    print("\n" + "=" * 60)
    print("🔍 شما با کدام شماره تلفن لاگین کرده‌اید؟")
    print("=" * 60)
    print("برای تست، شماره تلفن کاربر را وارد کنید:")
    print("مثال: 09123456789")
    print("\nیا Enter بزنید برای رد شدن...")
    
    try:
        phone = input("شماره تلفن: ").strip()
        if phone:
            test_me_endpoint_with_phone(phone)
    except:
        pass

