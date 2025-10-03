#!/usr/bin/env python
"""
Force settlement check for ALL groups and update leader orders accordingly.
This will fix any groups that were created before the settlement feature was added.
"""
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import GroupOrder, Order, OrderItem, Product, OrderState
from datetime import datetime

# Database connection
engine = create_engine('sqlite:///bahamm.db')
Session = sessionmaker(bind=engine)
session = Session()

def get_price_for_friends_count(product, friends_count):
    """Get the price for a specific number of friends"""
    if friends_count == 0:
        return product.market_price
    elif friends_count == 1:
        return product.friend_1_price or product.market_price
    elif friends_count == 2:
        return product.friend_2_price or product.friend_1_price or product.market_price
    else:  # 3 or more friends
        return product.friend_3_price or product.friend_2_price or product.friend_1_price or product.market_price

def force_check_all_groups():
    """Check all groups and update settlement requirements"""
    
    # Get all groups that might need settlement
    groups = session.query(GroupOrder).all()
    
    updated_count = 0
    
    for group in groups:
        print(f"\nChecking group {group.id} (invite: {group.invite_code})...")
        
        # Get all orders for this group
        orders = session.query(Order).filter(
            Order.group_order_id == group.id
        ).all()
        
        if not orders:
            print(f"  No orders found")
            continue
            
        # Find leader order
        leader_order = None
        friend_orders = []
        
        for order in orders:
            if order.user_id == group.leader_id and not order.is_settlement_payment:
                leader_order = order
            elif order.user_id != group.leader_id and order.payment_ref_id:
                friend_orders.append(order)
        
        if not leader_order:
            print(f"  No leader order found")
            continue
            
        # Count actual friends who paid
        actual_friends = len(friend_orders)
        
        # Determine expected friends
        expected_friends = group.expected_friends
        
        # If expected_friends is not set, try to infer from leader's delivery_slot
        if not expected_friends and leader_order.delivery_slot:
            try:
                import json
                slot_data = json.loads(leader_order.delivery_slot)
                if isinstance(slot_data, dict):
                    expected_friends = slot_data.get('friends') or slot_data.get('expected_friends')
            except:
                pass
        
        # If still no expected_friends, use max_friends
        if not expected_friends:
            expected_friends = group.max_friends or 3
            
        print(f"  Leader order ID: {leader_order.id}")
        print(f"  Expected friends: {expected_friends}")
        print(f"  Actual friends who paid: {actual_friends}")
        print(f"  Current leader order status: {leader_order.status}")
        
        # Check if settlement is required
        if expected_friends > actual_friends and leader_order.payment_ref_id:
            print(f"  ⚠️ Settlement required! Leader expected {expected_friends} but only {actual_friends} joined")
            
            # Calculate settlement amount
            settlement_amount = 0
            items = session.query(OrderItem).filter(
                OrderItem.order_id == leader_order.id
            ).all()
            
            for item in items:
                product = session.query(Product).filter(
                    Product.id == item.product_id
                ).first()
                
                if product:
                    actual_price = get_price_for_friends_count(product, actual_friends)
                    expected_price = get_price_for_friends_count(product, expected_friends)
                    difference = actual_price - expected_price
                    settlement_amount += difference * item.quantity
                    print(f"    Product {product.id}: {actual_price} - {expected_price} = {difference} per unit")
            
            # Update group with settlement info
            group.expected_friends = expected_friends
            group.settlement_required = True
            group.settlement_amount = settlement_amount
            
            # Update leader order status to pending settlement
            if leader_order.status != "در انتظار تسویه":
                leader_order.status = "در انتظار تسویه"
                print(f"  ✅ Updated leader order to 'در انتظار تسویه' status")
                print(f"  ✅ Settlement amount: {settlement_amount} تومان")
                updated_count += 1
            else:
                print(f"  Already marked as pending settlement")
                
        else:
            print(f"  No settlement required")
            # Make sure settlement flags are cleared
            group.settlement_required = False
            group.settlement_amount = 0
    
    session.commit()
    print(f"\n{'='*60}")
    print(f"Updated {updated_count} groups with settlement requirements")
    print(f"{'='*60}")
    
    # Show all groups requiring settlement
    print("\nGroups currently requiring settlement:")
    settlement_groups = session.query(GroupOrder).filter(
        GroupOrder.settlement_required == True
    ).all()
    
    for sg in settlement_groups:
        print(f"  Group {sg.id} (invite: {sg.invite_code}): {sg.settlement_amount} تومان")
    
    # Show all orders pending settlement
    print("\nOrders with 'در انتظار تسویه' status:")
    pending_orders = session.query(Order).filter(
        Order.status == "در انتظار تسویه"
    ).all()
    
    for po in pending_orders:
        print(f"  Order {po.id} (user: {po.user_id}, group: {po.group_order_id})")

if __name__ == "__main__":
    force_check_all_groups()
