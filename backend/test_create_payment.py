"""
Test creating settlement payment for group 6
"""
import asyncio
from app.database import SessionLocal
from app.services.payment_service import PaymentService

async def test():
    db = SessionLocal()
    service = PaymentService(db)
    
    print('\n=== Testing Settlement Payment Creation ===\n')
    
    try:
        result = await service.create_settlement_payment(
            group_order_id=6,
            user_id=5  # Leader user ID
        )
        
        print('Result:')
        for key, value in result.items():
            print(f'  {key}: {value}')
            
    except Exception as e:
        print(f'ERROR: {e}')
        import traceback
        traceback.print_exc()
    
    db.close()

asyncio.run(test())

