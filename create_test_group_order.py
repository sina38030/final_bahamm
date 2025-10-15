#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Create test group order data for landingM testing"""
import sqlite3
import json
from datetime import datetime, timedelta
import random
import string

def generate_invite_token(length=12):
    """Generate a random invite token"""
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choice(chars) for _ in range(length))

def create_test_group_order():
    """Create a test group order with items"""
    
    db_path = "bahamm1.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("=" * 70)
    print("CREATING TEST GROUP ORDER FOR LANDINGM")
    print("=" * 70)
    
    # Step 1: Find or create a test user
    print("\n[1] Finding test user...")
    cursor.execute("SELECT id, phone_number FROM users LIMIT 1")
    user = cursor.fetchone()
    
    if not user:
        print("[WARN] No users found. Creating test user...")
        test_phone = "09123456789"
        cursor.execute("""
            INSERT INTO users (phone_number, full_name, created_at)
            VALUES (?, ?, ?)
        """, (test_phone, "Test User", datetime.now()))
        conn.commit()
        user_id = cursor.lastrowid
        print(f"[OK] Created test user: {test_phone} (ID: {user_id})")
    else:
        user_id, phone = user
        print(f"[OK] Using existing user: {phone} (ID: {user_id})")
    
    # Step 2: Find products for the order
    print("\n[2] Finding products...")
    cursor.execute("""
        SELECT id, name, base_price, market_price, friend_1_price
        FROM products 
        WHERE is_active = 1
        LIMIT 5
    """)
    products = cursor.fetchall()
    
    if not products:
        print("[ERROR] No products found in database!")
        print("Please add products first through admin panel")
        conn.close()
        return
    
    print(f"[OK] Found {len(products)} products")
    
    # Step 3: Create an order with items
    print("\n[3] Creating test order...")
    
    # Calculate total amount
    total_amount = sum(p[2] or 0 for p in products) * 1  # base_price * quantity
    
    # Create order
    authority = ''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(36))
    
    cursor.execute("""
        INSERT INTO orders (
            user_id, total_amount, status, payment_authority,
            order_type, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
    """, (
        user_id,
        total_amount,
        'PAID',
        authority,
        'GROUP',
        datetime.now()
    ))
    conn.commit()
    order_id = cursor.lastrowid
    print(f"[OK] Created order ID: {order_id}")
    
    # Add order items
    print("\n[4] Adding order items...")
    for i, product in enumerate(products, 1):
        pid, name, base_price, market_price, friend_1_price = product
        quantity = random.randint(1, 3)
        
        cursor.execute("""
            INSERT INTO order_items (
                order_id, product_id, quantity, price, created_at
            ) VALUES (?, ?, ?, ?, ?)
        """, (
            order_id,
            pid,
            quantity,
            base_price or 0,
            datetime.now()
        ))
        print(f"  [{i}] {name}: {quantity}x @ {base_price}")
    
    conn.commit()
    
    # Step 4: Create GroupOrder
    print("\n[5] Creating GroupOrder...")
    
    invite_token = generate_invite_token()
    expires_at = datetime.now() + timedelta(days=7)
    
    # Create basket snapshot
    items_snapshot = []
    for product in products:
        pid, name, base_price, market_price, friend_1_price = product
        items_snapshot.append({
            'product_id': pid,
            'product_name': name,
            'quantity': random.randint(1, 3),
            'price': base_price or 0,
            'base_price': base_price or 0,
            'market_price': market_price or base_price or 0,
            'solo_price': market_price or base_price or 0,
            'friend_1_price': friend_1_price or base_price or 0
        })
    
    basket_snapshot = json.dumps({
        'items': items_snapshot,
        'source_order_id': order_id
    })
    
    cursor.execute("""
        INSERT INTO group_orders (
            leader_id, invite_token, expires_at, status,
            allow_consolidation, basket_snapshot, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id,
        invite_token,
        expires_at,
        'active',
        1,  # allow_consolidation
        basket_snapshot,
        datetime.now()
    ))
    conn.commit()
    group_id = cursor.lastrowid
    
    # Update order with group_order_id
    cursor.execute("""
        UPDATE orders SET group_order_id = ? WHERE id = ?
    """, (group_id, order_id))
    conn.commit()
    
    print(f"[OK] Created GroupOrder ID: {group_id}")
    print(f"[OK] Invite Token: {invite_token}")
    
    # Step 5: Summary
    print("\n" + "=" * 70)
    print("TEST DATA CREATED SUCCESSFULLY!")
    print("=" * 70)
    print(f"\nInvite Code: {invite_token}")
    print(f"\nTest URL:")
    print(f"  http://localhost:3000/landingM?invite={invite_token}")
    print(f"\nAlternative GB Code:")
    prefix = authority[:8] if len(authority) >= 8 else authority
    gb_code = f"GB{order_id}{prefix}"
    print(f"  {gb_code}")
    print(f"  http://localhost:3000/landingM?invite={gb_code}")
    
    print(f"\nOrder Details:")
    print(f"  Order ID: {order_id}")
    print(f"  Total Items: {len(products)}")
    print(f"  Total Amount: {total_amount}")
    print(f"  Leader: {phone if user else 'Test User'}")
    
    print("\n" + "=" * 70)
    
    conn.close()

if __name__ == "__main__":
    try:
        create_test_group_order()
    except Exception as e:
        print(f"\n[ERROR] Failed to create test data: {e}")
        import traceback
        traceback.print_exc()

