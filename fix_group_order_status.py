#!/usr/bin/env python3
"""Fix group order status from 'active' to 'GROUP_FORMING'"""
import sqlite3

db = sqlite3.connect("bahamm1.db")
c = db.cursor()

print("Fixing group order status...")

# Check current status
c.execute("SELECT id, status FROM group_orders")
rows = c.fetchall()

if rows:
    print(f"Found {len(rows)} group orders:")
    for row in rows:
        print(f"  ID {row[0]}: status={row[1]}")
        
    # Update status
    c.execute("UPDATE group_orders SET status = 'GROUP_FORMING' WHERE status = 'active'")
    updated = c.rowcount
    
    db.commit()
    
    print(f"\n[OK] Updated {updated} group order(s)")
    
    # Verify
    c.execute("SELECT id, status FROM group_orders")
    rows = c.fetchall()
    
    print("\nAfter fix:")
    for row in rows:
        print(f"  ID {row[0]}: status={row[1]}")
else:
    print("No group orders found")

db.close()
print("\nDone!")

