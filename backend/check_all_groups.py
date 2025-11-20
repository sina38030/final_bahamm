from app.database import SessionLocal
from app.models import GroupOrder, Order
import json

db = SessionLocal()

print('\n=== All Groups Analysis ===\n')
groups = db.query(GroupOrder).order_by(GroupOrder.id.desc()).limit(10).all()

for g in groups:
    orders = db.query(Order).filter(
        Order.group_order_id == g.id, 
        Order.is_settlement_payment == False
    ).all()
    
    paid_friends = [o for o in orders if o.user_id != g.leader_id and (o.payment_ref_id or o.paid_at)]
    
    print(f'Group {g.id}:')
    print(f'  Expected: {g.expected_friends}, Actual: {len(paid_friends)}')
    print(f'  Settlement: {g.settlement_required} (Amount: {g.settlement_amount})')
    
    # Check leader's delivery_slot for expected_friends
    leader_orders = [o for o in orders if o.user_id == g.leader_id]
    if leader_orders and leader_orders[0].delivery_slot:
        try:
            slot_data = json.loads(leader_orders[0].delivery_slot)
            if 'expected_friends' in slot_data:
                print(f'  ** delivery_slot has expected_friends: {slot_data["expected_friends"]} **')
        except:
            pass
    
    if g.expected_friends != len(paid_friends):
        if g.settlement_required:
            print(f'  [OK] Correctly requires settlement')
        else:
            print(f'  [WARNING] Should require settlement but doesn\'t!')
    print()

db.close()
