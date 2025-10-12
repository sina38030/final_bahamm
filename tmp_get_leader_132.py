import sqlite3
import sys

def main():
    try:
        conn = sqlite3.connect('bahamm1.db')
        c = conn.cursor()
        c.execute('SELECT u.phone_number FROM group_orders go JOIN users u ON u.id=go.leader_id WHERE go.id=?', (132,))
        r = c.fetchone()
        print(r[0] if r and r[0] else 'NOT_FOUND')
    except Exception as e:
        print(f'ERROR:{e}')
    finally:
        try:
            conn.close()
        except Exception:
            pass

if __name__ == '__main__':
    main()


