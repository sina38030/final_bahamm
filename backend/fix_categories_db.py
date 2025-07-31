#!/usr/bin/env python3
"""
Fix categories table by recreating it with correct structure
"""

import sqlite3
from pathlib import Path

def fix_categories_table():
    db_path = Path("bahamm.db")
    
    if not db_path.exists():
        print("Database file not found!")
        return False
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Backup existing data
        print("1. Backing up existing categories...")
        cursor.execute("SELECT id, name, slug, image_url FROM categories")
        existing_data = cursor.fetchall()
        print(f"   Found {len(existing_data)} existing categories")
        
        # Drop and recreate table
        print("2. Dropping old categories table...")
        cursor.execute("DROP TABLE IF EXISTS categories")
        
        print("3. Creating new categories table...")
        cursor.execute("""
            CREATE TABLE categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(50) UNIQUE NOT NULL,
                slug VARCHAR(100) UNIQUE NOT NULL,
                image_url VARCHAR(255),
                description TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Restore data with new fields
        print("4. Restoring data with new fields...")
        for row in existing_data:
            cursor.execute("""
                INSERT INTO categories (id, name, slug, image_url, description, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            """, (row[0], row[1], row[2], row[3], None, True))
        
        # Add some default categories if none exist
        if not existing_data:
            print("5. Adding default categories...")
            default_categories = [
                ("میوه و سبزیجات", "fruits-vegetables", None, "دسته‌بندی میوه‌ها و سبزیجات تازه"),
                ("لبنیات", "dairy", None, "محصولات لبنی و پنیر"),
                ("نان و غلات", "bread-grains", None, "انواع نان و محصولات غلات"),
                ("گوشت و پروتئین", "meat-protein", None, "گوشت، مرغ و محصولات پروتئینی"),
                ("خشکبار", "nuts", None, "انواع خشکبار و آجیل")
            ]
            
            for name, slug, image_url, description in default_categories:
                cursor.execute("""
                    INSERT INTO categories (name, slug, image_url, description, is_active, created_at)
                    VALUES (?, ?, ?, ?, ?, datetime('now'))
                """, (name, slug, image_url, description, True))
        
        conn.commit()
        print("✓ Categories table fixed successfully!")
        
        # Verify the fix
        cursor.execute("PRAGMA table_info(categories)")
        columns = cursor.fetchall()
        print("\nNew table structure:")
        for col in columns:
            print(f"  {col[1]} ({col[2]})")
        
        cursor.execute("SELECT COUNT(*) FROM categories")
        count = cursor.fetchone()[0]
        print(f"\nTotal categories: {count}")
        
        return True
        
    except Exception as e:
        print(f"✗ Error fixing categories table: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    success = fix_categories_table()
    if success:
        print("\n✓ Database fix completed! You can now start the servers.")
    else:
        print("\n✗ Database fix failed!") 