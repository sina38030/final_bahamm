#!/usr/bin/env python3

import sys
sys.path.append('.')

from app.database import get_db
from sqlalchemy import text

def check_invite():
    db = next(get_db())
    
    # Check how the API resolves GB452A0000000 to group ID
    result = db.execute(text("SELECT id, invite_token FROM group_orders WHERE invite_token = 'GB452A0000000'")).fetchone()
    if result:
        group_id, invite_token = result
        print(f'Invite code GB452A0000000 maps to group ID: {group_id}')
    else:
        print('Invite code not found in group_orders table')
        
        # Check what invite codes exist
        all_invites = db.execute(text("SELECT id, invite_token FROM group_orders ORDER BY id DESC LIMIT 10")).fetchall()
        print('Recent invite codes:')
        for group_id, invite_token in all_invites:
            print(f'  Group {group_id}: {invite_token}')
    
    db.close()

if __name__ == '__main__':
    check_invite()
