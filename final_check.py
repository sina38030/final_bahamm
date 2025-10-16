import sqlite3

conn = sqlite3.connect("/srv/app/frontend/backend/bahamm1.db")
cursor = conn.cursor()

print("Checking group 2 leader:")
cursor.execute("""
    SELECT g.id, g.leader_id, u.id, u.phone_number, u.telegram_id, u.telegram_username, u.first_name, u.last_name
    FROM group_orders g
    JOIN users u ON g.leader_id = u.id
    WHERE g.id = 2
""")

result = cursor.fetchone()
if result:
    print(f"  Group ID: {result[0]}")
    print(f"  Leader ID (from group): {result[1]}")
    print(f"  User ID: {result[2]}")
    print(f"  Phone: {result[3]}")
    print(f"  Telegram ID: {result[4]}")
    print(f"  Telegram Username: {result[5]}")
    print(f"  First Name: {result[6]}")
    print(f"  Last Name: {result[7]}")

print("\nAll users:")
cursor.execute("SELECT id, phone_number, telegram_id, telegram_username, first_name FROM users LIMIT 5")
for row in cursor.fetchall():
    print(f"  User {row[0]}: phone={row[1]}, telegram_id={row[2]}, username={row[3]}, name={row[4]}")

conn.close()

