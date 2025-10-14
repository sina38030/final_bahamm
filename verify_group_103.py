import sys
sys.path.append('/srv/app/frontend/backend')

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import GroupOrder

# Direct database connection
DB_PATH = '/srv/app/data/bahamm1.db'
engine = create_engine(f'sqlite:///{DB_PATH}')
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

g = db.query(GroupOrder).filter(GroupOrder.id == 103).first()

if not g:
    print('Group 103 not found!')
else:
    print(f'Group 103:')
    print(f'  id: {g.id}')
    print(f'  invite_token: {g.invite_token}')
    print(f'  leader_id: {g.leader_id}')
    print(f'  basket_snapshot: {g.basket_snapshot}')
    print(f'  leader_paid_at: {g.leader_paid_at}')
    print(f'  expires_at: {g.expires_at}')
    print(f'  status: {g.status}')

