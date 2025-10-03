import sqlite3

def main():
    conn = sqlite3.connect('bahamm1.db')
    c = conn.cursor()

    print('=== group_orders[124] ===')
    c.execute("SELECT id, leader_id, invite_token, status, created_at FROM group_orders WHERE id=124")
    group_row = c.fetchone()
    print(group_row)

    leader_id = group_row[1] if group_row else None
    print('\n=== leader user ===')
    if leader_id:
        c.execute("SELECT id, phone_number, first_name, last_name FROM users WHERE id=?", (leader_id,))
        print(c.fetchone())

    print('\n=== orders in group 124 ===')
    c.execute("SELECT id, user_id, payment_ref_id, paid_at, is_settlement_payment FROM orders WHERE group_order_id=124")
    orders = c.fetchall()
    for r in orders:
        print(r)

    print('\n=== phones of users in orders ===')
    user_ids = sorted({r[1] for r in orders if r[1] is not None})
    for uid in user_ids:
        c.execute("SELECT id, phone_number FROM users WHERE id=?", (uid,))
        print(c.fetchone())

    if leader_id:
        print('\n=== leader address fallback phones ===')
        c.execute("SELECT id, phone_number, is_default FROM user_addresses WHERE user_id=? ORDER BY is_default DESC, id DESC LIMIT 5", (leader_id,))
        for r in c.fetchall():
            print(r)

    conn.close()

if __name__ == '__main__':
    main()


