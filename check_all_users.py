"""Check all users and their authentication methods."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.database import SessionLocal
from app.models import User, GroupOrder

db = SessionLocal()
try:
    users = db.query(User).all()
    
    print(f"Total users in database: {len(users)}\n")
    
    telegram_users = [u for u in users if u.telegram_id]
    phone_users = [u for u in users if u.phone_number and not u.telegram_id]
    
    print(f"Telegram users: {len(telegram_users)}")
    print(f"Phone users: {len(phone_users)}\n")
    
    print("=" * 60)
    print("ALL USERS:")
    print("=" * 60)
    
    for user in users[:20]:  # Show first 20
        print(f"\nUser ID: {user.id}")
        print(f"  Phone: {user.phone_number or 'N/A'}")
        print(f"  Telegram ID: {user.telegram_id or 'N/A'}")
        print(f"  Telegram Username: @{user.telegram_username or 'N/A'}")
        print(f"  Name: {user.first_name or ''} {user.last_name or ''}")
        print(f"  Phone Verified: {user.is_phone_verified}")
        
        # Check if user is a group leader
        groups_led = db.query(GroupOrder).filter(GroupOrder.leader_id == user.id).count()
        if groups_led > 0:
            print(f"  ** IS GROUP LEADER (leads {groups_led} groups)")
    
    if len(users) > 20:
        print(f"\n... and {len(users) - 20} more users")
    
    print("\n" + "=" * 60)
    print("GROUP LEADERS:")
    print("=" * 60)
    
    group_leaders = db.query(GroupOrder).all()
    leader_ids = set(g.leader_id for g in group_leaders if g.leader_id)
    
    for leader_id in leader_ids:
        leader = db.query(User).filter(User.id == leader_id).first()
        if leader:
            print(f"\nLeader ID: {leader.id}")
            print(f"  Has telegram_id: {'YES ✅' if leader.telegram_id else 'NO ❌'}")
            print(f"  Telegram ID: {leader.telegram_id or 'N/A'}")
            print(f"  Phone: {leader.phone_number or 'N/A'}")
            print(f"  Groups led: {db.query(GroupOrder).filter(GroupOrder.leader_id == leader.id).count()}")
            
finally:
    db.close()

