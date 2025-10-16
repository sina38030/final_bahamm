import sqlite3
from datetime import datetime, timedelta

conn = sqlite3.connect("/srv/app/frontend/backend/bahamm1.db")
cursor = conn.cursor()

# Create Telegram user
now = datetime.now().isoformat()
cursor.execute("""
    INSERT INTO users (phone_number, telegram_id, telegram_username, first_name, last_name, user_type, is_phone_verified, created_at)
    VALUES (NULL, '987654321', 'realTelegramUser', 'رضا', 'تلگرامی', 'CUSTOMER', 1, ?)
""", (now,))

telegram_user_id = cursor.lastrowid
print(f"Created Telegram user with ID: {telegram_user_id}")

# Update a group to use this user
cursor.execute("UPDATE group_orders SET leader_id = ? WHERE id = 2", (telegram_user_id,))

conn.commit()

# Verify
cursor.execute("""
    SELECT g.id, g.leader_id, u.phone_number, u.telegram_id, u.telegram_username, u.first_name
    FROM group_orders g
    JOIN users u ON g.leader_id = u.id
    WHERE g.id = 2
""")
result = cursor.fetchone()
print(f"\nVerified:")
print(f"  Group {result[0]}, Leader ID: {result[1]}")
print(f"  Phone: {result[2]}")
print(f"  Telegram ID: {result[3]}")
print(f"  Telegram Username: @{result[4]}")
print(f"  Name: {result[5]}")

conn.close()

