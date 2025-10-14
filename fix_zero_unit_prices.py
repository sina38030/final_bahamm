"""
اسکریپت برای اصلاح unit_price های صفر در basket_snapshot
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database import get_db
from app.models import GroupOrder, Product
import json

def fix_zero_unit_prices():
    """اصلاح unit_price های صفر در basket_snapshot"""
    db: Session = next(get_db())
    
    try:
        print("\n🔍 جستجوی گروه‌هایی با unit_price صفر...")
        
        # پیدا کردن گروه‌هایی که basket_snapshot دارند
        groups = db.query(GroupOrder).filter(
            GroupOrder.basket_snapshot != None,
            GroupOrder.basket_snapshot != '',
            GroupOrder.basket_snapshot != '[]',
            GroupOrder.basket_snapshot != '{}'
        ).all()
        
        print(f"✅ {len(groups)} گروه با basket_snapshot پیدا شد\n")
        
        fixed_count = 0
        skipped_count = 0
        
        for group in groups:
            try:
                # Parse basket_snapshot
                snapshot_data = json.loads(group.basket_snapshot)
                if not isinstance(snapshot_data, dict) or 'items' not in snapshot_data:
                    continue
                
                items = snapshot_data['items']
                if not items:
                    continue
                
                # بررسی آیا هیچ item ای unit_price صفر دارد
                has_zero_price = any(
                    float(item.get('unit_price', 0)) == 0.0 
                    for item in items
                )
                
                if not has_zero_price:
                    skipped_count += 1
                    continue
                
                print(f"\n--- پردازش گروه {group.id} ---")
                
                # اصلاح هر item
                updated = False
                for item in items:
                    if float(item.get('unit_price', 0)) == 0.0:
                        product_id = item.get('product_id')
                        if not product_id:
                            continue
                        
                        # گرفتن اطلاعات محصول
                        product = db.query(Product).filter(Product.id == product_id).first()
                        if not product:
                            print(f"⚠️  محصول {product_id} یافت نشد")
                            continue
                        
                        # تعیین unit_price از قیمت‌های محصول
                        unit_price = 0.0
                        if product.market_price and product.market_price > 0:
                            unit_price = float(product.market_price)
                        elif product.solo_price and product.solo_price > 0:
                            unit_price = float(product.solo_price)
                        elif product.friend_1_price and product.friend_1_price > 0:
                            unit_price = float(product.friend_1_price)
                        elif product.base_price and product.base_price > 0:
                            unit_price = float(product.base_price)
                        
                        if unit_price > 0:
                            old_price = item.get('unit_price', 0)
                            item['unit_price'] = unit_price
                            
                            # اضافه کردن solo_price اگر نباشد
                            if 'solo_price' not in item or not item['solo_price']:
                                item['solo_price'] = float(product.solo_price) if product.solo_price else unit_price
                            
                            print(f"✅ محصول {item.get('product_name', product_id)}: {old_price} → {unit_price} تومان")
                            updated = True
                        else:
                            print(f"⚠️  نتوانستیم قیمت برای محصول {item.get('product_name', product_id)} پیدا کنیم")
                
                if updated:
                    # ذخیره تغییرات
                    try:
                        group.basket_snapshot = json.dumps(snapshot_data, ensure_ascii=False)
                        db.commit()
                        print(f"✅ گروه {group.id} به‌روزرسانی شد")
                        fixed_count += 1
                    except Exception as e:
                        db.rollback()
                        print(f"❌ خطا در ذخیره گروه {group.id}: {e}")
                        skipped_count += 1
                else:
                    skipped_count += 1
                    
            except json.JSONDecodeError:
                print(f"⚠️  گروه {group.id}: خطا در parse JSON")
                skipped_count += 1
                continue
            except Exception as e:
                print(f"⚠️  گروه {group.id}: {e}")
                skipped_count += 1
                continue
        
        print(f"\n" + "="*60)
        print(f"✅ به‌روزرسانی تمام شد!")
        print(f"   - تعداد گروه‌های اصلاح شده: {fixed_count}")
        print(f"   - تعداد گروه‌های رد شده: {skipped_count}")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n❌ خطای کلی: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("\n" + "="*60)
    print("🔧 ابزار اصلاح unit_price های صفر")
    print("="*60)
    
    print("\n⚠️  این اسکریپت unit_price های صفر را با قیمت محصولات جایگزین می‌کند")
    response = input("   آیا ادامه می‌دهید؟ (y/n): ").strip().lower()
    
    if response == 'y' or response == 'yes':
        fix_zero_unit_prices()
    else:
        print("\n❌ لغو شد")

