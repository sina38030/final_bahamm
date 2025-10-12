import sqlite3, json, sys, os

# Database connection to bahamm1.db
path = 'bahamm1.db'
if not os.path.exists(path):
    print(' bahamm1.db not found!')
    sys.exit(0)

conn = sqlite3.connect(path)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

group_id = 138
print(f' Investigating Group ID: {group_id} in bahamm1.db')

try:
    # Find group by ID with basket_snapshot
    cur.execute('''
        SELECT id, leader_id, invite_token, status, created_at, leader_paid_at, expires_at, 
               basket_snapshot, expected_friends, settlement_required, settlement_amount
        FROM group_orders 
        WHERE id = ?
    ''', (group_id,))

    group = cur.fetchone()
    if not group:
        print(f' Group {group_id} not found!')
        sys.exit(0)

    g = dict(group)
    print(f' Found Group {group_id}:')
    print(f'   Leader ID: {g["leader_id"]}')
    print(f'   Invite Token: {g["invite_token"]}')
    print(f'   Status: {g["status"]}')
    print(f'   Created: {g["created_at"]}')
    print(f'   Leader Paid: {g["leader_paid_at"]}')

    # Parse basket_snapshot to determine kind and source
    kind = 'primary'
    source_order_id = None
    try:
        if g['basket_snapshot']:
            meta = json.loads(g['basket_snapshot'])
            kind = meta.get('kind', 'primary')
            source_order_id = meta.get('source_order_id')
            print(f'   Kind: {kind}')
            if source_order_id:
                print(f'   Source Order ID: {source_order_id}')
            if 'items' in meta:
                print(f'   Items count: {len(meta["items"])}')
    except Exception as e:
        print(f'   Error parsing basket_snapshot: {e}')

    # Get leader info
    cur.execute('SELECT id, phone_number, first_name, last_name FROM users WHERE id = ?', (g['leader_id'],))
    leader = cur.fetchone()
    if leader:
        leader_dict = dict(leader)
        name = f'{leader_dict.get("first_name", "")} {leader_dict.get("last_name", "")}'.strip()
        print(f'   Leader: {leader_dict["phone_number"]} ({name if name else "No name"})')

    # Determine where this group was created
    print(f'\n WHERE WAS GROUP {group_id} CREATED?')
    if kind == 'primary':
        print(' LOCATION: payment_service.py (خودکار - برای leader)')
        print(' TRIGGER: Leader پرداخت کرد و گزینه group را انتخاب کرده بود')
        print(' LINE: ~508-607 in verify_and_complete_payment()')
    elif kind == 'secondary':
        if source_order_id:
            print(' LOCATION: groups_routes.py (دستی - کاربر دکمه زد)')
            print(' TRIGGER: کاربر invited روی دکمه دعوت دوستان کلیک کرد')
            print(' LINE: ~129-209 in create_group()')
            print(f' SOURCE: از Order ID {source_order_id} ایجاد شده')
        else:
            print(' LOCATION: payment_service.py (خودکار - برای invited user)')
            print(' TRIGGER: کاربر invited پرداخت کرد')
            print(' LINE: ~376-454 in verify_and_complete_payment() [DISABLED NOW]')

except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()
finally:
    conn.close()
