#!/usr/bin/env python3
import sys
import os
sys.path.append('./backend')

from backend.app.database import get_db
from sqlalchemy import text
import json

# Test what groups User 118 should see
USER_ID = 118

print(f'Testing what groups User {USER_ID} should see...')

db_gen = get_db()
db = next(db_gen)

try:
    # Check user orders with group_order_id
    print('1. Orders with group_order_id:')
    user_orders = db.execute(text('''
        SELECT id, group_order_id, status, created_at
        FROM orders 
        WHERE user_id = :user_id AND is_settlement_payment = 0 AND group_order_id IS NOT NULL
        ORDER BY created_at DESC
    '''), {"user_id": USER_ID})
    
    group_ids_from_orders = set()
    for row in user_orders:
        order_id, group_order_id, status, created_at = row
        print(f'  Order {order_id}: group_order_id={group_order_id}, status={status}, created_at={created_at}')
        group_ids_from_orders.add(group_order_id)
    
    # Check groups where user is leader
    print('\n2. Groups where user is leader:')
    leader_groups = db.execute(text('''
        SELECT id, status, created_at
        FROM group_orders 
        WHERE leader_id = :user_id
        ORDER BY created_at DESC
    '''), {"user_id": USER_ID})
    
    group_ids_from_leadership = set()
    for row in leader_groups:
        group_id, status, created_at = row
        print(f'  Group {group_id}: status={status}, created_at={created_at}')
        group_ids_from_leadership.add(group_id)
    
    # Combine all group IDs
    all_group_ids = group_ids_from_orders | group_ids_from_leadership
    print(f'\n3. All group IDs that should be returned: {sorted(all_group_ids)}')
    
    # Check each group
    if all_group_ids:
        print('\n4. Group details:')
        for group_id in sorted(all_group_ids):
            group_info = db.execute(text('''
                SELECT id, leader_id, status, created_at, basket_snapshot
                FROM group_orders
                WHERE id = :group_id
            '''), {"group_id": group_id}).fetchone()
            
            if group_info:
                gid, leader_id, status, created_at, basket_snapshot = group_info
                is_leader = (leader_id == USER_ID)
                
                # Count members
                member_count = db.execute(text('''
                    SELECT COUNT(*) FROM orders WHERE group_order_id = :group_id
                '''), {"group_id": group_id}).fetchone()[0]
                
                print(f'  Group {gid}: leader_id={leader_id}, is_leader={is_leader}, status={status}, members={member_count}')
                
                # Check basket_snapshot
                if basket_snapshot:
                    try:
                        snapshot = json.loads(basket_snapshot)
                        if isinstance(snapshot, dict):
                            kind = snapshot.get('kind', 'primary')
                            print(f'    Kind: {kind}')
                        else:
                            print(f'    Snapshot: {snapshot} (not dict)')
                    except:
                        print(f'    Could not parse snapshot')
                else:
                    print(f'    No basket_snapshot')
    else:
        print('No groups found for this user!')
        
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()
finally:
    db.close()
