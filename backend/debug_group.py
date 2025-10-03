#!/usr/bin/env python3

import sys
sys.path.append('.')

from app.database import get_db
from app.models import GroupOrder, Order
from sqlalchemy import text

def debug_group():
    db = next(get_db())
    
    # Find group by invite code first
    result = db.execute(text("SELECT id, leader_id, status FROM group_orders WHERE invite_token = 'GB452A0000000'")).fetchone()
    if not result:
        # Try by ID
        result = db.execute(text("SELECT id, leader_id, status FROM group_orders WHERE id = 452")).fetchone()
    
    if result:
        group_id, leader_id, status = result
        print(f'Group ID: {group_id}, Leader ID: {leader_id}, Status: {status}')
        
        # Get all orders for this group
        orders = db.execute(text("SELECT id, user_id, payment_ref_id, paid_at, status, is_settlement_payment FROM orders WHERE group_order_id = :gid"), {'gid': group_id}).fetchall()
        print(f'Total orders: {len(orders)}')
        
        for i, order in enumerate(orders):
            order_id, user_id, payment_ref_id, paid_at, order_status, is_settlement = order
            print(f'Order {i}: id={order_id}, user_id={user_id}, payment_ref_id={payment_ref_id}, paid_at={paid_at}, status="{order_status}", is_settlement={is_settlement}')
        
        # Check which orders would be considered "paid followers"
        paid_followers = []
        for order in orders:
            order_id, user_id, payment_ref_id, paid_at, order_status, is_settlement = order
            
            # Skip leader order
            if user_id == leader_id:
                continue
                
            # Skip settlement payments
            if is_settlement:
                continue
                
            # Check if paid
            paid = False
            if payment_ref_id:
                paid = True
            elif paid_at:
                paid = True
            elif str(order_status).strip() in ["تکمیل شده", "paid", "completed"]:
                paid = True
            
            if paid:
                paid_followers.append(order_id)
        
        print(f'Paid followers count: {len(paid_followers)}')
        print(f'Paid follower order IDs: {paid_followers}')
        
    else:
        print('Group not found')
    
    db.close()

if __name__ == '__main__':
    debug_group()
