from app.database import SessionLocal
from app.services.group_settlement_service import GroupSettlementService

db = SessionLocal()
service = GroupSettlementService(db)

print('\n=== Testing Settlement Check for Group 6 ===\n')
result = service.check_and_mark_settlement_required(6)

print('Result:')
for key, value in result.items():
    print(f'  {key}: {value}')

print('\n=== After Check - Database State ===')
from app.models import GroupOrder
g = db.query(GroupOrder).filter(GroupOrder.id == 6).first()
if g:
    print(f'expected_friends: {g.expected_friends}')
    print(f'settlement_required: {g.settlement_required}')
    print(f'settlement_amount: {g.settlement_amount}')

db.close()

