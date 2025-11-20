from app.database import SessionLocal
from app.models import GroupOrder, Order

db = SessionLocal()

print('\n=== Group 4 Analysis ===')
g = db.query(GroupOrder).filter(GroupOrder.id == 4).first()
if g:
    print(f'Expected friends: {g.expected_friends}')
    print(f'Settlement required: {g.settlement_required}')
    
    orders = db.query(Order).filter(
        Order.group_order_id == 4, 
        Order.is_settlement_payment == False
    ).all()
    
    paid_friends = [o for o in orders if o.user_id != g.leader_id and (o.payment_ref_id or o.paid_at)]
    print(f'Paid friends: {len(paid_friends)}')
    print(f'\nExpected: {g.expected_friends}, Actual: {len(paid_friends)}')
    
    if g.expected_friends == len(paid_friends):
        print('-> Match! No settlement needed (correct behavior)')
    
    leader_orders = [o for o in orders if o.user_id == g.leader_id]
    if leader_orders:
        leader_order = leader_orders[0]
        print(f'\nLeader order delivery_slot:')
        print(leader_order.delivery_slot[:500] if leader_order.delivery_slot else None)
else:
    print('Group 4 not found')

db.close()

