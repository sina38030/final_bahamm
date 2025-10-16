import sqlite3

conn = sqlite3.connect("/srv/app/frontend/bahamm1.db")
cursor = conn.cursor()

# Find a recent group
cursor.execute("SELECT id, leader_id FROM group_orders ORDER BY id DESC LIMIT 5")
groups = cursor.fetchall()
print("Recent groups:", groups)

# Update the first group to have Telegram user as leader
if groups:
    group_id = groups[0][0]
    cursor.execute("UPDATE group_orders SET leader_id = 2 WHERE id = ?", (group_id,))
    conn.commit()
    print(f"Updated group {group_id} to have Telegram leader (user_id=2)")
    
    # Verify
    cursor.execute("""
        SELECT g.id, g.leader_id, g.invite_token, u.telegram_id, u.telegram_username
        FROM group_orders g
        JOIN users u ON g.leader_id = u.id
        WHERE g.id = ?
    """, (group_id,))
    result = cursor.fetchone()
    print(f"Verified: group_id={result[0]}, leader_id={result[1]}, invite={result[2]}, telegram_id={result[3]}, username={result[4]}")

conn.close()

