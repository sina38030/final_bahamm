from app.database import SessionLocal
from app.models import User

db = SessionLocal()

print('\n=== Checking Users in Database ===\n')

users = db.query(User).all()
print(f'Total users: {len(users)}\n')

for user in users:
    print(f'User ID: {user.id}')
    print(f'  Phone: {user.phone_number}')
    print(f'  Type: {user.user_type}')
    first_name = getattr(user, "first_name", None)
    if first_name:
        try:
            print(f'  First Name: {first_name}')
        except:
            print(f'  First Name: [Persian text]')
    print()

# Check if there's a user with ID 0
user_zero = db.query(User).filter(User.id == 0).first()
if user_zero:
    print('⚠️ User with ID 0 exists!')
    print(f'  Phone: {user_zero.phone_number}')
else:
    print('✓ No user with ID 0')

db.close()

