#!/usr/bin/env python3
import sys
import os
sys.path.append('backend')

# Force use of bahamm1.db
os.environ['DATABASE_URL'] = 'sqlite:///bahamm1.db'

from app.database import get_db
from app.models import Order, GroupOrder
from sqlalchemy import or_, and_

def main():
    db = next(get_db())

    # Test the fixed query
    gid = 17
    group = db.query(GroupOrder).filter(GroupOrder.id == gid).first()

    group_orders = db.query(Order).filter(
        Order.group_order_id == gid,
        Order.is_settlement_payment == False,
        or_(
            Order.payment_ref_id.isnot(None),
            Order.paid_at.isnot(None),
            Order.status.in_(["تکمیل شده", "paid", "completed"]),
            # Include leader order for finalized groups even without payment evidence
            and_(
                Order.user_id == group.leader_id,
                GroupOrder.finalized_at.isnot(None)
            ),
        )
    ).all()

    print('Orders found in group 17 after fix:')
    for o in group_orders:
        payment_ref = getattr(o, 'payment_ref_id', None)
        is_leader = o.user_id == group.leader_id
        print(f'  Order {o.id}: user={o.user_id}, payment_ref={payment_ref}, is_leader={is_leader}')

if __name__ == "__main__":
    main()
