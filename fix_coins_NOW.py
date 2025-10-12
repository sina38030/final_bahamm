#!/usr/bin/env python3
"""
حل فوری مشکل موجودی - بدون پیچیدگی
"""
import requests
import sys

BASE_URL = "http://127.0.0.1:8001/api"

def fix_coins_for_phone(phone_number, amount=100000):
    """موجودی را برای یک شماره تلفن مشخص تنظیم کن"""
    
    print("=" * 60)
    print(f"🔧 تنظیم موجودی برای شماره {phone_number}")
    print("=" * 60)
    
    # 1. پیدا کردن کاربر
    response = requests.get(f"{BASE_URL}/admin/users")
    if response.status_code != 200:
        print(f"❌ خطا در دریافت لیست کاربران: {response.status_code}")
        return False
    
    users = response.json()
    user = next((u for u in users if u.get('phone_number') == phone_number), None)
    
    if not user:
        print(f"❌ کاربر با شماره {phone_number} یافت نشد!")
        print(f"\n📋 کاربران موجود:")
        for u in users[:10]:
            print(f"   - {u.get('phone_number')} (ID: {u['id']}, موجودی: {u.get('coins', 0)})")
        return False
    
    print(f"✅ کاربر پیدا شد:")
    print(f"   ID: {user['id']}")
    print(f"   نام: {user.get('first_name')} {user.get('last_name')}")
    print(f"   موجودی فعلی: {user.get('coins', 0):,} تومان")
    
    # 2. تنظیم موجودی
    print(f"\n💰 تنظیم موجودی به {amount:,} تومان...")
    response = requests.put(
        f"{BASE_URL}/admin/users/{user['id']}/coins",
        json={"coins": amount},
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code != 200:
        print(f"❌ خطا در تنظیم موجودی: {response.status_code}")
        print(response.text)
        return False
    
    result = response.json()
    print(f"✅ موجودی در دیتابیس تنظیم شد: {result.get('coins'):,} تومان")
    
    # 3. تایید نهایی
    print(f"\n🔍 تایید نهایی...")
    response = requests.get(f"{BASE_URL}/admin/users")
    users = response.json()
    user = next((u for u in users if u['id'] == user['id']), None)
    
    if user:
        print(f"✅ موجودی در دیتابیس: {user.get('coins', 0):,} تومان")
    
    print("\n" + "=" * 60)
    print("✅ موجودی در Backend تنظیم شد!")
    print("=" * 60)
    
    print("\n📱 حالا این کارها را انجام دهید:")
    print("1. به مرورگر بروید")
    print("2. F12 را بزنید → Console")
    print("3. این کد را Copy/Paste کنید:")
    print("\n" + "-" * 60)
    print("localStorage.clear(); alert('حالا دوباره لاگین کنید!');")
    print("-" * 60)
    print("\n4. با این شماره دوباره لاگین کنید:")
    print(f"   📞 {phone_number}")
    print("\n5. به /profile/wallet بروید")
    print(f"6. باید {amount:,} تومان را ببینید ✅")
    
    return True

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 حل فوری مشکل موجودی")
    print("=" * 60)
    
    # اگر argument داده شده
    if len(sys.argv) > 1:
        phone = sys.argv[1]
        amount = int(sys.argv[2]) if len(sys.argv) > 2 else 100000
        fix_coins_for_phone(phone, amount)
    else:
        # لیست کاربران موجود
        print("\n📋 لیست کاربران موجود:\n")
        response = requests.get(f"{BASE_URL}/admin/users")
        if response.status_code == 200:
            users = response.json()
            for i, u in enumerate(users[:20], 1):
                coins = u.get('coins', 0)
                name = f"{u.get('first_name', '')} {u.get('last_name', '')}".strip() or "بدون نام"
                print(f"{i:2}. {u.get('phone_number'):15} | موجودی: {coins:>10,} | {name}")
        
        print("\n" + "=" * 60)
        print("💡 نحوه استفاده:")
        print("=" * 60)
        print("\n1. شماره تلفنی که الان باهاش لاگین کرده‌اید را وارد کنید:")
        print("   python fix_coins_NOW.py 09123456789")
        print("\n2. یا با مقدار دلخواه:")
        print("   python fix_coins_NOW.py 09123456789 500000")
        print("\n" + "=" * 60)
        
        # سوال از کاربر
        print("\n❓ با کدام شماره لاگین کرده‌اید؟")
        try:
            phone = input("شماره تلفن: ").strip()
            if phone:
                print("\n❓ چقدر موجودی می‌خواهید؟ (Enter = 100000)")
                amount_input = input("مقدار (تومان): ").strip()
                amount = int(amount_input) if amount_input else 100000
                
                fix_coins_for_phone(phone, amount)
        except KeyboardInterrupt:
            print("\n\n❌ لغو شد")
        except Exception as e:
            print(f"\n❌ خطا: {e}")

