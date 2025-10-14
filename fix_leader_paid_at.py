"""
اسکریپت برای fix کردن leader_paid_at برای گروه‌هایی که expires_at دارند اما leader_paid_at ندارند
"""
import sys
import os
sys.path.append('/srv/app/frontend/backend')

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import GroupOrder, Order
from datetime import datetime, timedelta, timezone

# Tehran timezone: UTC+3:30
TEHRAN_TZ = timezone(timedelta(hours=3, minutes=30))

# Direct database connection
DB_PATH = '/srv/app/data/bahamm1.db'
engine = create_engine(f'sqlite:///{DB_PATH}')
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

print(f'🔧 Using database: {DB_PATH}\n')

try:
    # Find groups with expires_at but without leader_paid_at
    groups = db.query(GroupOrder).filter(
        GroupOrder.expires_at != None,
        GroupOrder.leader_paid_at == None
    ).all()
    
    print(f'📊 Found {len(groups)} groups with expires_at but no leader_paid_at\n')
    
    fixed_count = 0
    for group in groups:
        print(f'--- Group {group.id} ---')
        
        # Calculate leader_paid_at as 24 hours before expires_at
        if group.expires_at:
            # Make sure expires_at is timezone-aware
            if group.expires_at.tzinfo is None:
                expires_at = group.expires_at.replace(tzinfo=TEHRAN_TZ)
            else:
                expires_at = group.expires_at
            
            leader_paid_at = expires_at - timedelta(hours=24)
            
            print(f'  expires_at: {expires_at}')
            print(f'  calculated leader_paid_at: {leader_paid_at}')
            
            group.leader_paid_at = leader_paid_at
            fixed_count += 1
            print(f'  ✅ Fixed!')
        
    db.commit()
    print(f'\n{"="*60}')
    print(f'✅ Successfully fixed {fixed_count} groups')
    print(f'{"="*60}\n')
    
except Exception as e:
    print(f'\n❌ Error: {e}')
    db.rollback()
    raise
finally:
    db.close()

