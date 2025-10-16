import sqlite3
import json
from datetime import datetime, timedelta

conn = sqlite3.connect("/srv/app/frontend/backend/bahamm1.db")
cursor = conn.cursor()

# Use user 14 (@sheynsupport2) as leader
telegram_user_id = 14

# Create test group
basket = json.dumps([{"product_id": 1, "quantity": 1, "unit_price": 100000, "product_name": "تست تلگرام"}])
now = datetime.now().isoformat()
expires = (datetime.now() + timedelta(hours=24)).isoformat()

cursor.execute("""
INSERT INTO group_orders (leader_id, invite_token, status, created_at, expires_at, basket_snapshot, leader_paid_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
""", (telegram_user_id, "TEST_TG_REAL", "GROUP_FORMING", now, expires, basket, now))

new_group_id = cursor.lastrowid
conn.commit()

print(f"Created test group ID: {new_group_id}")
print(f"Leader: user_id={telegram_user_id}")

# Verify
cursor.execute("""
    SELECT g.id, g.invite_token, u.phone_number, u.telegram_id, u.telegram_username, u.first_name
    FROM group_orders g
    JOIN users u ON g.leader_id = u.id
    WHERE g.id = ?
""", (new_group_id,))

result = cursor.fetchone()
print(f"\nVerified:")
print(f"  Group ID: {result[0]}")
print(f"  Invite: {result[1]}")
print(f"  Phone: {result[2]}")
print(f"  Telegram ID: {result[3]}")
print(f"  Username: @{result[4]}")
print(f"  Name: {result[5]}")

conn.close()

