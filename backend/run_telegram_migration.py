"""
Migration script to add Telegram authentication fields to users table.

This script applies the add_telegram_fields.sql migration.
Run this before starting the server with Telegram authentication enabled.
"""

import sqlite3
import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from app.config import get_settings

def run_migration():
    """Apply the Telegram fields migration to the database."""
    settings = get_settings()
    
    # Extract database path from DATABASE_URL
    # Format: sqlite:///path/to/db.db
    db_url = settings.DATABASE_URL
    if db_url.startswith('sqlite:///'):
        db_path = db_url.replace('sqlite:///', '')
    else:
        print(f"Error: Unsupported database URL format: {db_url}")
        return False
    
    # Check if database exists
    if not os.path.exists(db_path):
        print(f"Error: Database not found at {db_path}")
        return False
    
    print(f"Applying Telegram fields migration to: {db_path}")
    
    # Read migration SQL
    migration_file = Path(__file__).parent / 'migrations' / 'add_telegram_fields.sql'
    if not migration_file.exists():
        print(f"Error: Migration file not found at {migration_file}")
        return False
    
    with open(migration_file, 'r') as f:
        migration_sql = f.read()
    
    # Apply migration
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Split by semicolon and execute each statement
        statements = [s.strip() for s in migration_sql.split(';') if s.strip() and not s.strip().startswith('--')]
        
        for statement in statements:
            print(f"Executing: {statement[:50]}...")
            try:
                cursor.execute(statement)
            except sqlite3.OperationalError as e:
                # If column already exists, that's okay
                if 'duplicate column name' in str(e).lower() or 'already exists' in str(e).lower():
                    print(f"  → Already applied (column/index exists)")
                else:
                    raise
        
        conn.commit()
        print("\n✓ Migration applied successfully!")
        
        # Verify the columns were added
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        telegram_columns = [col for col in columns if 'telegram' in col[1].lower()]
        
        print(f"\nTelegram columns in users table:")
        for col in telegram_columns:
            print(f"  - {col[1]} ({col[2]})")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"\n✗ Migration failed: {str(e)}")
        return False

def rollback_migration():
    """Rollback the Telegram fields migration (remove columns)."""
    settings = get_settings()
    
    db_url = settings.DATABASE_URL
    if db_url.startswith('sqlite:///'):
        db_path = db_url.replace('sqlite:///', '')
    else:
        print(f"Error: Unsupported database URL format: {db_url}")
        return False
    
    print(f"Rolling back Telegram fields migration from: {db_path}")
    print("Warning: SQLite doesn't support DROP COLUMN directly.")
    print("You may need to recreate the table to remove columns.")
    
    # For SQLite, we can only drop the index
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("DROP INDEX IF EXISTS idx_users_telegram_id")
        conn.commit()
        print("✓ Index removed")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"✗ Rollback failed: {str(e)}")
        return False

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Apply or rollback Telegram fields migration')
    parser.add_argument('--rollback', action='store_true', help='Rollback the migration')
    args = parser.parse_args()
    
    if args.rollback:
        success = rollback_migration()
    else:
        success = run_migration()
    
    sys.exit(0 if success else 1)

