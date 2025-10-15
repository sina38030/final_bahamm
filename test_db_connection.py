#!/usr/bin/env python3
"""Test direct database connection"""
import sqlite3
import sys
import io

# Fix encoding for Windows
if sys.platform == 'win32':
    try:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    except:
        pass

db_path = "C:/Projects/final_bahamm/bahamm1.db"

print(f"Testing connection to: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    # Test query
    c.execute("SELECT COUNT(*) FROM products WHERE is_active = 1")
    count = c.fetchone()[0]
    
    print(f"✅ Successfully connected!")
    print(f"✅ Found {count} active products")
    
    # Get first product
    c.execute("SELECT id, name, base_price FROM products LIMIT 1")
    product = c.fetchone()
    
    if product:
        print(f"\nFirst product:")
        print(f"  ID: {product[0]}")
        print(f"  Name: {product[1]}")
        print(f"  Price: {product[2]}")
    
    conn.close()
    
    print("\n✅ Database is working correctly!")
    print("\nNow testing with SQLAlchemy...")
    
    # Test with SQLAlchemy (like backend does)
    from sqlalchemy import create_engine
    
    db_url = f"sqlite:///{db_path}"
    print(f"\nDatabase URL: {db_url}")
    
    engine = create_engine(db_url)
    connection = engine.connect()
    
    result = connection.execute("SELECT COUNT(*) FROM products WHERE is_active = 1")
    count = result.fetchone()[0]
    
    print(f"✅ SQLAlchemy connection successful!")
    print(f"✅ Found {count} active products via SQLAlchemy")
    
    connection.close()
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
