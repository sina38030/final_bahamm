#!/usr/bin/env python3
import sys
import os
sys.path.append('backend')

# Force use of bahamm1.db
os.environ['DATABASE_URL'] = 'sqlite:///bahamm1.db'

from app.database import get_db
from app.models import Order

def main():
    db = next(get_db())

    # Check shipping preferences for orders in group 17
    orders = db.query(Order).filter(Order.group_order_id == 17).all()

    for o in orders:
        ship_to_leader = getattr(o, 'ship_to_leader_address', None)
        print(f'Order {o.id}: user={o.user_id}, ship_to_leader={ship_to_leader}')

if __name__ == "__main__":
    main()
