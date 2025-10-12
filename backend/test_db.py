#!/usr/bin/env python3

from app.database import get_db, engine
from sqlalchemy import text

print('Testing database connection...')
try:
    with engine.connect() as conn:
        result = conn.execute(text('SELECT COUNT(*) FROM users'))
        count = result.fetchone()[0]
        print(f'✅ Database connected! Users count: {count}')

        # Test user lookup
        result = conn.execute(text("SELECT id, phone_number FROM users WHERE phone_number LIKE '%23123%'"))
        users = result.fetchall()
        print(f'📱 Found {len(users)} users with phone containing 23123:')
        for user in users:
            print(f'   User ID: {user[0]}, Phone: {user[1]}')

        # Check all users
        result = conn.execute(text('SELECT id, phone_number FROM users LIMIT 10'))
        all_users = result.fetchall()
        print(f'📋 First 10 users:')
        for user in all_users:
            print(f'   User ID: {user[0]}, Phone: {user[1]}')

except Exception as e:
    print(f'❌ Database connection failed: {e}')
