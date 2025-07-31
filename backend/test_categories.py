#!/usr/bin/env python3
import sqlite3
from datetime import datetime
from pathlib import Path

def test_categories_table():
    db_path = Path("bahamm.db")
    if not db_path.exists():
        print("Database file not found!")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check table structure
        print("=== Categories Table Structure ===")
        cursor.execute("PRAGMA table_info(categories)")
        columns = cursor.fetchall()
        for col in columns:
            print(f"  {col[1]} ({col[2]}) - {'NOT NULL' if col[3] else 'NULL'}")
        
        # Check existing data
        print("\n=== Existing Categories ===")
        cursor.execute("SELECT * FROM categories")
        categories = cursor.fetchall()
        if categories:
            for cat in categories:
                print(f"  ID: {cat[0]}, Name: {cat[1]}, Slug: {cat[2]}")
        else:
            print("  No categories found")
        
        print("\n=== Testing Category Creation ===")
        test_data = {
            'name': 'Test Category',
            'slug': 'test-category',
            'image_url': None,
            'description': 'Test description',
            'is_active': True,
            'created_at': datetime.now().isoformat()
        }
        
        cursor.execute("""
            INSERT INTO categories (name, slug, image_url, description, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            test_data['name'],
            test_data['slug'],
            test_data['image_url'],
            test_data['description'],
            test_data['is_active'],
            test_data['created_at']
        ))
        
        conn.commit()
        print("  ✓ Test category created successfully")
        
        # Clean up test data
        cursor.execute("DELETE FROM categories WHERE name = 'Test Category'")
        conn.commit()
        print("  ✓ Test category deleted")
        
    except Exception as e:
        print(f"  ✗ Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    test_categories_table() 