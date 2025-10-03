#!/usr/bin/env python3
import os
import sys
import argparse
import sqlite3


def project_root() -> str:
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # backend/
    return os.path.dirname(backend_dir)  # project root


def get_db_path() -> str:
    # Prefer project root bahamm.db
    roots = [
        os.path.join(project_root(), 'bahamm.db'),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'bahamm.db'),  # backend/bahamm.db
        os.path.join(project_root(), 'bahmm.db'),  # legacy name
    ]
    for p in roots:
        if os.path.exists(p):
            return p
    # default to project root
    return roots[0]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--id', type=int, help='Group order ID')
    ap.add_argument('--invite', type=str, help='Invite token')
    args = ap.parse_args()

    if not args.id and not args.invite:
        print('Provide --id or --invite')
        return 2

    db_path = get_db_path()
    if not os.path.exists(db_path):
        print(f'DB not found: {db_path}')
        return 1

    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    cur = con.cursor()

    if args.id:
        group = cur.execute('SELECT id, leader_id, status FROM group_orders WHERE id = ?', (args.id,)).fetchone()
    else:
        # try both invite_token and legacy invite_code
        group = cur.execute('SELECT id, leader_id, status FROM group_orders WHERE invite_token = ? COLLATE NOCASE', (args.invite,)).fetchone()
        if not group:
            group = cur.execute('SELECT id, leader_id, status FROM group_orders WHERE invite_code = ? COLLATE NOCASE', (args.invite,)).fetchone()

    if not group:
        print('Group not found')
        return 1

    gid = group['id']
    leader_id = group['leader_id']
    status = group['status']

    user = cur.execute('SELECT id, phone_number FROM users WHERE id = ?', (leader_id,)).fetchone()
    phone = user['phone_number'] if user else None

    print(f'group_id={gid} leader_id={leader_id} leader_phone={phone} status={status}')

    # List orders in this group
    rows = cur.execute('SELECT id, user_id, status, payment_ref_id, is_settlement_payment FROM orders WHERE group_order_id = ? ORDER BY created_at', (gid,)).fetchall()
    print(f'orders_count={len(rows)}')
    for r in rows:
        print(f"order id={r['id']} user_id={r['user_id']} status={r['status']} ref={r['payment_ref_id']} settlement={r['is_settlement_payment']}")

    con.close()
    return 0


if __name__ == '__main__':
    sys.exit(main())


