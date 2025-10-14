"""
اسکریپت برای پر کردن basket_snapshot برای گروه‌های قدیمی
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database import get_db, engine
from app.models import GroupOrder, Order, OrderItem, Product, ProductImage
import json
from datetime import datetime, timedelta, timezone

# Tehran timezone: UTC+3:30
TEHRAN_TZ = timezone(timedelta(hours=3, minutes=30))

def fix_group_basket_snapshots():
    """پر کردن basket_snapshot برای گروه‌هایی که این فیلد را ندارند"""
    db: Session = next(get_db())
    
    try:
        print("\n🔍 جستجوی گروه‌های فاقد basket_snapshot...")
        
        # پیدا کردن گروه‌هایی که basket_snapshot ندارند یا خالی است
        groups = db.query(GroupOrder).filter(
            (GroupOrder.basket_snapshot == None) | 
            (GroupOrder.basket_snapshot == '') | 
            (GroupOrder.basket_snapshot == '[]') |
            (GroupOrder.basket_snapshot == '{}')
        ).all()
        
        print(f"✅ {len(groups)} گروه پیدا شد که نیاز به بروزرسانی دارند\n")
        
        fixed_count = 0
        skipped_count = 0
        
        for group in groups:
            print(f"\n--- پردازش گروه {group.id} ---")
            
            # پیدا کردن order های این گروه
            orders = db.query(Order).filter(
                Order.group_order_id == group.id,
                Order.is_settlement_payment == False
            ).order_by(Order.created_at).all()
            
            if not orders:
                print(f"⚠️  گروه {group.id}: هیچ سفارشی یافت نشد")
                skipped_count += 1
                continue
            
            # اولین سفارش (لیدر) را انتخاب می‌کنیم
            leader_order = orders[0]
            print(f"📦 سفارش لیدر: {leader_order.id}")
            
            # گرفتن آیتم‌های سفارش لیدر
            order_items = db.query(OrderItem).filter(
                OrderItem.order_id == leader_order.id
            ).all()
            
            if not order_items:
                print(f"⚠️  گروه {group.id}: سفارش لیدر بدون آیتم است")
                skipped_count += 1
                continue
            
            # ساخت basket snapshot
            basket_items = []
            for item in order_items:
                product = db.query(Product).filter(Product.id == item.product_id).first()
                
                # گرفتن تصویر اصلی محصول
                image_url = None
                if product:
                    try:
                        main_image = db.query(ProductImage).filter(
                            ProductImage.product_id == product.id,
                            ProductImage.is_main == True
                        ).first()
                        if main_image:
                            image_url = main_image.image_url
                        else:
                            # اگر تصویر اصلی نبود، اولین تصویر را بگیر
                            first_image = db.query(ProductImage).filter(
                                ProductImage.product_id == product.id
                            ).first()
                            if first_image:
                                image_url = first_image.image_url
                    except:
                        pass
                
                # Determine unit_price: prefer product prices over item.base_price
                unit_price = 0.0
                if product and product.market_price and product.market_price > 0:
                    unit_price = float(product.market_price)
                elif product and product.solo_price and product.solo_price > 0:
                    unit_price = float(product.solo_price)
                elif product and product.friend_1_price and product.friend_1_price > 0:
                    unit_price = float(product.friend_1_price)
                elif item.base_price and item.base_price > 0:
                    unit_price = float(item.base_price)
                
                basket_items.append({
                    "product_id": item.product_id,
                    "quantity": item.quantity,
                    "unit_price": unit_price,
                    "product_name": product.name if product else f"محصول {item.product_id}",
                    "market_price": float(product.market_price) if product and product.market_price else None,
                    "friend_1_price": float(product.friend_1_price) if product and product.friend_1_price else None,
                    "friend_2_price": float(product.friend_2_price) if product and product.friend_2_price else None,
                    "friend_3_price": float(product.friend_3_price) if product and product.friend_3_price else None,
                    "solo_price": float(product.solo_price) if product and product.solo_price else None,
                    "image": image_url,
                })
            
            # ساخت metadata
            metadata = {
                "kind": "primary",  # فرض می‌کنیم اکثر گروه‌های قدیمی primary هستند
                "items": basket_items,
                "created_at": leader_order.created_at.isoformat() if leader_order.created_at else None,
            }
            
            # ذخیره در دیتابیس
            try:
                group.basket_snapshot = json.dumps(metadata, ensure_ascii=False)
                
                # اگر زمان‌های مهم null هستند، آنها را هم set کنیم
                if not group.leader_paid_at and leader_order.paid_at:
                    group.leader_paid_at = leader_order.paid_at
                    print(f"✅ leader_paid_at set شد: {leader_order.paid_at}")
                
                if not group.expires_at and leader_order.paid_at:
                    group.expires_at = leader_order.paid_at + timedelta(hours=24)
                    print(f"✅ expires_at set شد: {group.expires_at}")
                elif not group.expires_at and leader_order.created_at:
                    group.expires_at = leader_order.created_at + timedelta(hours=24)
                    print(f"✅ expires_at set شد (از created_at): {group.expires_at}")
                
                db.commit()
                
                print(f"✅ گروه {group.id}: basket_snapshot با {len(basket_items)} آیتم ذخیره شد")
                fixed_count += 1
                
            except Exception as e:
                db.rollback()
                print(f"❌ خطا در ذخیره گروه {group.id}: {e}")
                skipped_count += 1
        
        print(f"\n" + "="*60)
        print(f"✅ بروزرسانی تمام شد!")
        print(f"   - تعداد گروه‌های اصلاح شده: {fixed_count}")
        print(f"   - تعداد گروه‌های رد شده: {skipped_count}")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n❌ خطای کلی: {e}")
        db.rollback()
    finally:
        db.close()


def check_basket_snapshots():
    """بررسی وضعیت basket_snapshot در گروه‌ها"""
    db: Session = next(get_db())
    
    try:
        print("\n📊 بررسی وضعیت basket_snapshot...")
        
        total_groups = db.query(GroupOrder).count()
        empty_snapshots = db.query(GroupOrder).filter(
            (GroupOrder.basket_snapshot == None) | 
            (GroupOrder.basket_snapshot == '') | 
            (GroupOrder.basket_snapshot == '[]') |
            (GroupOrder.basket_snapshot == '{}')
        ).count()
        filled_snapshots = total_groups - empty_snapshots
        
        print(f"\n📈 آمار:")
        print(f"   - کل گروه‌ها: {total_groups}")
        print(f"   - با basket_snapshot: {filled_snapshots}")
        print(f"   - بدون basket_snapshot: {empty_snapshots}")
        print(f"   - درصد پوشش: {(filled_snapshots/total_groups*100) if total_groups > 0 else 0:.1f}%\n")
        
        # نمایش چند نمونه از گروه‌های با basket_snapshot
        groups_with_data = db.query(GroupOrder).filter(
            GroupOrder.basket_snapshot != None,
            GroupOrder.basket_snapshot != '',
            GroupOrder.basket_snapshot != '[]',
            GroupOrder.basket_snapshot != '{}'
        ).limit(3).all()
        
        if groups_with_data:
            print("📦 نمونه گروه‌های با basket_snapshot:")
            for group in groups_with_data:
                try:
                    data = json.loads(group.basket_snapshot)
                    items_count = len(data.get('items', [])) if isinstance(data, dict) else len(data) if isinstance(data, list) else 0
                    print(f"   - گروه {group.id}: {items_count} آیتم")
                except:
                    print(f"   - گروه {group.id}: خطا در parse")
        
    finally:
        db.close()


if __name__ == "__main__":
    print("\n" + "="*60)
    print("🔧 ابزار تعمیر basket_snapshot")
    print("="*60)
    
    # ابتدا وضعیت فعلی را چک کنیم
    check_basket_snapshots()
    
    # سوال برای تایید
    print("\n⚠️  آیا می‌خواهید basket_snapshot گروه‌های خالی را پر کنید؟")
    response = input("   (y/n): ").strip().lower()
    
    if response == 'y' or response == 'yes':
        fix_group_basket_snapshots()
        
        # دوباره چک کنیم
        check_basket_snapshots()
    else:
        print("\n❌ لغو شد")

