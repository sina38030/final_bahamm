import requests
import json

phone = "09436466464"

print("=" * 60)
print("🔍 بررسی دقیق موجودی کاربر")
print("=" * 60)

# بررسی از admin API
print("\n1️⃣ بررسی موجودی در دیتابیس (از admin API):")
r = requests.get("http://127.0.0.1:8001/api/admin/users")
if r.status_code == 200:
    users = r.json()
    user = next((u for u in users if u.get('phone_number') == phone), None)
    if user:
        print(f"✅ کاربر پیدا شد:")
        print(f"   ID: {user['id']}")
        print(f"   💰 موجودی در دیتابیس: {user.get('coins', 0):,} تومان")
        user_id = user['id']
        db_coins = user.get('coins', 0)
    else:
        print(f"❌ کاربر با شماره {phone} یافت نشد!")
        exit(1)
else:
    print(f"❌ خطا در دریافت لیست کاربران")
    exit(1)

# لاگین کردن و گرفتن token
print("\n2️⃣ لاگین با شماره تلفن و گرفتن token:")
r = requests.post(
    "http://127.0.0.1:8001/api/auth/simple-register",
    data={"phone_number": phone}
)

if r.status_code == 200:
    token_data = r.json()
    token = token_data.get('access_token')
    print(f"✅ Token دریافت شد")
else:
    print(f"❌ خطا در لاگین: {r.text}")
    exit(1)

# چک کردن /users/me
print("\n3️⃣ بررسی /users/me (اطلاعات کاربر):")
r = requests.get(
    "http://127.0.0.1:8001/api/users/me",
    headers={"Authorization": f"Bearer {token}"}
)

if r.status_code == 200:
    user_data = r.json()
    api_coins = user_data.get('coins', 0)
    print(f"✅ Response دریافت شد:")
    print(f"   💰 موجودی در /users/me: {api_coins:,} تومان")
    
    if api_coins == db_coins:
        print(f"   ✅ موجودی با دیتابیس مطابقت دارد")
    else:
        print(f"   ⚠️ موجودی با دیتابیس مطابقت ندارد!")
        print(f"   انتظار: {db_coins:,} | واقعی: {api_coins:,}")
else:
    print(f"❌ خطا: {r.text}")

# چک کردن /users/coins
print("\n4️⃣ بررسی /users/coins (endpoint موجودی):")
r = requests.get(
    "http://127.0.0.1:8001/api/users/coins",
    headers={"Authorization": f"Bearer {token}"}
)

if r.status_code == 200:
    coins_data = r.json()
    coins = coins_data.get('coins', 0)
    print(f"✅ Response دریافت شد:")
    print(f"   💰 موجودی: {coins:,} تومان")
else:
    print(f"❌ خطا: {r.text}")

print("\n" + "=" * 60)
print("📋 خلاصه:")
print("=" * 60)
print(f"💰 موجودی در دیتابیس: {db_coins:,} تومان")
print(f"💰 موجودی در /users/me: {api_coins:,} تومان")
print(f"💰 موجودی در /users/coins: {coins:,} تومان")

if db_coins > 0 and api_coins > 0:
    print("\n✅ Backend کار می‌کند!")
    print("\n⚠️ مشکل در Frontend است:")
    print("   1. Ctrl+Shift+I یا F12 را بزنید")
    print("   2. Application/Storage → Local Storage را باز کنید")
    print("   3. همه itemها را پاک کنید")
    print("   4. صفحه را ببندید و دوباره باز کنید")
    print("   5. دوباره با این شماره لاگین کنید: " + phone)
elif db_coins == 0:
    print("\n❌ موجودی در دیتابیس هم صفر است!")
    print("   دوباره تنظیم می‌کنم...")
    r = requests.put(
        f"http://127.0.0.1:8001/api/admin/users/{user_id}/coins",
        json={"coins": 100000}
    )
    if r.status_code == 200:
        print("   ✅ موجودی به 100,000 تنظیم شد. دوباره تست کنید.")

