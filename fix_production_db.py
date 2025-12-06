"""Fix production database - add missing is_invited_checkout column"""
import sqlite3

db_path = "/srv/app/bahamm1.db"

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if column exists
    cursor.execute("PRAGMA table_info(orders)")
    columns = [row[1] for row in cursor.fetchall()]
    
    if 'is_invited_checkout' in columns:
        print("✅ Column is_invited_checkout already exists")
    else:
        print("Adding is_invited_checkout column...")
        cursor.execute("ALTER TABLE orders ADD COLUMN is_invited_checkout BOOLEAN DEFAULT 0")
        conn.commit()
        print("✅ Column is_invited_checkout added successfully!")
    
    conn.close()
    print("\n✅ Database migration complete!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    print(traceback.format_exc())

