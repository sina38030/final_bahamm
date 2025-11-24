#!/usr/bin/env python3
import sqlite3

conn = sqlite3.connect('backend/bahamm1.db')
cursor = conn.cursor()

cursor.execute('SELECT COUNT(*) FROM popular_searches')
count = cursor.fetchone()[0]
print(f'Direct SQLite query: {count} rows')

cursor.execute('SELECT name FROM sqlite_master WHERE type="table"')
tables = cursor.fetchall()
print('Tables:', [t[0] for t in tables])

if count > 0:
    cursor.execute('SELECT id, search_term, sort_order, is_active FROM popular_searches LIMIT 5')
    rows = cursor.fetchall()
    print('Sample data:')
    for row in rows:
        print(f'  {row}')

conn.close()

