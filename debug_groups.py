#!/usr/bin/env python3
import sys
import os
sys.path.append('./backend')

from backend.app.database import get_db
from sqlalchemy import text
import json

print('Testing database connection...')

db_gen = get_db()
db = next(db_gen)

try:
    # Check if table exists
    result = db.execute(text('SELECT name FROM sqlite_master WHERE type="table" AND name="group_orders"'))
    table_exists = result.fetchone()
    print(f'group_orders table exists: {table_exists is not None}')
    
    if table_exists:
        # Count records
        count_result = db.execute(text('SELECT COUNT(*) FROM group_orders'))
        count = count_result.fetchone()[0]
        print(f'Total GroupOrder records: {count}')
        
        if count > 0:
            # Get last few records
            recent_result = db.execute(text('SELECT id, leader_id, status, created_at, basket_snapshot FROM group_orders ORDER BY created_at DESC LIMIT 5'))
            for row in recent_result:
                print(f'Group {row[0]}: leader_id={row[1]}, status={row[2]}, created_at={row[3]}')
                if row[4]:  # basket_snapshot
                    try:
                        snapshot = json.loads(row[4])
                        kind = snapshot.get('kind', 'primary') if isinstance(snapshot, dict) else 'primary'
                        print(f'   Kind: {kind}')
                    except Exception as e:
                        print(f'   Kind: could not parse - {e}')
        else:
            print('No records found in group_orders table')
    else:
        print('group_orders table does not exist!')
        
    # Also check Orders table for group_order_id references
    print('\nChecking Orders with group_order_id...')
    orders_result = db.execute(text('SELECT COUNT(*) FROM orders WHERE group_order_id IS NOT NULL'))
    orders_count = orders_result.fetchone()[0]
    print(f'Orders with group_order_id: {orders_count}')
    
    if orders_count > 0:
        recent_orders = db.execute(text('SELECT id, user_id, group_order_id, status, payment_authority FROM orders WHERE group_order_id IS NOT NULL ORDER BY created_at DESC LIMIT 3'))
        for row in recent_orders:
            print(f'Order {row[0]}: user_id={row[1]}, group_order_id={row[2]}, status={row[3]}, authority={row[4]}')
        
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()
finally:
    db.close()
