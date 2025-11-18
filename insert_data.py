#!/usr/bin/env python3
import sqlite3

conn = sqlite3.connect('backend/bahamm1.db')
cursor = conn.cursor()

# Check current count
cursor.execute('SELECT COUNT(*) FROM popular_searches')
count = cursor.fetchone()[0]
print(f'Before insert: {count} rows')

# Insert data
insert_sql = '''
INSERT INTO popular_searches (search_term, sort_order, is_active) VALUES
    ('ماشین اصلاح', 0, 1),
    ('هدفون بی سیم', 1, 1),
    ('گوشی موبایل', 2, 1),
    ('لپ تاپ', 3, 1),
    ('لوازم آشپزخانه', 4, 1),
    ('لباس مردانه', 5, 1)
'''

try:
    cursor.execute(insert_sql)
    conn.commit()
    print('Insert successful')

    # Check count again
    cursor.execute('SELECT COUNT(*) FROM popular_searches')
    count = cursor.fetchone()[0]
    print(f'After insert: {count} rows')

    # Show data
    cursor.execute('SELECT * FROM popular_searches')
    rows = cursor.fetchall()
    print('Data:')
    for row in rows:
        print(f'  {row}')

except Exception as e:
    print(f'Insert failed: {e}')

conn.close()
