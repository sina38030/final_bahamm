#!/usr/bin/env python3
"""
Migration script to add missing fields to categories table
"""

import sqlite3
import sys
from pathlib import Path

def run_migration():
    # Database path
    db_path = Path("bahamm.db")
    
    if not db_path.exists():
        print(f"Database file {db_path} not found!")
        return False
    
    # Read migration SQL
    migration_path = Path("migrations/add_category_fields.sql")
    if not migration_path.exists():
        print(f"Migration file {migration_path} not found!")
        return False
    
    with open(migration_path, 'r') as f:
        migration_sql = f.read()
    
    # Connect to database and run migration
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Split SQL statements and execute each one
        statements = migration_sql.split(';')
        
        for statement in statements:
            statement = statement.strip()
            if statement and not statement.startswith('--'):
                try:
                    cursor.execute(statement)
                    print(f"✓ Executed: {statement[:50]}...")
                except sqlite3.OperationalError as e:
                    if "duplicate column name" in str(e).lower():
                        print(f"⚠ Column already exists: {statement[:50]}...")
                    else:
                        print(f"✗ Error: {e}")
                        return False
        
        conn.commit()
        print("✓ Migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"✗ Migration failed: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1) 