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

    # Replicate the admin orders query logic
    base_query = (
        db.query(Order)
        .outerjoin(GroupOrder, Order.group_order_id == GroupOrder.id)
        .filter(
            Order.is_settlement_payment == False,
            or_(
                # Regular orders with payment
                and_(
                    or_(
                        Order.payment_ref_id.isnot(None),
                        Order.paid_at.isnot(None),
                        Order.status.in_(["تکمیل شده", "paid", "completed"]),
                    ),
                    Order.status != "در انتظار تسویه"
                ),
                # Leader orders from finalized groups (regardless of payment status)
                and_(
                    GroupOrder.id.isnot(None),
                    Order.user_id == GroupOrder.leader_id,
                    GroupOrder.finalized_at.isnot(None)
                ),
            )
        )
    )

    orders = base_query.all()
    print('Total orders found:', len(orders))

    # Check if order 40 is in the results
    order_40_found = any(o.id == 40 for o in orders)
    print('Order 40 found in results:', order_40_found)

    if order_40_found:
        order_40 = next(o for o in orders if o.id == 40)
        print('Order 40 details:')
        print('  ID:', order_40.id)
        print('  User ID:', order_40.user_id)
        print('  Group ID:', order_40.group_order_id)
        print('  Status:', order_40.status)
        print('  Payment ref:', getattr(order_40, 'payment_ref_id', None))
    else:
        print('Order 40 NOT found in filtered results')

        # Debug why it's not included
        order_40_raw = db.query(Order).filter(Order.id == 40).first()
        group_17 = db.query(GroupOrder).filter(GroupOrder.id == 17).first()

        print('Debugging order 40:')
        print('  Is settlement payment:', getattr(order_40_raw, 'is_settlement_payment', None))
        print('  Payment ref ID:', getattr(order_40_raw, 'payment_ref_id', None))
        print('  Paid at:', getattr(order_40_raw, 'paid_at', None))
        print('  Status:', order_40_raw.status)
        print('  Group exists:', group_17 is not None)
        if group_17:
            print('  Is leader order:', order_40_raw.user_id == group_17.leader_id)
            print('  Group finalized:', group_17.finalized_at is not None)

if __name__ == "__main__":
    main()
