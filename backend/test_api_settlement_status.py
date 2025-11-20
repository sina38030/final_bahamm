from app.database import SessionLocal
from app.models import GroupOrder, User
from app.services.group_settlement_service import GroupSettlementService

db = SessionLocal()

print('\n=== Simulating API Call: /api/group-orders/settlement-status/6 ===\n')

# Get the group
group_order = db.query(GroupOrder).filter(GroupOrder.id == 6).first()
if not group_order:
    print('Group 6 not found')
    db.close()
    exit()

print(f'Group 6 leader_id: {group_order.leader_id}')

# Get the leader user
leader = db.query(User).filter(User.id == group_order.leader_id).first()
if leader:
    print(f'Leader phone: {leader.phone_number}')
    print(f'Leader user_type: {leader.user_type}')

# Simulate the API call - recompute settlement
print('\nRecomputing settlement...')
settlement_service = GroupSettlementService(db)
result = settlement_service.check_and_mark_settlement_required(6)

print('\nSettlement service result:')
for key, value in result.items():
    print(f'  {key}: {value}')

# Refresh and check database state
db.refresh(group_order)

print('\nFinal API Response would be:')
response = {
    "group_order_id": 6,
    "expected_friends": group_order.expected_friends,
    "actual_friends": result.get("actual_friends"),
    "settlement_required": group_order.settlement_required,
    "settlement_amount": group_order.settlement_amount,
    "settlement_paid": group_order.settlement_paid_at is not None,
}

for key, value in response.items():
    print(f'  {key}: {value}')

print('\nFrontend check:')
print(f'  settlement_required === false? {response["settlement_required"] == False}')
print(f'  settlement_amount <= 0? {(response["settlement_amount"] or 0) <= 0}')
print(f'  Would show error? {response["settlement_required"] == False or (response["settlement_amount"] or 0) <= 0}')

db.close()

