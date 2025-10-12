#!/usr/bin/env python3
"""
تست endpoint /users/me برای بررسی coins
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8001/api"

def test_auth_and_me():
    """تست لاگین و دریافت اطلاعات کاربر"""
    
    # ابتدا کاربر 1 را بگیر که موجودی 150000 دارد
    print("\n" + "=" * 60)
    print("1️⃣ گرفتن اطلاعات کاربر از admin API")
    print("=" * 60)
    
    response = requests.get(f"{BASE_URL}/admin/users")
    users = response.json()
    test_user = next((u for u in users if u['id'] == 1), None)
    
    if not test_user:
        print("❌ کاربر ID=1 یافت نشد")
        return
    
    print(f"✅ کاربر پیدا شد:")
    print(f"   ID: {test_user['id']}")
    print(f"   تلفن: {test_user['phone_number']}")
    print(f"   💰 موجودی (از admin API): {test_user.get('coins', 0):,} تومان")
    
    # حالا با simple-register یک token بگیر
    print("\n" + "=" * 60)
    print("2️⃣ لاگین با simple-register")
    print("=" * 60)
    
    response = requests.post(
        f"{BASE_URL}/auth/simple-register",
        data={"phone_number": test_user['phone_number']}
    )
    
    if response.status_code != 200:
        print(f"❌ خطا در لاگین: {response.text}")
        return
    
    auth_data = response.json()
    token = auth_data.get('access_token')
    print(f"✅ Token دریافت شد")
    
    # حالا با token، endpoint /users/me را تست کن
    print("\n" + "=" * 60)
    print("3️⃣ تست endpoint /users/me")
    print("=" * 60)
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/users/me", headers=headers)
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        user_data = response.json()
        print(f"✅ Response دریافت شد:")
        print(json.dumps(user_data, indent=2, ensure_ascii=False))
        
        coins = user_data.get('coins')
        if coins is not None:
            print(f"\n💰 موجودی در /users/me: {coins:,} تومان")
            if coins == test_user.get('coins', 0):
                print("✅ موجودی صحیح است!")
            else:
                print(f"⚠️ موجودی مطابقت ندارد! انتظار {test_user.get('coins', 0):,} بود")
        else:
            print("\n❌ فیلد 'coins' در response وجود ندارد!")
            print("موجود fields:", list(user_data.keys()))
    else:
        print(f"❌ خطا: {response.text}")
    
    # تست endpoint /users/coins
    print("\n" + "=" * 60)
    print("4️⃣ تست endpoint /users/coins")
    print("=" * 60)
    
    response = requests.get(f"{BASE_URL}/users/coins", headers=headers)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        coins_data = response.json()
        print(f"✅ Response: {json.dumps(coins_data, indent=2, ensure_ascii=False)}")
    else:
        print(f"❌ خطا: {response.text}")

if __name__ == "__main__":
    print("=" * 60)
    print("🧪 تست endpoint /users/me برای بررسی coins")
    print("=" * 60)
    
    test_auth_and_me()
    
    print("\n" + "=" * 60)
    print("✅ تست تمام شد")
    print("=" * 60)

