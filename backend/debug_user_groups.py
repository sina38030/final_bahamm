#!/usr/bin/env python3

import sys
sys.path.append('.')

from app.database import get_db
from app.models import User, GroupOrder, Order
import json

def debug_user_groups():
    db = next(get_db())
    
    # Find user by phone
    user_phone = "09678898989"
    user = db.query(User).filter(User.phone_number.like(f"%{user_phone[-8:]}")).first()
    
    if not user:
        print(f"❌ User with phone {user_phone} not found")
        return
    
    print(f"✅ Found user: ID={user.id}, Phone={user.phone_number}")
    
    # Check if user is leader of any groups
    led_groups = db.query(GroupOrder).filter(GroupOrder.leader_id == user.id).all()
    print(f"\n📋 Groups led by user {user.id}:")
    
    for g in led_groups:
        # Parse kind from basket_snapshot
        kind = "primary"
        try:
            if getattr(g, 'basket_snapshot', None):
                meta = json.loads(g.basket_snapshot)
                if isinstance(meta, dict):
                    kind = str((meta.get("kind") or "primary")).lower()
        except Exception:
            kind = "primary"
        
        # Count followers
        orders = db.query(Order).filter(
            Order.group_order_id == g.id,
            Order.is_settlement_payment == False
        ).all()
        followers = [o for o in orders if o.user_id != g.leader_id]
        
        print(f"  Group {g.id}: kind={kind}, invite_token={g.invite_token}")
        print(f"    Status: {g.status}")
        print(f"    Created: {g.created_at}")
        print(f"    Expires: {g.expires_at}")
        print(f"    Total orders: {len(orders)}")
        print(f"    Followers: {len(followers)}")
        
        if followers:
            print("    Follower details:")
            for f in followers:
                follower_user = db.query(User).filter(User.id == f.user_id).first()
                phone = follower_user.phone_number if follower_user else "Unknown"
                paid = f.payment_ref_id is not None or f.paid_at is not None
                print(f"      - User {f.user_id} ({phone}): paid={paid}")
        print()
    
    # Check if user is member of any groups
    user_orders = db.query(Order).filter(
        Order.user_id == user.id,
        Order.group_order_id.isnot(None),
        Order.is_settlement_payment == False
    ).all()
    
    print(f"📋 Groups user {user.id} is member of:")
    for o in user_orders:
        group = db.query(GroupOrder).filter(GroupOrder.id == o.group_order_id).first()
        if group:
            leader_user = db.query(User).filter(User.id == group.leader_id).first()
            leader_phone = leader_user.phone_number if leader_user else "Unknown"
            is_leader = (o.user_id == group.leader_id)
            paid = o.payment_ref_id is not None or o.paid_at is not None
            
            print(f"  Group {group.id}: leader={leader_phone}, is_leader={is_leader}, paid={paid}")
            print(f"    Invite token: {group.invite_token}")
    
    db.close()

if __name__ == '__main__':
    debug_user_groups()
