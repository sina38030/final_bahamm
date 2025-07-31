import sqlite3
from datetime import datetime, timedelta

# Connect to database
conn = sqlite3.connect('bahamm.db')
cursor = conn.cursor()

# Check existing tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print('📋 Existing tables:')
for table in tables:
    print(f'  - {table[0]}')

# Check if we have stores and categories
try:
    cursor.execute('SELECT COUNT(*) FROM stores')
    store_count = cursor.fetchone()[0]
    print(f'📊 Stores: {store_count}')
except Exception as e:
    print(f'📊 Stores: table not found or error: {e}')

try:
    cursor.execute('SELECT COUNT(*) FROM categories')
    category_count = cursor.fetchone()[0]
    print(f'📊 Categories: {category_count}')
except Exception as e:
    print(f'📊 Categories: table not found or error: {e}')

try:
    cursor.execute('SELECT COUNT(*) FROM products')
    product_count = cursor.fetchone()[0]
    print(f'📊 Products: {product_count}')
except Exception as e:
    print(f'📊 Products: table not found or error: {e}')

try:
    cursor.execute('SELECT COUNT(*) FROM group_buys')
    group_buy_count = cursor.fetchone()[0]
    print(f'📊 Group Buys: {group_buy_count}')
except Exception as e:
    print(f'📊 Group Buys: table not found or error: {e}')

try:
    cursor.execute('SELECT COUNT(*) FROM users')
    user_count = cursor.fetchone()[0]
    print(f'📊 Users: {user_count}')
except Exception as e:
    print(f'📊 Users: table not found or error: {e}')

conn.close() 