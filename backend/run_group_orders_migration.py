#!/usr/bin/env python3
"""
Migration script to add Group Orders functionality to the database.
Run this script to update your database schema.
"""

import sqlite3
import os
import sys

def run_migration():
    """Run the group orders migration"""
    
    # Get the database path
    db_path = os.path.join(os.path.dirname(__file__), 'bahamm.db')
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        print("Please make sure the backend has been run at least once to create the database.")
        return False
    
    try:
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("Starting Group Orders migration...")
        
        # Read and execute the migration SQL
        migration_path = os.path.join(os.path.dirname(__file__), 'migrations', 'add_group_orders.sql')
        
        if not os.path.exists(migration_path):
            print(f"Migration file not found at {migration_path}")
            return False
            
        with open(migration_path, 'r') as f:
            migration_sql = f.read()
        
        # Split and execute each statement
        statements = migration_sql.split(';')
        
        for statement in statements:
            statement = statement.strip()
            if statement:
                try:
                    cursor.execute(statement)
                    print(f"✓ Executed: {statement[:50]}...")
                except sqlite3.Error as e:
                    if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                        print(f"⚠ Skipped (already exists): {statement[:50]}...")
                    else:
                        print(f"✗ Error: {e}")
                        print(f"Statement: {statement}")
        
        # Commit the changes
        conn.commit()
        print("\n✅ Group Orders migration completed successfully!")
        
        # Verify the new tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='group_orders';")
        if cursor.fetchone():
            print("✓ group_orders table created")
        
        cursor.execute("PRAGMA table_info(orders);")
        columns = [row[1] for row in cursor.fetchall()]
        if 'order_type' in columns:
            print("✓ orders table updated with new columns")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"Migration failed: {e}")
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1) 