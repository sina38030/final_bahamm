import sqlite3

# Check the real database content
db_path = "C:/Users/User/OneDrive/Desktop/final project/bahamm.db"
print(f"Checking database: {db_path}")

try:
    con = sqlite3.connect(db_path)
    cur = con.cursor()
    
    print("\n=== REAL PRODUCTS ===")
    cur.execute('SELECT id, name FROM products LIMIT 5')
    for row in cur.fetchall():
        print(f"  ID {row[0]}: {row[1]}")
    
    print("\n=== REAL GROUP ORDERS ===")
    cur.execute('SELECT id, invite_code FROM group_orders LIMIT 5')
    for row in cur.fetchall():
        print(f"  ID {row[0]}: {row[1]}")
    
    print("\n=== REAL USERS ===")
    cur.execute('SELECT id, phone_number FROM users LIMIT 5')
    for row in cur.fetchall():
        print(f"  ID {row[0]}: {row[1]}")
        
    con.close()
    print("\nThis should be your REAL data!")
    
except Exception as e:
    print(f"Error: {e}")

