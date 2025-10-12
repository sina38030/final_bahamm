#!/usr/bin/env python3
import sys
import os
sys.path.append('backend')

# Force use of bahamm1.db
os.environ['DATABASE_URL'] = 'sqlite:///bahamm1.db'

from app.database import get_db
from app.models import Order, GroupOrder

def main():
    db = next(get_db())

    # Check if order 40 exists
    order = db.query(Order).filter(Order.id == 40).first()
    print("Order 40:", order)
    if order:
        print("Group order ID:", getattr(order, 'group_order_id', None))
        print("User ID:", order.user_id)
        print("Status:", order.status)
        print("Created at:", order.created_at)
        print("Payment ref ID:", getattr(order, 'payment_ref_id', None))
        print("Paid at:", getattr(order, 'paid_at', None))
        print("Is settlement payment:", getattr(order, 'is_settlement_payment', None))
        print("Total amount:", getattr(order, 'total_amount', None))

        # Check if group exists
        group_order_id = getattr(order, 'group_order_id', None)
        if group_order_id:
            group = db.query(GroupOrder).filter(GroupOrder.id == group_order_id).first()
            print("Group exists:", group is not None)
            if group:
                print("Group leader ID:", group.leader_id)
                print("Group status:", getattr(group, 'status', None))
                print("Group created at:", group.created_at)
                print("Group expires at:", getattr(group, 'expires_at', None))
                print("Group finalized at:", getattr(group, 'finalized_at', None))

                # Check all orders in this group
                all_orders = db.query(Order).filter(Order.group_order_id == group_order_id).all()
                print(f"All orders in group {group_order_id}:")
                for o in all_orders:
                    print(f"  Order {o.id}: user={o.user_id}, payment_ref={getattr(o, 'payment_ref_id', None)}, paid_at={getattr(o, 'paid_at', None)}, is_settlement={getattr(o, 'is_settlement_payment', None)}")
    else:
        print("Order 40 not found")

    # Also check what orders are in recent groups
    print("\nRecent group orders:")
    recent_groups = db.query(GroupOrder).order_by(GroupOrder.created_at.desc()).limit(10).all()
    for g in recent_groups:
        print(f"Group {g.id}: leader={g.leader_id}, status={getattr(g, 'status', None)}, created={g.created_at}")

if __name__ == "__main__":
    main()
