#!/usr/bin/env python
"""
Fix all existing groups by running the post-processor on them
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Order, GroupOrder
from app.services.order_post_processor import OrderPostProcessor

# Database connection
engine = create_engine('sqlite:///bahamm.db')
Session = sessionmaker(bind=engine)
session = Session()

def fix_all_groups():
    print("Fixing all groups...")
    
    # Get all groups
    groups = session.query(GroupOrder).all()
    
    post_processor = OrderPostProcessor(session)
    
    for group in groups:
        print(f"\nProcessing group {group.id} (invite: {group.invite_code})...")
        
        # Get leader order
        leader_order = session.query(Order).filter(
            Order.group_order_id == group.id,
            Order.user_id == group.leader_id,
            Order.is_settlement_payment == False
        ).first()
        
        if leader_order and leader_order.payment_ref_id:
            # Process this order
            post_processor.process_order(leader_order.id)
            print(f"  Processed leader order {leader_order.id}")
            print(f"  Settlement required: {group.settlement_required}")
            print(f"  Settlement amount: {group.settlement_amount}")
            print(f"  Leader order status: {leader_order.status}")
    
    print("\n" + "="*60)
    print("All groups processed!")
    
    # Show results
    settlement_groups = session.query(GroupOrder).filter(
        GroupOrder.settlement_required == True
    ).all()
    
    print(f"\nGroups requiring settlement: {len(settlement_groups)}")
    for sg in settlement_groups:
        print(f"  Group {sg.id} (invite: {sg.invite_code}): {sg.settlement_amount} تومان")
    
    pending_orders = session.query(Order).filter(
        Order.status == "در انتظار تسویه"
    ).all()
    
    print(f"\nOrders pending settlement: {len(pending_orders)}")
    for po in pending_orders:
        print(f"  Order {po.id} (user: {po.user_id}, group: {po.group_order_id})")

if __name__ == "__main__":
    fix_all_groups()
