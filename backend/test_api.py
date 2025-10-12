#!/usr/bin/env python3

import sys
sys.path.append('.')

from app.database import get_db
from sqlalchemy import text

def test_group_api():
    db = next(get_db())
    
    # Simulate what the API does for GB452A0000000
    group_id = 121
    
    # Get group details
    group_result = db.execute(text("SELECT id, leader_id, status, invite_token FROM group_orders WHERE id = :gid"), {'gid': group_id}).fetchone()
    if not group_result:
        print("Group not found")
        return
        
    gid, leader_id, status, invite_token = group_result
    print(f"Group: ID={gid}, Leader={leader_id}, Status={status}, Invite={invite_token}")
    
    # Get participants (orders)
    orders = db.execute(text("SELECT id, user_id, payment_ref_id, paid_at, status FROM orders WHERE group_order_id = :gid AND is_settlement_payment = 0"), {'gid': group_id}).fetchall()
    
    print(f"\nParticipants ({len(orders)} orders):")
    participants = []
    for order in orders:
        order_id, user_id, payment_ref_id, paid_at, order_status = order
        
        # Determine if paid
        paid = bool(payment_ref_id or paid_at or order_status in ["تکمیل شده", "paid", "completed"])
        is_leader = (user_id == leader_id)
        
        participants.append({
            'order_id': order_id,
            'user_id': user_id,
            'is_leader': is_leader,
            'paid': paid
        })
        
        print(f"  Order {order_id}: user_id={user_id}, is_leader={is_leader}, paid={paid}, payment_ref_id={payment_ref_id}, status={order_status}")
    
    # Count paid non-leaders (what the frontend should show)
    paid_non_leaders = [p for p in participants if not p['is_leader'] and p['paid']]
    print(f"\nPaid non-leaders: {len(paid_non_leaders)}")
    
    # Expected friends (for completion threshold)
    expected = 1  # minimum 1 friend
    remaining = max(0, expected - len(paid_non_leaders))
    print(f"Expected friends: {expected}")
    print(f"Remaining to complete: {remaining}")
    
    db.close()

if __name__ == '__main__':
    test_group_api()
