#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Find valid invite codes for testing landingM"""
import sqlite3
import sys
from datetime import datetime

def find_invite_codes():
    """Find valid group orders and their invite codes"""
    
    # Connect to database
    db_path = "bahamm1.db"
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
    except Exception as e:
        print(f"[ERROR] Could not connect to database: {e}")
        print(f"Make sure {db_path} exists in current directory")
        return
    
    print("=" * 70)
    print("FINDING VALID GROUP ORDERS AND INVITE CODES")
    print("=" * 70)
    
    # Method 1: Find GroupOrder records with invite_token
    print("\n[1] Checking GroupOrder table for invite_token...")
    try:
        cursor.execute("""
            SELECT id, invite_token, leader_id, created_at, status, 
                   allow_consolidation, basket_snapshot
            FROM group_orders 
            WHERE invite_token IS NOT NULL 
            ORDER BY created_at DESC 
            LIMIT 10
        """)
        
        group_orders = cursor.fetchall()
        
        if group_orders:
            print(f"\n[OK] Found {len(group_orders)} group orders with invite_token:")
            print("-" * 70)
            for go in group_orders:
                gid, token, leader_id, created_at, status, allow_cons, snapshot = go
                print(f"\nGroup Order ID: {gid}")
                print(f"  Invite Token: {token}")
                print(f"  Leader ID: {leader_id}")
                print(f"  Created: {created_at}")
                print(f"  Status: {status or 'N/A'}")
                print(f"  URL: http://localhost:3000/landingM?invite={token}")
        else:
            print("\n[WARN] No group orders found with invite_token")
    except Exception as e:
        print(f"\n[ERROR] Error querying group_orders: {e}")
    
    # Method 2: Find Orders that could be used as GB codes
    print("\n\n[2] Checking Orders table for potential GB codes...")
    try:
        cursor.execute("""
            SELECT o.id, o.payment_authority, o.user_id, o.created_at, 
                   o.order_type, o.group_order_id, u.phone_number
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.order_type = 'GROUP' OR o.group_order_id IS NOT NULL
            ORDER BY o.created_at DESC
            LIMIT 10
        """)
        
        orders = cursor.fetchall()
        
        if orders:
            print(f"\n[OK] Found {len(orders)} group-related orders:")
            print("-" * 70)
            for order in orders:
                oid, auth, uid, created, otype, goid, phone = order
                
                # Generate GB code
                prefix = ""
                if auth:
                    prefix = auth[:8] if len(auth) >= 8 else auth
                gb_code = f"GB{oid}{prefix}"
                
                print(f"\nOrder ID: {oid}")
                print(f"  User: {phone or uid}")
                print(f"  Authority: {auth or 'N/A'}")
                print(f"  Group Order ID: {goid or 'N/A'}")
                print(f"  GB Code: {gb_code}")
                print(f"  URL: http://localhost:3000/landingM?invite={gb_code}")
        else:
            print("\n[WARN] No group-related orders found")
    except Exception as e:
        print(f"\n[ERROR] Error querying orders: {e}")
    
    # Method 3: Check if there are ANY orders with items
    print("\n\n[3] Checking for ANY orders with items (for testing)...")
    try:
        cursor.execute("""
            SELECT o.id, o.payment_authority, o.user_id, o.created_at,
                   COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            GROUP BY o.id
            HAVING item_count > 0
            ORDER BY o.created_at DESC
            LIMIT 5
        """)
        
        orders_with_items = cursor.fetchall()
        
        if orders_with_items:
            print(f"\n[OK] Found {len(orders_with_items)} orders with items:")
            print("-" * 70)
            for order in orders_with_items:
                oid, auth, uid, created, item_count = order
                
                prefix = ""
                if auth:
                    prefix = auth[:8] if len(auth) >= 8 else auth
                gb_code = f"GB{oid}{prefix}"
                
                print(f"\nOrder ID: {oid}")
                print(f"  Items: {item_count}")
                print(f"  GB Code: {gb_code}")
                print(f"  URL: http://localhost:3000/landingM?invite={gb_code}")
                
                # Show items for this order
                cursor.execute("""
                    SELECT oi.product_id, p.name, oi.quantity, oi.price
                    FROM order_items oi
                    LEFT JOIN products p ON oi.product_id = p.id
                    WHERE oi.order_id = ?
                """, (oid,))
                items = cursor.fetchall()
                for item in items:
                    pid, pname, qty, price = item
                    print(f"    - {pname or f'Product {pid}'}: {qty}x @ {price}")
        else:
            print("\n[WARN] No orders with items found")
    except Exception as e:
        print(f"\n[ERROR] Error querying order items: {e}")
    
    # Summary
    print("\n\n" + "=" * 70)
    print("SUMMARY & RECOMMENDATIONS")
    print("=" * 70)
    
    if group_orders and group_orders[0][1]:  # Has invite_token
        token = group_orders[0][1]
        print(f"\n[RECOMMENDED] Use this invite code:")
        print(f"  {token}")
        print(f"\n  Full URL:")
        print(f"  http://localhost:3000/landingM?invite={token}")
    elif orders and orders[0][1]:  # Has authority
        oid, auth = orders[0][0], orders[0][1]
        prefix = auth[:8] if auth and len(auth) >= 8 else (auth or "")
        gb_code = f"GB{oid}{prefix}"
        print(f"\n[RECOMMENDED] Use this GB code:")
        print(f"  {gb_code}")
        print(f"\n  Full URL:")
        print(f"  http://localhost:3000/landingM?invite={gb_code}")
    else:
        print("\n[WARN] No valid invite codes found!")
        print("\n  You need to:")
        print("  1. Create a group order through the app, OR")
        print("  2. Create test data in the database")
    
    conn.close()
    print("\n" + "=" * 70)


if __name__ == "__main__":
    find_invite_codes()

