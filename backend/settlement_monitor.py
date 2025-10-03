#!/usr/bin/env python
"""
Settlement Monitor - Continuously monitors and fixes group settlements
Run this alongside your backend server
"""
import time
import sqlite3
import json
from datetime import datetime

def get_price_for_friends(product_prices, friends_count):
    """Calculate price based on friend count"""
    if friends_count == 0:
        return product_prices['market_price']
    elif friends_count == 1:
        return product_prices.get('friend_1_price', product_prices['market_price'])
    elif friends_count == 2:
        return product_prices.get('friend_2_price', product_prices.get('friend_1_price', product_prices['market_price']))
    else:
        return product_prices.get('friend_3_price', product_prices.get('friend_2_price', product_prices.get('friend_1_price', product_prices['market_price'])))

def monitor_settlements():
    """Monitor and fix settlements every 5 seconds"""
    print("Settlement Monitor Started")
    print("="*60)
    
    while True:
        try:
            conn = sqlite3.connect('bahamm.db')
            cursor = conn.cursor()
            
            # Get all groups
            cursor.execute("""
                SELECT id, leader_id, max_friends, expected_friends, settlement_required, invite_code
                FROM group_orders
            """)
            groups = cursor.fetchall()
            
            for group in groups:
                group_id, leader_id, max_friends, expected_friends, current_settlement_required, invite_code = group
                
                # Get all orders for this group
                cursor.execute("""
                    SELECT id, user_id, status, payment_ref_id, is_settlement_payment, delivery_slot
                    FROM orders
                    WHERE group_order_id = ?
                """, (group_id,))
                orders = cursor.fetchall()
                
                if not orders:
                    continue
                
                # Find leader order and count paid friends
                leader_order = None
                paid_friends = 0
                
                for order in orders:
                    order_id, user_id, status, payment_ref_id, is_settlement, delivery_slot = order
                    
                    if user_id == leader_id and not is_settlement:
                        leader_order = order
                    elif user_id != leader_id and payment_ref_id:
                        paid_friends += 1
                
                if not leader_order:
                    continue
                
                leader_order_id, _, leader_status, leader_payment_ref, _, leader_delivery_slot = leader_order
                
                # Skip if leader hasn't paid
                if not leader_payment_ref:
                    continue
                
                # Determine expected friends
                if not expected_friends and leader_delivery_slot:
                    try:
                        slot_data = json.loads(leader_delivery_slot)
                        if isinstance(slot_data, dict):
                            expected_friends = slot_data.get('friends') or slot_data.get('expected_friends')
                    except:
                        pass
                
                if not expected_friends:
                    expected_friends = max_friends or 3
                
                # Check if settlement is needed
                needs_settlement = expected_friends > paid_friends
                
                if needs_settlement:
                    # Calculate settlement amount
                    settlement_amount = 0
                    
                    cursor.execute("""
                        SELECT oi.quantity, oi.product_id, p.market_price, p.friend_1_price, p.friend_2_price, p.friend_3_price
                        FROM order_items oi
                        JOIN products p ON oi.product_id = p.id
                        WHERE oi.order_id = ?
                    """, (leader_order_id,))
                    
                    items = cursor.fetchall()
                    for item in items:
                        quantity, product_id, market_price, friend_1_price, friend_2_price, friend_3_price = item
                        
                        prices = {
                            'market_price': market_price,
                            'friend_1_price': friend_1_price,
                            'friend_2_price': friend_2_price,
                            'friend_3_price': friend_3_price
                        }
                        
                        actual_price = get_price_for_friends(prices, paid_friends)
                        expected_price = get_price_for_friends(prices, expected_friends)
                        difference = actual_price - expected_price
                        settlement_amount += difference * quantity
                    
                    # Update group
                    cursor.execute("""
                        UPDATE group_orders
                        SET expected_friends = ?, settlement_required = 1, settlement_amount = ?
                        WHERE id = ?
                    """, (expected_friends, settlement_amount, group_id))
                    
                    # Update leader order status if needed
                    if leader_status != "در انتظار تسویه":
                        cursor.execute("""
                            UPDATE orders
                            SET status = 'در انتظار تسویه'
                            WHERE id = ?
                        """, (leader_order_id,))
                        
                        print(f"[{datetime.now().strftime('%H:%M:%S')}] Fixed group {invite_code}: Leader order {leader_order_id} -> 'در انتظار تسویه' ({settlement_amount} تومان)")
                
                else:
                    # No settlement needed - clear flags
                    if current_settlement_required:
                        cursor.execute("""
                            UPDATE group_orders
                            SET settlement_required = 0, settlement_amount = 0
                            WHERE id = ?
                        """, (group_id,))
                    
                    # Fix leader order if it was pending
                    if leader_status == "در انتظار تسویه":
                        cursor.execute("""
                            UPDATE orders
                            SET status = 'تکمیل شده'
                            WHERE id = ?
                        """, (leader_order_id,))
                        
                        print(f"[{datetime.now().strftime('%H:%M:%S')}] Fixed group {invite_code}: Leader order {leader_order_id} -> 'تکمیل شده' (no settlement needed)")
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            print(f"Error: {e}")
        
        time.sleep(5)  # Check every 5 seconds

if __name__ == "__main__":
    monitor_settlements()
