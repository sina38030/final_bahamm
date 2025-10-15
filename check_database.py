#!/usr/bin/env python3
"""Quick database check"""
import sqlite3

db = sqlite3.connect("bahamm1.db")
c = db.cursor()

print("\n=== DATABASE STATUS ===\n")

# Check products
c.execute("SELECT COUNT(*) FROM products WHERE is_active = 1")
active = c.fetchone()[0]
c.execute("SELECT COUNT(*) FROM products")
total = c.fetchone()[0]
print(f"Products: {active} active / {total} total")

# Check users
c.execute("SELECT COUNT(*) FROM users")
users = c.fetchone()[0]
print(f"Users: {users}")

# Check orders
c.execute("SELECT COUNT(*) FROM orders")
orders = c.fetchone()[0]
print(f"Orders: {orders}")

# Check group_orders
c.execute("SELECT COUNT(*) FROM group_orders")
groups = c.fetchone()[0]
print(f"Group Orders: {groups}")

# If no active products, show inactive ones
if active == 0 and total > 0:
    print("\n[WARN] All products are inactive!")
    print("Showing first 5 inactive products:")
    c.execute("SELECT id, name, is_active FROM products LIMIT 5")
    for row in c.fetchall():
        print(f"  ID {row[0]}: {row[1]} (active={row[2]})")

db.close()

