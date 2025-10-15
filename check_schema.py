import sqlite3
db = sqlite3.connect("bahamm1.db")
c = db.cursor()
c.execute("PRAGMA table_info(order_items)")
for row in c.fetchall():
    print(row)
db.close()

