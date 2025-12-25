#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Migration: Add missing categories with IDs 1-4
Run this on production server to fix FOREIGN KEY constraint errors
"""
import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine
from sqlalchemy import text

def add_missing_categories():
    """Add categories with IDs 1-4 if they don't exist"""
    
    print("=" * 70)
    print("MIGRATION: Adding missing categories")
    print("=" * 70)
    
    with engine.connect() as conn:
        # Check current categories
        result = conn.execute(text("SELECT id, name FROM categories ORDER BY id"))
        existing = result.fetchall()
        existing_ids = [row[0] for row in existing]
        
        print(f"\nExisting categories: {existing_ids}")
        
        # Categories to add (only fields that exist in table)
        missing_categories = [
            (1, "محصولات عمومی", "general"),
            (2, "خواربار", "grocery"),
            (3, "لبنیات", "dairy"),
            (4, "پروتئین", "protein"),
        ]
        
        added_count = 0
        
        for cat_id, name, slug in missing_categories:
            if cat_id in existing_ids:
                print(f"  ✓ Category ID {cat_id} already exists, skipping...")
                continue
            
            try:
                # Check table structure to know which columns exist
                pragma_result = conn.execute(text("PRAGMA table_info(categories)"))
                columns = [row[1] for row in pragma_result.fetchall()]
                
                # Build INSERT based on available columns
                if 'description' in columns and 'is_active' in columns and 'created_at' in columns:
                    # Full schema
                    conn.execute(text("""
                        INSERT INTO categories (id, name, slug, image_url, description, is_active, created_at)
                        VALUES (:id, :name, :slug, NULL, :desc, 1, datetime('now'))
                    """), {"id": cat_id, "name": name, "slug": slug, "desc": f"دسته‌بندی {name}"})
                elif 'created_at' in columns:
                    # Has created_at but not description
                    conn.execute(text("""
                        INSERT INTO categories (id, name, slug, image_url, created_at)
                        VALUES (:id, :name, :slug, NULL, datetime('now'))
                    """), {"id": cat_id, "name": name, "slug": slug})
                else:
                    # Minimal schema
                    conn.execute(text("""
                        INSERT INTO categories (id, name, slug, image_url)
                        VALUES (:id, :name, :slug, NULL)
                    """), {"id": cat_id, "name": name, "slug": slug})
                
                conn.commit()
                print(f"  ✓ Added category ID {cat_id}: {name}")
                added_count += 1
                
            except Exception as e:
                print(f"  ✗ Error adding category ID {cat_id}: {e}")
                conn.rollback()
        
        # Verify
        print("\n" + "=" * 70)
        print("All categories now:")
        result = conn.execute(text("SELECT id, name FROM categories ORDER BY id"))
        for row in result.fetchall():
            print(f"  ID {row[0]}: {row[1]}")
        
        print("=" * 70)
        print(f"✓ Migration complete! Added {added_count} categories.")
        print("=" * 70)
        
        return added_count

if __name__ == "__main__":
    try:
        add_missing_categories()
        sys.exit(0)
    except Exception as e:
        print(f"\n✗ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)






















