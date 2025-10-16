import sqlite3
import json
from datetime import datetime, timedelta

conn = sqlite3.connect("/srv/app/frontend/bahamm1.db")
cursor = conn.cursor()

# Create test group
basket = json.dumps([{"product_id": 1, "quantity": 2, "unit_price": 50000, "product_name": "Test Product"}])
now = datetime.now().isoformat()
expires = (datetime.now() + timedelta(hours=24)).isoformat()

cursor.execute(
    "INSERT INTO group_orders (leader_id, invite_token, status, created_at, expires_at, basket_snapshot, leader_paid_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    (2, "TEST_TG_001", "GROUP_FORMING", now, expires, basket, now)
)

conn.commit()

# Verify
cursor.execute("SELECT id, leader_id, invite_token, status FROM group_orders WHERE invite_token = ?", ("TEST_TG_001",))
result = cursor.fetchone()
print(f"Created group: id={result[0]}, leader_id={result[1]}, invite_token={result[2]}, status={result[3]}")

conn.close()

