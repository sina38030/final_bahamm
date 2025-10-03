#!/usr/bin/env python
"""
Comprehensive inspection of group order state
"""
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import json

# Database connection
engine = create_engine('sqlite:///bahamm.db')
Session = sessionmaker(bind=engine)
session = Session()

def inspect_group(invite_code):
    print(f"\n{'='*60}")
    print(f"INSPECTING GROUP WITH INVITE CODE: {invite_code}")
    print(f"{'='*60}\n")
    
    # Find group order
    result = session.execute(text("""
        SELECT * FROM group_orders WHERE invite_code = :code
    """), {"code": invite_code})
    
    group = result.fetchone()
    if not group:
        print("❌ Group not found!")
        return
    
    # Convert to dict for easier access
    group_dict = dict(group._mapping)
    group_id = group_dict['id']
    
    print("📦 GROUP ORDER DETAILS:")
    print(f"  ID: {group_id}")
    print(f"  Leader ID: {group_dict['leader_id']}")
    print(f"  Status: {group_dict['status']}")
    print(f"  Expected Friends: {group_dict.get('expected_friends', 'NULL')}")
    print(f"  Max Friends: {group_dict['max_friends']}")
    print(f"  Settlement Required: {group_dict.get('settlement_required', False)}")
    print(f"  Settlement Amount: {group_dict.get('settlement_amount', 0)} تومان")
    print(f"  Created: {group_dict['created_at']}")
    print(f"  Leader Paid: {group_dict.get('leader_paid_at', 'Not paid')}")
    print(f"  Finalized: {group_dict.get('finalized_at', 'Not finalized')}")
    
    # Get all orders for this group
    print(f"\n📋 ORDERS IN THIS GROUP:")
    orders_result = session.execute(text("""
        SELECT o.*, u.first_name, u.last_name, u.phone_number 
        FROM orders o 
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.group_order_id = :group_id
        ORDER BY o.created_at
    """), {"group_id": group_id})
    
    orders = orders_result.fetchall()
    
    leader_order = None
    friend_orders = []
    
    for idx, order in enumerate(orders, 1):
        order_dict = dict(order._mapping)
        is_leader = order_dict['user_id'] == group_dict['leader_id']
        
        if is_leader:
            leader_order = order_dict
            
        else:
            friend_orders.append(order_dict)
            
        print(f"\n  Order #{idx}:")
        print(f"    Order ID: {order_dict['id']}")
        print(f"    User: {order_dict.get('first_name', '')} {order_dict.get('last_name', '')} ({order_dict.get('phone_number', '')})")
        print(f"    Role: {'👑 LEADER' if is_leader else '👥 FRIEND'}")
        print(f"    Status: {order_dict['status']}")
        print(f"    State: {order_dict.get('state', 'N/A')}")
        print(f"    Total Amount: {order_dict['total_amount']} تومان")
        print(f"    Payment Ref: {order_dict.get('payment_ref_id', 'None')}")
        print(f"    Is Settlement: {order_dict.get('is_settlement_payment', False)}")
        print(f"    Delivery Slot: {order_dict.get('delivery_slot', 'N/A')}")
    
    # Count actual friends who paid
    paid_friends = len([o for o in friend_orders if o.get('payment_ref_id')])
    
    print(f"\n📊 SUMMARY:")
    print(f"  Total Orders: {len(orders)}")
    print(f"  Leader Order Status: {leader_order['status'] if leader_order else 'No leader order'}")
    print(f"  Friends Who Joined & Paid: {paid_friends}")
    print(f"  Expected Friends: {group_dict.get('expected_friends', 'Not set')}")
    
    # Check if settlement should be required
    expected = group_dict.get('expected_friends')
    if expected and expected > paid_friends:
        print(f"\n⚠️  SETTLEMENT SHOULD BE REQUIRED:")
        print(f"  Leader expected {expected} friends but only {paid_friends} joined")
        
        # Get product prices to calculate difference
        if leader_order:
            items_result = session.execute(text("""
                SELECT oi.*, p.market_price, p.friend_1_price, p.friend_2_price, p.friend_3_price
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = :order_id
            """), {"order_id": leader_order['id']})
            
            items = items_result.fetchall()
            if items:
                print(f"\n  💰 PRICE CALCULATION:")
                for item in items:
                    item_dict = dict(item._mapping)
                    print(f"    Product ID {item_dict['product_id']}:")
                    print(f"      Market Price: {item_dict['market_price']} تومان")
                    print(f"      1 Friend Price: {item_dict['friend_1_price']} تومان")
                    print(f"      2 Friends Price: {item_dict['friend_2_price']} تومان")
                    print(f"      3 Friends Price: {item_dict['friend_3_price']} تومان")
    
    print(f"\n{'='*60}\n")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        inspect_group(sys.argv[1])
    else:
        inspect_group("GB387FREE3871")
