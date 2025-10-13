import sqlite3

conn = sqlite3.connect('bahamm1.db')
cur = conn.cursor()

# Check tables
tables = cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
print("Tables:", [t[0] for t in tables])

# Check counts
try:
    products = cur.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    print(f"Products: {products}")
except:
    print("Products: N/A")

try:
    users = cur.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    print(f"Users: {users}")
except:
    print("Users: N/A")

try:
    categories = cur.execute("SELECT COUNT(*) FROM categories").fetchone()[0]
    print(f"Categories: {categories}")
except:
    print("Categories: N/A")

try:
    orders = cur.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
    print(f"Orders: {orders}")
except:
    print("Orders: N/A")

conn.close()

