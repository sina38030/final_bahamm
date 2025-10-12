import sqlite3

# Check the backup database content
db_path = "C:/Users/User/OneDrive/Desktop/final project/backend/bahamm.db.bak"
print(f"Checking backup database: {db_path}")

try:
    con = sqlite3.connect(db_path)
    cur = con.cursor()
    
    print("\n=== BACKUP PRODUCTS ===")
    cur.execute('SELECT id, name FROM products LIMIT 5')
    for row in cur.fetchall():
        print(f"  ID {row[0]}: {row[1]}")
    
    print("\n=== BACKUP GROUP ORDERS ===")
    cur.execute('SELECT id, invite_code FROM group_orders LIMIT 5')
    for row in cur.fetchall():
        print(f"  ID {row[0]}: {row[1]}")
    
    print("\n=== BACKUP USERS ===")
    cur.execute('SELECT id, phone_number FROM users LIMIT 5')
    for row in cur.fetchall():
        print(f"  ID {row[0]}: {row[1]}")
    
    print(f"\n=== TOTALS ===")
    cur.execute('SELECT COUNT(*) FROM products')
    print(f"Products: {cur.fetchone()[0]}")
    cur.execute('SELECT COUNT(*) FROM orders')
    print(f"Orders: {cur.fetchone()[0]}")
    cur.execute('SELECT COUNT(*) FROM group_orders')
    print(f"Group Orders: {cur.fetchone()[0]}")
    cur.execute('SELECT COUNT(*) FROM users')
    print(f"Users: {cur.fetchone()[0]}")
        
    con.close()
    print("\nIs THIS your real data with 100+ orders?")
    
except Exception as e:
    print(f"Error: {e}")

