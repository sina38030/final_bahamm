"""
Order Post-Processor Service
Runs after every order update to ensure settlement requirements are properly applied
"""
from sqlalchemy.orm import Session
from app.models import Order, GroupOrder, OrderItem, Product
import json
import logging

logger = logging.getLogger(__name__)

class OrderPostProcessor:
    def __init__(self, db: Session):
        self.db = db
    
    def is_secondary_group(self, group: GroupOrder) -> bool:
        """Check if this is a secondary group"""
        try:
            if group.basket_snapshot:
                snapshot_data = json.loads(group.basket_snapshot)
                return snapshot_data.get("kind") == "secondary"
        except:
            pass
        return False
    
    def calculate_secondary_refund_amount(self, leader_order, member_count: int) -> float:
        """
        Calculate refund amount for secondary groups.
        Secondary groups work as a referral system:
        - Leader already paid full amount
        - For each member that joins, leader gets: (total_basket_value ÷ 4) refund
        - Maximum 4 members can join (making the product free for leader)
        
        Args:
            leader_order: The leader's order
            member_count: Number of members who joined the group
            
        Returns:
            Refund amount in tomans
        """
        if member_count <= 0:
            return 0  # No refund if no members joined
        
        # Get total basket value from order items
        items = self.db.query(OrderItem).filter(
            OrderItem.order_id == leader_order.id
        ).all()
        
        total_basket_value = 0
        for item in items:
            product = self.db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                # For secondary groups, use the original price (market_price or base_price)
                unit_price = product.market_price or product.base_price or 0
                total_basket_value += unit_price * item.quantity
        
        if total_basket_value <= 0:
            return 0
        
        # Calculate refund: (total_basket_value ÷ 4) × member_count
        # But cap at maximum 4 members (so max refund = total_basket_value)
        discount_per_member = total_basket_value / 4
        effective_members = min(member_count, 4)  # Cap at 4 members
        refund_amount = discount_per_member * effective_members
        
        return min(refund_amount, total_basket_value)  # Don't refund more than they paid
    
    def get_price_for_friends_count(self, product, friends_count):
        """Get the price for a specific number of friends"""
        if friends_count == 0:
            return product.market_price
        elif friends_count == 1:
            return product.friend_1_price or product.market_price
        elif friends_count == 2:
            return product.friend_2_price or product.friend_1_price or product.market_price
        else:  # 3 or more friends
            return product.friend_3_price or product.friend_2_price or product.friend_1_price or product.market_price
    
    def process_order(self, order_id: int):
        """Process an order after payment verification"""
        order = self.db.query(Order).filter(Order.id == order_id).first()
        if not order or not order.group_order_id:
            return
        
        group = self.db.query(GroupOrder).filter(GroupOrder.id == order.group_order_id).first()
        if not group:
            return
            
        # Always recheck settlement for the entire group
        self.check_group_settlement(group.id)
    
    def check_group_settlement(self, group_id: int):
        """Check if a group requires settlement and update accordingly"""
        group = self.db.query(GroupOrder).filter(GroupOrder.id == group_id).first()
        if not group:
            return
        
        # Get all orders for this group
        orders = self.db.query(Order).filter(
            Order.group_order_id == group_id,
            Order.is_settlement_payment == False
        ).all()
        
        # Find leader order and count paid friends
        leader_order = None
        paid_friends_count = 0
        
        for order in orders:
            if order.user_id == group.leader_id:
                leader_order = order
            elif order.payment_ref_id:  # Friend who paid
                paid_friends_count += 1
        
        if not leader_order or not leader_order.payment_ref_id:
            return  # Leader hasn't paid yet
        
        # Check if this is a secondary group
        is_secondary = self.is_secondary_group(group)
        
        logger.info(f"Group {group_id}: {paid_friends_count} members joined ({'secondary referral' if is_secondary else 'regular'} group)")
        
        if is_secondary:
            # Secondary groups: Simple referral system
            # Leader gets refund based on how many members joined (no expectations)
            refund_amount = self.calculate_secondary_refund_amount(leader_order, paid_friends_count)
            
            # Always clear settlement flags for secondary groups
            group.settlement_required = False
            group.settlement_amount = 0
            group.expected_friends = None  # Not applicable for secondary groups
            group.refund_due_amount = int(max(0, refund_amount))
            
            # Ensure leader order is completed (never pending settlement for secondary)
            if leader_order.status == "در انتظار تسویه":
                leader_order.status = "در انتظار"
            
            logger.info(f"Secondary group {group_id}: {paid_friends_count} members joined, refund_due_amount set to {group.refund_due_amount:,} تومان")
        else:
            # Regular groups: Use existing logic with expectations
            self._handle_regular_group_settlement(group, leader_order, paid_friends_count, group_id)
        
        self.db.commit()
    
    def _handle_regular_group_settlement(self, group: GroupOrder, leader_order, paid_friends_count: int, group_id: int):
        """Handle settlement for regular groups (existing logic)"""
        # Determine expected friends
        expected_friends = self.get_expected_friends(group, leader_order)
        
        # Store expected friends in group if not set
        if not group.expected_friends:
            group.expected_friends = expected_friends
        
        logger.info(f"Group {group_id}: Expected {expected_friends} friends, {paid_friends_count} actually paid")
        
        # Check if settlement (leader owes) is required or refund (leader overpaid)
        if expected_friends > paid_friends_count:
            # Leader owes the difference
            settlement_amount = self.calculate_settlement_amount(leader_order, paid_friends_count, expected_friends)
            group.settlement_required = True
            group.settlement_amount = settlement_amount
            # Clear any refund flags
            group.refund_due_amount = 0
            group.refund_requested_at = None
            group.refund_paid_at = None
            # Update leader order status
            if leader_order.status != "در انتظار تسویه":
                leader_order.status = "در انتظار تسویه"
                logger.info(f"Leader order {leader_order.id} marked as pending settlement ({settlement_amount} تومان)")
        elif paid_friends_count > expected_friends:
            # Leader overpaid; compute refund amount based on price tiers
            refund_amount = 0
            items = self.db.query(OrderItem).filter(
                OrderItem.order_id == leader_order.id
            ).all()
            for item in items:
                product = self.db.query(Product).filter(Product.id == item.product_id).first()
                if not product:
                    continue
                actual_price = self.get_price_for_friends_count(product, paid_friends_count)
                expected_price = self.get_price_for_friends_count(product, expected_friends)
                diff = expected_price - actual_price  # positive = refund per unit
                if diff > 0:
                    refund_amount += diff * item.quantity
            group.settlement_required = False
            group.settlement_amount = 0
            group.refund_due_amount = int(max(0, refund_amount))
            logger.info(f"Group {group_id}: refund_due_amount set to {group.refund_due_amount}")
            # Ensure leader order is completed
            if leader_order.status == "در انتظار تسویه":
                leader_order.status = "در انتظار"
        else:
            # Exact match; clear both
            group.settlement_required = False
            group.settlement_amount = 0
            group.refund_due_amount = 0
            # Ensure leader order is completed if it was pending
            if leader_order.status == "در انتظار تسویه":
                leader_order.status = "در انتظار"
                logger.info(f"Leader order {leader_order.id} completed (no settlement needed)")
    
    def get_expected_friends(self, group, leader_order):
        """Get the expected number of friends"""
        # First check group.expected_friends
        if group.expected_friends:
            return group.expected_friends
        
        # Try to parse from leader's delivery_slot
        if leader_order.delivery_slot:
            try:
                slot_data = json.loads(leader_order.delivery_slot)
                if isinstance(slot_data, dict):
                    expected = slot_data.get('friends') or slot_data.get('expected_friends')
                    if expected:
                        return int(expected)
            except:
                pass
        
        # Default: assume 1 friend tier was selected on cart
        return 1
    
    def calculate_settlement_amount(self, leader_order, actual_friends, expected_friends):
        """Calculate the settlement amount the leader needs to pay"""
        settlement_amount = 0
        
        items = self.db.query(OrderItem).filter(
            OrderItem.order_id == leader_order.id
        ).all()
        
        for item in items:
            product = self.db.query(Product).filter(
                Product.id == item.product_id
            ).first()
            
            if product:
                actual_price = self.get_price_for_friends_count(product, actual_friends)
                expected_price = self.get_price_for_friends_count(product, expected_friends)
                difference = actual_price - expected_price
                settlement_amount += difference * item.quantity
        
        return max(0, settlement_amount)  # Ensure non-negative
