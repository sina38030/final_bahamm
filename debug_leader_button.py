#!/usr/bin/env python3
"""
Debug script to check leader button visibility issue
"""

import sys
import os
sys.path.append('backend')

# Force use of bahamm1.db
os.environ['DATABASE_URL'] = 'sqlite:///bahamm1.db'

from app.database import get_db
from app.models import Order, GroupOrder, User

def main():
    db = next(get_db())

    print("🔍 Debugging Leader Button Visibility")
    print("=" * 50)

    # Get all groups
    groups = db.query(GroupOrder).all()
    print(f"📊 Total groups found: {len(groups)}")

    for group in groups:
        print(f"\n🏷️  Group {group.id}:")
        print(f"   Status: {group.status}")
        print(f"   Leader ID: {group.leader_id}")
        print(f"   Finalized: {group.finalized_at is not None}")

        # Get orders for this group
        orders = db.query(Order).filter(
            Order.group_order_id == group.id,
            Order.is_settlement_payment == False
        ).all()

        print(f"   Orders in group: {len(orders)}")

        for order in orders:
            is_leader = order.user_id == group.leader_id
            group_status = 'success' if group.finalized_at else 'ongoing'
            has_group_order_id = order.group_order_id is not None

            print(f"   📦 Order {order.id}:")
            print(f"      User ID: {order.user_id}")
            print(f"      Is Leader: {is_leader}")
            print(f"      Group Status: {group_status}")
            print(f"      Has Group Order ID: {has_group_order_id}")
            print(f"      Delivery Slot: {order.delivery_slot}")

            # Check button visibility conditions
            show_button = is_leader and group_status == 'success' and has_group_order_id
            print(f"      🟢 Should show button: {show_button}")

            if show_button:
                print("         ✅ CONDITIONS MET - Button should appear!")
            else:
                missing_conditions = []
                if not is_leader:
                    missing_conditions.append("not leader")
                if group_status != 'success':
                    missing_conditions.append(f"group not success ({group_status})")
                if not has_group_order_id:
                    missing_conditions.append("no group_order_id")

                print(f"         ❌ Missing: {', '.join(missing_conditions)}")

if __name__ == "__main__":
    main()
