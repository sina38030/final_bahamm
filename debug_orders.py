#!/usr/bin/env python3
import sys
import os
sys.path.append('./backend')

from backend.app.database import get_db
from sqlalchemy import text
import json

print('Checking recent orders for PENDING_INVITE patterns...')

db_gen = get_db()
db = next(db_gen)

try:
    # Check recent orders for PENDING_INVITE patterns
    recent_orders = db.execute(text('''
        SELECT id, user_id, group_order_id, status, payment_authority, shipping_address, created_at 
        FROM orders 
        WHERE created_at >= datetime('now', '-2 days')
        ORDER BY created_at DESC 
        LIMIT 10
    '''))
    
    print('Recent orders (last 2 days):')
    for row in recent_orders:
        order_id, user_id, group_order_id, status, authority, shipping_address, created_at = row
        print(f'Order {order_id}: user_id={user_id}, group_order_id={group_order_id}, status={status}')
        print(f'  Authority: {authority}')
        print(f'  Shipping: {shipping_address}')
        print(f'  Created: {created_at}')
        
        # Check if this looks like an invited user
        if shipping_address and 'PENDING_INVITE:' in shipping_address:
            print('  *** INVITED USER DETECTED ***')
        print()
        
    # Check GroupOrder records created recently
    print('\nRecent GroupOrder records:')
    recent_groups = db.execute(text('''
        SELECT id, leader_id, status, created_at, basket_snapshot 
        FROM group_orders 
        WHERE created_at >= datetime('now', '-2 days')
        ORDER BY created_at DESC 
        LIMIT 5
    '''))
    
    for row in recent_groups:
        group_id, leader_id, status, created_at, basket_snapshot = row
        print(f'Group {group_id}: leader_id={leader_id}, status={status}, created_at={created_at}')
        
        if basket_snapshot:
            try:
                snapshot = json.loads(basket_snapshot)
                if isinstance(snapshot, dict):
                    kind = snapshot.get('kind', 'primary')
                    source_order_id = snapshot.get('source_order_id')
                    print(f'  Kind: {kind}')
                    print(f'  Source Order ID: {source_order_id}')
                    
                    # If we have source_order_id, check that order
                    if source_order_id:
                        source_order = db.execute(text('''
                            SELECT shipping_address FROM orders WHERE id = ?
                        '''), (source_order_id,)).fetchone()
                        if source_order:
                            print(f'  Source Order Shipping: {source_order[0]}')
                else:
                    print(f'  Snapshot: {snapshot}')
            except Exception as e:
                print(f'  Could not parse snapshot: {e}')
        print()
        
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()
finally:
    db.close()
