import sqlite3

conn = sqlite3.connect('bahamm.db')
cursor = conn.cursor()

# Check all users with similar phone numbers
cursor.execute('SELECT * FROM users WHERE phone_number LIKE ?', ('%4463524%',))
users = cursor.fetchall()
print(f'Users with similar phone numbers: {len(users)}')
for user in users:
    print(f'ID: {user[0]}, Phone: {user[1]}, Name: {user[2] if len(user) > 2 else "N/A"}')

# Check the user 237 more details
cursor.execute('SELECT * FROM users WHERE id = 237')
user = cursor.fetchone()
if user:
    print(f'\nUser 237 full details:')
    for i, field in enumerate(user):
        print(f'  Field {i}: {field}')

# Check if there's a user with the exact phone number
cursor.execute('SELECT * FROM users WHERE phone_number = ?', ('09124463524',))
exact_user = cursor.fetchone()
print(f'\nExact phone match: {exact_user}')

# Check orders for user 237
cursor.execute('SELECT * FROM orders WHERE user_id = 237 AND group_order_id IS NOT NULL')
orders = cursor.fetchall()
print(f'\nGroup orders for user 237: {len(orders)}')
for order in orders:
    print(f'Order ID: {order[0]}, Group Order ID: {order[7] if len(order) > 7 else "N/A"}, Status: {order[3] if len(order) > 3 else "N/A"}, Paid At: {order[5] if len(order) > 5 else "N/A"}')
    
    # Get group details for this order
    group_order_id = order[7] if len(order) > 7 else None
    if group_order_id:
        cursor.execute('SELECT * FROM group_orders WHERE id = ?', (group_order_id,))
        group = cursor.fetchone()
        if group:
            print(f'  -> Group Status: {group[4] if len(group) > 4 else "N/A"}, Leader ID: {group[2] if len(group) > 2 else "N/A"}, Expires: {group[6] if len(group) > 6 else "N/A"}')
            print(f'  -> Invite Token: {group[5] if len(group) > 5 else "N/A"}')

conn.close()
