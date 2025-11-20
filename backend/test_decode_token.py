"""
Script to decode and test JWT tokens to diagnose authentication issues
"""
import sys

# Get token from command line argument
if len(sys.argv) < 2:
    print("Usage: python test_decode_token.py <token>")
    print("\nTo get your token:")
    print("1. Open browser DevTools (F12)")
    print("2. Go to Console tab")
    print("3. Type: localStorage.getItem('auth_token')")
    print("4. Copy the token and run this script with it")
    sys.exit(1)

token = sys.argv[1].strip('"\'')

print('\n=== Decoding JWT Token ===\n')

try:
    from app.utils.security import decode_token
    
    payload = decode_token(token)
    
    if payload:
        print('✓ Token is valid!')
        print(f'\nToken payload:')
        for key, value in payload.items():
            print(f'  {key}: {value}')
        
        user_id = payload.get('user_id') or payload.get('sub')
        print(f'\n✓ User ID from token: {user_id}')
        
        if user_id == 0 or user_id is None:
            print('\n❌ PROBLEM: Token has invalid user_id (0 or None)!')
            print('This explains why authentication is failing.')
        else:
            # Check if this user exists in database
            from app.database import SessionLocal
            from app.models import User
            
            db = SessionLocal()
            user = db.query(User).filter(User.id == user_id).first()
            
            if user:
                print(f'\n✓ User exists in database:')
                print(f'  ID: {user.id}')
                print(f'  Phone: {user.phone_number}')
                print(f'  Type: {user.user_type}')
            else:
                print(f'\n❌ User ID {user_id} not found in database!')
            
            db.close()
    else:
        print('❌ Token is invalid or expired!')
        print('You need to log in again.')
        
except Exception as e:
    print(f'❌ Error decoding token: {e}')
    import traceback
    traceback.print_exc()

print('\n=== Solution ===')
print('1. Clear localStorage: localStorage.clear()')
print('2. Log in again with a valid phone number')
print('3. The new token should have a valid user_id')

