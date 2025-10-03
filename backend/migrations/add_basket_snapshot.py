import os
import sqlite3


def main():
    # Resolve DB path relative to project root
    here = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(here, '..'))
    db_path = os.path.join(project_root, 'bahamm.db')

    if not os.path.exists(db_path):
        print(f"ERROR: Database not found at {db_path}")
        raise SystemExit(1)

    conn = sqlite3.connect(db_path)
    try:
        conn.execute('PRAGMA busy_timeout=5000')
        cur = conn.cursor()
        cur.execute('PRAGMA table_info(group_orders)')
        cols = [row[1] for row in cur.fetchall()]
        if 'basket_snapshot' not in cols:
            print('Adding column basket_snapshot to group_orders ...')
            cur.execute('ALTER TABLE group_orders ADD COLUMN basket_snapshot TEXT')
            conn.commit()
            print('Done.')
        else:
            print('Column basket_snapshot already exists. No changes.')
    finally:
        conn.close()


if __name__ == '__main__':
    main()


