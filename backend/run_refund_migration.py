#!/usr/bin/env python3
"""
Migration script to add refund payout fields to group_orders table.
"""

import sqlite3
import os
import sys


def run_migration():
    db_path = os.path.join(os.path.dirname(__file__), 'bahamm.db')
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return False

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        migration_path = os.path.join(os.path.dirname(__file__), 'migrations', 'add_refund_fields.sql')
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
                print(f"✓ Executed: {s[:80]}...")
            except sqlite3.Error as e:
                msg = str(e).lower()
                if 'duplicate column name' in msg or 'already exists' in msg:
                    print(f"⚠ Skipped (already exists): {s[:80]}...")
                else:
                    print(f"✗ Error: {e}")
                    print(f"Statement: {s}")

        conn.commit()
        conn.close()
        print("✅ Refund migration completed")
        return True
    except Exception as e:
        print(f"Migration failed: {e}")
        return False


if __name__ == '__main__':
    ok = run_migration()
    sys.exit(0 if ok else 1)


