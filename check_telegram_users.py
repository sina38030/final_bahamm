"""Quick script to check for Telegram users in database."""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.database import SessionLocal
from app.models import User

db = SessionLocal()
try:
    users = db.query(User).filter(User.telegram_id.isnot(None)).all()
    
    if not users:
        print("No Telegram users found.")
        print("\nTo create test Telegram users, users need to:")
        print("1. Open the Telegram mini app")
        print("2. Login through Telegram authentication")
        print("3. Their telegram_id will be automatically saved")
    else:
        print(f"Found {len(users)} Telegram user(s):\n")
        for user in users:
            print(f"User ID: {user.id}")
            print(f"  Telegram ID: {user.telegram_id}")
            print(f"  Username: @{user.telegram_username or 'N/A'}")
            print(f"  Name: {user.first_name or ''} {user.last_name or ''}")
            print()
finally:
    db.close()

