#!/usr/bin/env python3
import sys
import os
sys.path.append('./backend')

from backend.app.database import get_db
from sqlalchemy import text
import json

print('Finding users with group orders...')

db_gen = get_db()
db = next(db_gen)

try:
    # Find users who have group orders
    users_with_groups = db.execute(text('''
        SELECT DISTINCT u.id, u.phone_number, u.first_name, u.last_name, 
               COUNT(DISTINCT go.id) as group_count,
               COUNT(DISTINCT o.id) as order_count
        FROM users u
        LEFT JOIN group_orders go ON go.leader_id = u.id
        LEFT JOIN orders o ON o.user_id = u.id AND o.group_order_id IS NOT NULL
        WHERE go.id IS NOT NULL OR o.group_order_id IS NOT NULL
        GROUP BY u.id
        ORDER BY group_count DESC, order_count DESC
        LIMIT 5
    '''))
    
    print('Users with group activity:')
    for row in users_with_groups:
        user_id, phone, first_name, last_name, group_count, order_count = row
        name = f"{first_name or ''} {last_name or ''}".strip() or "No name"
        print(f'User {user_id}: {phone} ({name}) - {group_count} groups, {order_count} orders')
        
    # Show recent group leaders
    print('\nRecent group leaders:')
    recent_leaders = db.execute(text('''
        SELECT go.id, go.leader_id, u.phone_number, go.status, go.created_at
        FROM group_orders go
        JOIN users u ON u.id = go.leader_id
        ORDER BY go.created_at DESC
        LIMIT 5
    '''))
    
    for row in recent_leaders:
        group_id, leader_id, phone, status, created_at = row
        print(f'Group {group_id}: Leader {leader_id} ({phone}), Status: {status}, Created: {created_at}')
        
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()
finally:
    db.close()
