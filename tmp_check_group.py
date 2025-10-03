import sqlite3, json, sys, os, re
path = os.path.join('backend','bahamm.db')
if not os.path.exists(path):
    print(json.dumps({'error':'db_not_found','path':path}))
    sys.exit(0)
conn = sqlite3.connect(path)
conn.row_factory = sqlite3.Row
cur = conn.cursor()
invite = 'GB598A0000000'
results = {'query_invite': invite}
# Find by exact invite_token
cur.execute("SELECT id, leader_id, invite_token, status, finalized_at, settlement_required, settlement_paid_at, allow_consolidation, expected_friends FROM group_orders WHERE invite_token = ?", (invite,))
rows = cur.fetchall()
# If not found, try prefix
if not rows:
    cur.execute("SELECT id, leader_id, invite_token, status, finalized_at, settlement_required, settlement_paid_at, allow_consolidation, expected_friends FROM group_orders WHERE invite_token LIKE ?", (invite+'%',))
    rows = cur.fetchall()
# Also try numeric part after GB as group id
m = re.match(r'GB(\\d+)', invite)
if m:
    gid = int(m.group(1))
    cur.execute("SELECT id, leader_id, invite_token, status, finalized_at, settlement_required, settlement_paid_at, allow_consolidation, expected_friends FROM group_orders WHERE id = ?", (gid,))
    rows2 = cur.fetchall()
    ids = {r['id'] for r in rows}
    for r in rows2:
        if r['id'] not in ids:
            rows.append(r)

if not rows:
    results['groups'] = []
    print(json.dumps(results, ensure_ascii=False, indent=2, default=str))
    sys.exit(0)

out_groups = []
for gr in rows:
    gid = gr['id']
    g = {k: gr[k] for k in gr.keys()}
    # Orders in group
    cur.execute(
        """
        SELECT o.id, o.user_id, o.payment_ref_id, o.paid_at, o.status, o.is_settlement_payment,
               o.order_type, o.state, o.ship_to_leader_address, o.payment_authority,
               u.phone_number as user_phone
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_id
        WHERE o.group_order_id = ?
        ORDER BY o.created_at ASC
        """,
        (gid,)
    )
    g['orders'] = [dict(r) for r in cur.fetchall()]
    # Leader user
    cur.execute("SELECT id, phone_number FROM users WHERE id = ?", (gr['leader_id'],))
    leader = cur.fetchone()
    g['leader_user'] = dict(leader) if leader else None
    out_groups.append(g)

results['groups'] = out_groups
print(json.dumps(results, ensure_ascii=False, indent=2, default=str))
