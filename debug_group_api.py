"""
اسکریپت Debug برای بررسی مشکل نمایش اطلاعات گروه خرید
"""
import requests
import json
from datetime import datetime

# تنظیمات
BACKEND_URL = "http://localhost:8001"
FRONTEND_URL = "http://localhost:3000"

def check_backend_group_buys():
    """چک کردن لیست گروه‌های خرید از بک‌اند"""
    print("\n" + "="*80)
    print("بررسی لیست گروه‌های خرید از بک‌اند")
    print("="*80)
    
    try:
        url = f"{BACKEND_URL}/api/admin/group-buys?limit=5"
        print(f"\n📡 URL: {url}")
        response = requests.get(url, timeout=10)
        print(f"✅ Status: {response.status_code}")
        
        if response.ok:
            data = response.json()
            print(f"\n📊 تعداد گروه‌ها: {len(data)}")
            
            for i, group in enumerate(data[:3], 1):
                print(f"\n--- گروه {i} ---")
                print(f"ID: {group.get('id')}")
                print(f"کد دعوت: {group.get('invite_code', 'ندارد')}")
                print(f"وضعیت: {group.get('status')}")
                print(f"تعداد شرکت‌کنندگان: {group.get('participants_count')}")
                print(f"زمان ساخت: {group.get('created_at')}")
                print(f"زمان انقضا: {group.get('expires_at')}")
                
                basket = group.get('basket', [])
                print(f"تعداد آیتم‌های سبد: {len(basket)}")
                if basket:
                    print("📦 آیتم‌های سبد:")
                    for item in basket[:2]:
                        print(f"  - {item.get('product_name', 'نام نامشخص')}: {item.get('quantity')} عدد")
                else:
                    print("⚠️ سبد خالی است!")
        else:
            print(f"❌ خطا: {response.text}")
    except Exception as e:
        print(f"❌ خطا در اتصال: {e}")


def check_backend_group_details(group_id):
    """چک کردن جزئیات یک گروه خاص"""
    print("\n" + "="*80)
    print(f"بررسی جزئیات گروه {group_id} از بک‌اند")
    print("="*80)
    
    try:
        url = f"{BACKEND_URL}/api/admin/group-buys/{group_id}"
        print(f"\n📡 URL: {url}")
        response = requests.get(url, timeout=10)
        print(f"✅ Status: {response.status_code}")
        
        if response.ok:
            data = response.json()
            print(f"\n📊 اطلاعات گروه:")
            print(f"ID: {data.get('id')}")
            print(f"لیدر: {data.get('leader_name')} ({data.get('leader_phone')})")
            print(f"کد دعوت: {data.get('invite_token')}")
            print(f"وضعیت: {data.get('status')}")
            print(f"تعداد شرکت‌کنندگان: {data.get('participants_count')}")
            print(f"زمان ساخت: {data.get('created_at')}")
            print(f"زمان پرداخت لیدر: {data.get('leader_paid_at')}")
            print(f"زمان انقضا: {data.get('expires_at')}")
            
            basket_snapshot = data.get('basket_snapshot')
            if basket_snapshot:
                print("\n📦 محتوای basket_snapshot:")
                try:
                    if isinstance(basket_snapshot, str):
                        basket_data = json.loads(basket_snapshot)
                    else:
                        basket_data = basket_snapshot
                    print(json.dumps(basket_data, indent=2, ensure_ascii=False))
                except:
                    print(basket_snapshot)
            else:
                print("\n⚠️ basket_snapshot خالی است!")
            
            participants = data.get('participants', [])
            print(f"\n👥 شرکت‌کنندگان ({len(participants)}):")
            for p in participants:
                status_emoji = "✅" if p.get('paid_at') else "⏳"
                leader_mark = "👑" if p.get('is_leader') else ""
                print(f"  {status_emoji} {leader_mark} {p.get('user_name')} - {p.get('user_phone')}")
        else:
            print(f"❌ خطا: {response.text}")
    except Exception as e:
        print(f"❌ خطا در اتصال: {e}")


def check_frontend_api_groups(invite_code):
    """چک کردن API فرانت‌اند برای اطلاعات گروه"""
    print("\n" + "="*80)
    print(f"بررسی API فرانت‌اند برای کد دعوت: {invite_code}")
    print("="*80)
    
    try:
        url = f"{FRONTEND_URL}/api/groups/{invite_code}"
        print(f"\n📡 URL: {url}")
        response = requests.get(url, timeout=10)
        print(f"✅ Status: {response.status_code}")
        
        if response.ok:
            data = response.json()
            print(f"\n📊 اطلاعات گروه:")
            print(f"ID: {data.get('id')}")
            print(f"لیدر: {data.get('leader', {}).get('username')}")
            print(f"وضعیت: {data.get('status')}")
            
            # بررسی زمان‌بندی
            print(f"\n⏰ اطلاعات زمان:")
            print(f"startedAtMs: {data.get('startedAtMs')}")
            print(f"expiresAtMs: {data.get('expiresAtMs')}")
            print(f"remainingSeconds: {data.get('remainingSeconds')}")
            print(f"serverNowMs: {data.get('serverNowMs')}")
            
            if data.get('expiresAtMs'):
                now_ms = data.get('serverNowMs', datetime.now().timestamp() * 1000)
                remaining = (data.get('expiresAtMs') - now_ms) / 1000
                print(f"زمان باقیمانده محاسبه شده: {remaining:.0f} ثانیه ({remaining/3600:.1f} ساعت)")
            else:
                print("⚠️ expiresAtMs وجود ندارد!")
            
            # بررسی سبد
            basket = data.get('basket', [])
            print(f"\n📦 سبد خرید ({len(basket)} آیتم):")
            if basket:
                for item in basket[:3]:
                    print(f"  - {item.get('name')}: {item.get('qty')} x {item.get('unitPrice')} تومان")
            else:
                print("⚠️ سبد خالی است!")
            
            # بررسی قیمت‌ها
            pricing = data.get('pricing', {})
            print(f"\n💰 قیمت‌ها:")
            print(f"  قیمت اصلی: {pricing.get('originalTotal', 0):,} تومان")
            print(f"  قیمت فعلی: {pricing.get('currentTotal', 0):,} تومان")
            
            # بررسی شرکت‌کنندگان
            participants = data.get('participants', [])
            print(f"\n👥 شرکت‌کنندگان ({len(participants)}):")
            for p in participants[:5]:
                leader_mark = "👑" if p.get('isLeader') else ""
                paid_mark = "✅" if p.get('paid') else "⏳"
                print(f"  {paid_mark} {leader_mark} {p.get('username')}")
        else:
            print(f"❌ خطا: {response.text}")
    except Exception as e:
        print(f"❌ خطا در اتصال: {e}")


def check_group_invite_api(invite_code):
    """چک کردن API group-invite"""
    print("\n" + "="*80)
    print(f"بررسی API group-invite برای کد: {invite_code}")
    print("="*80)
    
    try:
        url = f"{BACKEND_URL}/api/payment/group-invite/{invite_code}"
        print(f"\n📡 URL: {url}")
        response = requests.get(url, timeout=10)
        print(f"✅ Status: {response.status_code}")
        
        if response.ok:
            data = response.json()
            print(f"\n📊 اطلاعات دعوت:")
            print(f"موفق: {data.get('success')}")
            print(f"کد دعوت: {data.get('invite_code')}")
            print(f"لیدر: {data.get('leader_name')} ({data.get('leader_phone')})")
            print(f"اجازه ترکیب: {data.get('allow_consolidation')}")
            
            items = data.get('items', [])
            print(f"\n📦 آیتم‌ها ({len(items)}):")
            if items:
                for item in items:
                    print(f"  - {item.get('product_name')}: {item.get('quantity')} x {item.get('price')} تومان")
            else:
                print("⚠️ هیچ آیتمی وجود ندارد!")
        else:
            print(f"❌ خطا: {response.text}")
    except Exception as e:
        print(f"❌ خطا در اتصال: {e}")


def main():
    """اجرای تست‌ها"""
    print("\n🔍 شروع تست API های گروه خرید")
    print("="*80)
    
    # 1. لیست گروه‌ها از بک‌اند
    check_backend_group_buys()
    
    # 2. انتخاب یک گروه برای تست دقیق‌تر
    try:
        group_id_input = input("\n\n💡 لطفا ID یک گروه را وارد کنید (یا Enter برای 140): ").strip()
        group_id = int(group_id_input) if group_id_input else 140
        
        # 3. جزئیات گروه از بک‌اند
        check_backend_group_details(group_id)
        
        # 4. دریافت کد دعوت
        invite_code_input = input("\n\n💡 لطفا کد دعوت را وارد کنید (یا Enter برای استفاده از group_id): ").strip()
        invite_code = invite_code_input if invite_code_input else str(group_id)
        
        # 5. API group-invite
        check_group_invite_api(invite_code)
        
        # 6. API فرانت‌اند
        check_frontend_api_groups(invite_code)
        
    except Exception as e:
        print(f"\n❌ خطا: {e}")
    
    print("\n\n" + "="*80)
    print("✅ تست‌ها تمام شد")
    print("="*80)


if __name__ == "__main__":
    main()

