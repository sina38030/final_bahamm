#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Create test products for landingM testing"""
import sqlite3
from datetime import datetime
import sys
import io

# Fix encoding
if sys.platform == 'win32':
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    except:
        pass

def create_test_products():
    """Create sample products"""
    
    db = sqlite3.connect("bahamm1.db")
    c = db.cursor()
    
    print("=" * 70)
    print("CREATING TEST PRODUCTS")
    print("=" * 70)
    
    # Check if categories exist
    c.execute("SELECT id, name FROM categories LIMIT 1")
    cat = c.fetchone()
    
    if not cat:
        print("\n[1] Creating test categories...")
        c.execute("INSERT INTO categories (name, slug) VALUES (?, ?)", ("میوه", "fruit"))
        cat_id_fruit = c.lastrowid
        c.execute("INSERT INTO categories (name, slug) VALUES (?, ?)", ("سبزی", "veggie"))
        cat_id_veg = c.lastrowid
        db.commit()
        print(f"[OK] Created categories: میوه (ID: {cat_id_fruit}), سبزی (ID: {cat_id_veg})")
    else:
        cat_id_fruit = cat[0]
        cat_id_veg = cat[0]
        print(f"\n[1] Using existing category: {cat[1]} (ID: {cat[0]})")
    
    # Get user for merchant_id
    c.execute("SELECT id FROM users LIMIT 1")
    user = c.fetchone()
    merchant_id = user[0] if user else 1
    
    # Check if store exists
    c.execute("SELECT id FROM stores LIMIT 1")
    store = c.fetchone()
    
    if not store:
        print("\n[2] Creating test store...")
        c.execute("INSERT INTO stores (name, merchant_id) VALUES (?, ?)", ("فروشگاه تست", merchant_id))
        store_id = c.lastrowid
        db.commit()
        print(f"[OK] Created store (ID: {store_id})")
    else:
        store_id = store[0]
        print(f"\n[2] Using existing store (ID: {store_id})")
    
    # Create test products
    print("\n[3] Creating test products...")
    
    test_products = [
        {
            'name': 'سیب قرمز',
            'category_id': cat_id_fruit,
            'base_price': 45000,
            'market_price': 65000,
            'friend_1_price': 55000,
            'friend_2_price': 50000,
            'friend_3_price': 47000,
            'weight_grams': 1000,
            'description': 'سیب قرمز درجه یک'
        },
        {
            'name': 'پرتقال',
            'category_id': cat_id_fruit,
            'base_price': 38000,
            'market_price': 55000,
            'friend_1_price': 45000,
            'friend_2_price': 42000,
            'friend_3_price': 40000,
            'weight_grams': 1000,
            'description': 'پرتقال تامسون'
        },
        {
            'name': 'موز',
            'category_id': cat_id_fruit,
            'base_price': 52000,
            'market_price': 72000,
            'friend_1_price': 62000,
            'friend_2_price': 57000,
            'friend_3_price': 54000,
            'weight_grams': 1000,
            'description': 'موز درجه یک'
        },
        {
            'name': 'گوجه فرنگی',
            'category_id': cat_id_veg,
            'base_price': 28000,
            'market_price': 40000,
            'friend_1_price': 35000,
            'friend_2_price': 32000,
            'friend_3_price': 30000,
            'weight_grams': 1000,
            'description': 'گوجه فرنگی گلخانه‌ای'
        },
        {
            'name': 'خیار',
            'category_id': cat_id_veg,
            'base_price': 25000,
            'market_price': 38000,
            'friend_1_price': 32000,
            'friend_2_price': 29000,
            'friend_3_price': 27000,
            'weight_grams': 1000,
            'description': 'خیار گلخانه‌ای'
        },
        {
            'name': 'هویج',
            'category_id': cat_id_veg,
            'base_price': 22000,
            'market_price': 35000,
            'friend_1_price': 28000,
            'friend_2_price': 25000,
            'friend_3_price': 23000,
            'weight_grams': 1000,
            'description': 'هویج درجه یک'
        }
    ]
    
    created_products = []
    for i, prod in enumerate(test_products, 1):
        c.execute("""
            INSERT INTO products (
                name, category_id, store_id, description,
                base_price, market_price, friend_1_price, friend_2_price, friend_3_price,
                weight_grams, is_active, landing_position
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            prod['name'],
            prod['category_id'],
            store_id,
            prod['description'],
            prod['base_price'],
            prod['market_price'],
            prod['friend_1_price'],
            prod['friend_2_price'],
            prod['friend_3_price'],
            prod['weight_grams'],
            1,  # is_active
            i  # landing_position for order
        ))
        
        product_id = c.lastrowid
        created_products.append((product_id, prod['name'], prod['base_price']))
        print(f"  [{i}] {prod['name']}: {prod['base_price']} تومان (ID: {product_id})")
    
    db.commit()
    
    print(f"\n[OK] Created {len(test_products)} products")
    
    # Now create a group order
    print("\n[4] Creating test group order...")
    
    # Get user
    c.execute("SELECT id, phone_number FROM users LIMIT 1")
    user = c.fetchone()
    user_id = user[0] if user else 1
    
    # Create order
    import random, string
    authority = ''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(36))
    total_amount = sum(p[2] for p in created_products[:3])  # First 3 products
    
    c.execute("""
        INSERT INTO orders (
            user_id, total_amount, status, payment_authority,
            order_type
        ) VALUES (?, ?, ?, ?, ?)
    """, (user_id, total_amount, 'PAID', authority, 'GROUP'))
    
    order_id = c.lastrowid
    
    # Add order items
    for pid, pname, price in created_products[:3]:
        c.execute("""
            INSERT INTO order_items (order_id, product_id, quantity, base_price)
            VALUES (?, ?, ?, ?)
        """, (order_id, pid, random.randint(1, 2), price))
    
    # Create group order
    import json
    from datetime import timedelta
    
    invite_token = ''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(12))
    
    items_snapshot = []
    for pid, pname, price in created_products[:3]:
        c.execute("SELECT market_price, friend_1_price FROM products WHERE id = ?", (pid,))
        prices = c.fetchone()
        items_snapshot.append({
            'product_id': pid,
            'product_name': pname,
            'quantity': random.randint(1, 2),
            'price': price,
            'base_price': price,
            'market_price': prices[0],
            'friend_1_price': prices[1]
        })
    
    basket_snapshot = json.dumps({'items': items_snapshot, 'source_order_id': order_id})
    
    c.execute("""
        INSERT INTO group_orders (
            leader_id, invite_token, expires_at, status,
            allow_consolidation, basket_snapshot
        ) VALUES (?, ?, ?, ?, ?, ?)
    """, (
        user_id,
        invite_token,
        datetime.now() + timedelta(days=7),
        'active',
        1,
        basket_snapshot
    ))
    
    group_id = c.lastrowid
    
    c.execute("UPDATE orders SET group_order_id = ? WHERE id = ?", (group_id, order_id))
    
    db.commit()
    db.close()
    
    print(f"[OK] Created test group order")
    
    # Summary
    print("\n" + "=" * 70)
    print("SUCCESS! TEST DATA CREATED")
    print("=" * 70)
    print(f"\nInvite Code: {invite_token}")
    print(f"\nTest URLs:")
    print(f"  http://localhost:3000/landingM?invite={invite_token}")
    
    prefix = authority[:8]
    gb_code = f"GB{order_id}{prefix}"
    print(f"\n  Alternative: http://localhost:3000/landingM?invite={gb_code}")
    
    print(f"\nCreated:")
    print(f"  - {len(test_products)} products")
    print(f"  - 1 group order with {len(created_products[:3])} items")
    print(f"  - Total amount: {total_amount:,} تومان")
    
    print("\n" + "=" * 70)

if __name__ == "__main__":
    create_test_products()

