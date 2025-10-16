import sqlite3

# Check which database backend is using
print("Checking /srv/app/frontend/bahamm1.db:")
conn1 = sqlite3.connect("/srv/app/frontend/bahamm1.db")
cursor1 = conn1.cursor()
cursor1.execute("SELECT id, leader_id FROM group_orders WHERE id = 2")
result1 = cursor1.fetchone()
print(f"  Group 2: leader_id={result1[1] if result1 else 'NOT FOUND'}")
conn1.close()

print("\nChecking /srv/app/frontend/backend/bahamm1.db:")
try:
    conn2 = sqlite3.connect("/srv/app/frontend/backend/bahamm1.db")
    cursor2 = conn2.cursor()
    cursor2.execute("SELECT id, leader_id FROM group_orders WHERE id = 2")
    result2 = cursor2.fetchone()
    print(f"  Group 2: leader_id={result2[1] if result2 else 'NOT FOUND'}")
    
    # Update this one too
    print("\nUpdating backend database...")
    cursor2.execute("UPDATE group_orders SET leader_id = 2 WHERE id = 2")
    conn2.commit()
    print("  Updated!")
    
    cursor2.execute("SELECT id, leader_id FROM group_orders WHERE id = 2")
    result3 = cursor2.fetchone()
    print(f"  Verified: leader_id={result3[1]}")
    
    conn2.close()
except Exception as e:
    print(f"  Error: {e}")

