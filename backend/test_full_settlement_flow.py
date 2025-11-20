"""
Test the full settlement flow for group 6 to see what's happening
"""
from app.database import SessionLocal
from app.models import GroupOrder, User, Order
from app.services.group_settlement_service import GroupSettlementService

db = SessionLocal()

print('\n=== Testing Full Settlement Flow for Group 6 ===\n')

# Step 1: Get group and verify state
group = db.query(GroupOrder).filter(GroupOrder.id == 6).first()
if not group:
    print('❌ Group 6 not found!')
    db.close()
    exit()

print(f'Step 1: Group State')
print(f'  Leader ID: {group.leader_id}')
print(f'  Expected friends: {group.expected_friends}')
print(f'  Settlement required: {group.settlement_required}')
print(f'  Settlement amount: {group.settlement_amount}')
print(f'  Settlement paid at: {group.settlement_paid_at}')

# Step 2: Count actual friends
paid_orders = db.query(Order).filter(
    Order.group_order_id == 6,
    Order.user_id != group.leader_id,
    Order.is_settlement_payment == False,
    (Order.payment_ref_id.isnot(None)) | (Order.paid_at.isnot(None))
).all()

print(f'\nStep 2: Actual Paid Friends')
print(f'  Count: {len(paid_orders)}')
for order in paid_orders:
    print(f'    - Order {order.id}: User {order.user_id}, Amount: {order.total_amount}')

# Step 3: Call settlement check
print(f'\nStep 3: Calling check_and_mark_settlement_required()')
service = GroupSettlementService(db)
result = service.check_and_mark_settlement_required(6)

print(f'\nSettlement Check Result:')
for key, value in result.items():
    print(f'  {key}: {value}')

# Step 4: Refresh and check database state
db.refresh(group)

print(f'\nStep 4: Database State After Check')
print(f'  Expected friends: {group.expected_friends}')
print(f'  Settlement required: {group.settlement_required}')
print(f'  Settlement amount: {group.settlement_amount}')

# Step 5: Simulate API response
print(f'\nStep 5: What API Would Return:')
api_response = {
    "settlement_required": group.settlement_required,
    "settlement_amount": group.settlement_amount,
    "expected_friends": group.expected_friends,
    "actual_friends": len(paid_orders),
}
print(f'  {api_response}')

# Step 6: Frontend check logic
print(f'\nStep 6: Frontend Check Logic')
print(f'  settlement_required === false? {api_response["settlement_required"] == False}')
print(f'  settlement_amount <= 0? {api_response["settlement_amount"] <= 0}')
print(f'  Condition: !chk.ok || settlement_required === false || settlement_amount <= 0')
print(f'  Would show error? {api_response["settlement_required"] == False or api_response["settlement_amount"] <= 0}')

if api_response["settlement_required"] and api_response["settlement_amount"] > 0:
    print(f'\n✅ SHOULD ALLOW PAYMENT!')
else:
    print(f'\n❌ WOULD BLOCK PAYMENT!')
    print(f'   Reason: settlement_required={api_response["settlement_required"]}, amount={api_response["settlement_amount"]}')

db.close()

