import sqlite3

conn = sqlite3.connect("/srv/app/frontend/backend/bahamm1.db")
cursor = conn.cursor()

print("=== Users with both telegram_id AND phone_number ===")
cursor.execute("""
    SELECT id, phone_number, telegram_id, telegram_username, first_name
    FROM users
    WHERE telegram_id IS NOT NULL AND phone_number IS NOT NULL
    ORDER BY id DESC
""")

users_with_both = cursor.fetchall()
if users_with_both:
    for row in users_with_both:
        print(f"  User {row[0]}: phone={row[1]}, telegram_id={row[2]}, username={row[3]}, name={row[4]}")
else:
    print("  None found")

print("\n=== Checking for potential duplicates (same phone or similar name) ===")
cursor.execute("""
    SELECT u1.id as id1, u1.phone_number as phone1, u1.telegram_id as tg1, u1.first_name as name1,
           u2.id as id2, u2.phone_number as phone2, u2.telegram_id as tg2, u2.first_name as name2
    FROM users u1
    JOIN users u2 ON (u1.phone_number = u2.phone_number OR u1.first_name = u2.first_name)
    WHERE u1.id < u2.id 
      AND u1.phone_number IS NOT NULL
      AND u2.phone_number IS NOT NULL
    LIMIT 10
""")

duplicates = cursor.fetchall()
if duplicates:
    for row in duplicates:
        print(f"  User {row[0]} (phone={row[1]}, tg={row[2]}, name={row[3]})")
        print(f"    ↔ User {row[4]} (phone={row[5]}, tg={row[6]}, name={row[7]})")
        print()
else:
    print("  None found")

conn.close()

