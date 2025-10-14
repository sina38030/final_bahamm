import sys
sys.path.append('/srv/app/frontend/backend')

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import GroupOrder, Order, OrderItem

# Direct database connection
DB_PATH = '/srv/app/data/bahamm1.db'
engine = create_engine(f'sqlite:///{DB_PATH}')
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

print(f'Using database: {DB_PATH}\n')

g = db.query(GroupOrder).filter(GroupOrder.id == 53).first()

if not g:
    print('Group 53 not found!')
    sys.exit(1)

print(f'Group 53 - basket_snapshot: {g.basket_snapshot}')
print(f'Group 53 - leader_id: {g.leader_id}')
print(f'Group 53 - leader_paid_at: {g.leader_paid_at}')
print(f'Group 53 - expires_at: {g.expires_at}')

orders = db.query(Order).filter(Order.group_order_id == 53, Order.is_settlement_payment == False).all()
print(f'\nOrders count: {len(orders)}')

if orders:
    leader_order = orders[0]
    print(f'\nLeader order {leader_order.id}:')
    print(f'  status: {leader_order.status}')
    print(f'  created_at: {leader_order.created_at}')
    
    items = db.query(OrderItem).filter(OrderItem.order_id == leader_order.id).all()
    print(f'  items count: {len(items)}')
    for item in items:
        print(f'    - product_id={item.product_id}: qty={item.quantity}, unit_price={item.unit_price}, base_price={item.base_price}')
