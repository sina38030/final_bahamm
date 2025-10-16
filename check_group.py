import sqlite3

conn = sqlite3.connect("/srv/app/frontend/bahamm1.db")
cursor = conn.cursor()

cursor.execute("""
    SELECT g.id, g.leader_id, u.id as user_id, u.phone_number, u.telegram_id, u.telegram_username, u.first_name
    FROM group_orders g
    JOIN users u ON g.leader_id = u.id
    WHERE g.id = 2
""")

result = cursor.fetchone()
if result:
    print(f"Group ID: {result[0]}")
    print(f"Leader ID: {result[1]}")
    print(f"User ID: {result[2]}")
    print(f"Phone: {result[3]}")
    print(f"Telegram ID: {result[4]}")
    print(f"Telegram Username: {result[5]}")
    print(f"First Name: {result[6]}")
else:
    print("Group not found")

conn.close()

