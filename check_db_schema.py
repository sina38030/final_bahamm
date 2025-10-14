import sqlite3
import sys

db_path = sys.argv[1] if len(sys.argv) > 1 else '/srv/app/bahamm1.db'

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print(f'Checking database: {db_path}\n')

# Check users table columns
cursor.execute("PRAGMA table_info(users)")
cols = cursor.fetchall()
print(f'Users table columns ({len(cols)}):')
for col in cols:
    print(f'  - {col[1]} ({col[2]})')

# Check if telegram_id exists
has_telegram_id = any(col[1] == 'telegram_id' for col in cols)
print(f'\nhas telegram_id: {has_telegram_id}')

# Check group_orders table
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='group_orders'")
has_group_orders = cursor.fetchone() is not None
print(f'has group_orders table: {has_group_orders}')

if has_group_orders:
    cursor.execute("PRAGMA table_info(group_orders)")
    go_cols = cursor.fetchall()
    has_basket_snapshot = any(col[1] == 'basket_snapshot' for col in go_cols)
    print(f'has basket_snapshot column: {has_basket_snapshot}')

conn.close()

