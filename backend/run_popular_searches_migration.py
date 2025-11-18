#!/usr/bin/env python3
"""
Migration script to add popular_searches table.
"""

import sqlite3
import os
import sys


def run_migration():
    # Try both database names
    db_names = ['bahamm1.db', 'bahamm.db', 'app.db']
    db_path = None
    
    for db_name in db_names:
        path = os.path.join(os.path.dirname(__file__), db_name)
        if os.path.exists(path):
            db_path = path
            print(f"Found database at {db_path}")
            break
    
    if not db_path:
        print(f"Database not found. Tried: {db_names}")
        return False

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        migration_path = os.path.join(os.path.dirname(__file__), 'migrations', 'add_popular_searches.sql')
        if not os.path.exists(migration_path):
            print(f"Migration file not found at {migration_path}")
            return False

        with open(migration_path, 'r', encoding='utf-8') as f:
            sql = f.read()

        for stmt in sql.split(';'):
            s = stmt.strip()
            if not s:
                continue
            try:
                cursor.execute(s)
                print(f"[OK] Executed: {s[:80]}...")
            except sqlite3.Error as e:
                msg = str(e).lower()
                if 'already exists' in msg or 'duplicate' in msg:
                    print(f"[SKIP] Already exists: {s[:80]}...")
                else:
                    print(f"[ERROR] {e}")
                    print(f"Statement: {s}")

        conn.commit()
        conn.close()
        print("[SUCCESS] Popular searches migration completed")
        return True
    except Exception as e:
        print(f"Migration failed: {e}")
        return False


if __name__ == '__main__':
    ok = run_migration()
    sys.exit(0 if ok else 1)

