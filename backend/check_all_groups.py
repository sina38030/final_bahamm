import sqlite3
conn = sqlite3.connect('bahamm.db')
cursor = conn.cursor()

# Get recent groups
cursor.execute("""
    SELECT id, invite_code, status, expected_friends, settlement_required, created_at 
    FROM group_orders 
    ORDER BY created_at DESC 
    LIMIT 10
""")
groups = cursor.fetchall()

print("Recent groups:")
for g in groups:
    print(f"ID: {g[0]}, Code: {g[1]}, Status: {g[2]}, Expected: {g[3]}, Settlement: {g[4]}, Created: {g[5]}")

# Check orders with pending settlement status
cursor.execute("""
    SELECT id, user_id, group_order_id, status, total_amount, created_at
    FROM orders 
    WHERE status = 'در انتظار تسویه'
""")
pending = cursor.fetchall()

print(f"\nOrders with 'در انتظار تسویه' status: {len(pending)}")
for p in pending:
    print(f"  Order {p[0]}: User {p[1]}, Group {p[2]}, Amount: {p[4]}")

conn.close()
