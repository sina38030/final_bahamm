import sqlite3

# Connect to database
conn = sqlite3.connect("bahamm.db")
cursor = conn.cursor()

# Check if categories table exists
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='categories'")
table_exists = cursor.fetchone()
print(f"Categories table exists: {table_exists is not None}")

if table_exists:
    # Get table info
    cursor.execute("PRAGMA table_info(categories)")
    columns = cursor.fetchall()
    print("Table columns:")
    for col in columns:
        print(f"  {col[1]} ({col[2]})")
    
    # Count rows
    cursor.execute("SELECT COUNT(*) FROM categories")
    count = cursor.fetchone()[0]
    print(f"Number of categories: {count}")
    
    # Try to select all
    cursor.execute("SELECT * FROM categories LIMIT 5")
    rows = cursor.fetchall()
    print("Sample data:")
    for row in rows:
        print(f"  {row}")

conn.close() 