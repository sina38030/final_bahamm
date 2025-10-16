import sqlite3

conn = sqlite3.connect("/srv/app/frontend/backend/bahamm1.db")
cursor = conn.cursor()

print("=== All users with their telegram status ===")
cursor.execute("""
    SELECT id, phone_number, telegram_id, telegram_username, first_name, last_name
    FROM users
    ORDER BY id DESC
    LIMIT 10
""")

for row in cursor.fetchall():
    user_id, phone, tg_id, tg_username, fname, lname = row
    name = f"{fname or ''} {lname or ''}".strip()
    print(f"User {user_id}: phone={phone}, telegram_id={tg_id}, username={tg_username}, name={name}")

print("\n=== Recent groups with their leaders ===")
cursor.execute("""
    SELECT g.id, g.leader_id, g.invite_token, g.created_at,
           u.phone_number, u.telegram_id, u.telegram_username, u.first_name
    FROM group_orders g
    JOIN users u ON g.leader_id = u.id
    ORDER BY g.id DESC
    LIMIT 10
""")

for row in cursor.fetchall():
    gid, leader_id, invite, created, phone, tg_id, tg_username, fname = row
    status = "TELEGRAM" if tg_id else "PHONE"
    identifier = f"@{tg_username}" if tg_username else (f"TG:{tg_id}" if tg_id else phone)
    print(f"Group {gid}: leader_id={leader_id}, type={status}, identifier={identifier}, created={created}")

conn.close()

