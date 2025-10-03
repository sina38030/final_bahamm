#!/usr/bin/env python3
"""
Test script to verify order consolidation functionality
"""

import json
import requests
from datetime import datetime
import time

# Configuration
BACKEND_URL = "http://localhost:8000"
ADMIN_API_URL = f"{BACKEND_URL}/admin"

def create_test_group_order():
    """Create a test group order with consolidation enabled"""
    
    # Test data
    test_items = [
        {
            "product_id": 1,
            "quantity": 2,
            "price": 100.0,
            "name": "Test Product 1"
        }
    ]
    
    # Step 1: Leader creates group order with consolidation enabled
    leader_data = {
        "items": test_items,
        "description": "Test Group Order - Leader",
        "mobile": "09123456789",
        "mode": "group",
        "allow_consolidation": True
    }
    
    print("🔄 Creating leader order with consolidation enabled...")
    response = requests.post(f"{BACKEND_URL}/payment", json=leader_data)
    
    if response.status_code != 200:
        print(f"❌ Failed to create leader order: {response.status_code} - {response.text}")
        return None
        
    leader_result = response.json()
    print(f"✅ Leader order created: Authority {leader_result['authority']}")
    
    # Extract invite code from the authority (simulating the invite URL generation)
    authority = leader_result['authority']
    
    # Get order details to find the group order
    order_response = requests.get(f"{BACKEND_URL}/payment/order/{authority}")
    if order_response.status_code != 200:
        print(f"❌ Failed to get order details: {order_response.status_code}")
        return None
        
    order_data = order_response.json()
    invite_code = order_data.get('group_buy', {}).get('invite_code')
    
    if not invite_code:
        print("❌ No invite code found in order response")
        return None
        
    print(f"📧 Invite code: {invite_code}")
    
    # Step 2: Invited user joins with consolidation enabled
    invited_data = {
        "items": [
            {
                "product_id": 2,
                "quantity": 1,
                "price": 50.0,
                "name": "Test Product 2"
            }
        ],
        "description": "Test Group Order - Invited User",
        "mobile": "09123456788",
        "invite_code": invite_code,
        "allow_consolidation": True  # This should set ship_to_leader_address = True
    }
    
    print("🔄 Creating invited user order with consolidation enabled...")
    response = requests.post(f"{BACKEND_URL}/payment", json=invited_data)
    
    if response.status_code != 200:
        print(f"❌ Failed to create invited user order: {response.status_code} - {response.text}")
        return None
        
    invited_result = response.json()
    print(f"✅ Invited user order created: Authority {invited_result['authority']}")
    
    return {
        "leader_authority": leader_result['authority'],
        "invited_authority": invited_result['authority'],
        "invite_code": invite_code
    }

def verify_payment_simulation(authority):
    """Simulate payment verification (for testing purposes)"""
    print(f"🔄 Simulating payment verification for {authority}...")
    
    verify_data = {
        "authority": authority,
        "amount": 1000  # This should match the order amount in Rial
    }
    
    response = requests.put(f"{BACKEND_URL}/payment", json=verify_data)
    
    if response.status_code == 200:
        result = response.json()
        if result.get('success'):
            print(f"✅ Payment verified successfully for {authority}")
            return True
        else:
            print(f"❌ Payment verification failed: {result.get('error')}")
    else:
        print(f"❌ Payment verification request failed: {response.status_code} - {response.text}")
    
    return False

def check_admin_orders():
    """Check admin orders to see if consolidation is working"""
    print("🔄 Checking admin orders for consolidation...")
    
    response = requests.get(f"{ADMIN_API_URL}/orders")
    
    if response.status_code != 200:
        print(f"❌ Failed to get admin orders: {response.status_code} - {response.text}")
        return False
    
    orders = response.json()
    
    print(f"📋 Found {len(orders)} orders")
    
    # Look for consolidated orders
    consolidated_orders = [order for order in orders if order.get('consolidated')]
    
    if consolidated_orders:
        print(f"✅ Found {len(consolidated_orders)} consolidated orders!")
        
        for order in consolidated_orders:
            print(f"🔍 Consolidated Order #{order['id']}:")
            print(f"   - User: {order['user_name']} ({order['user_phone']})")
            print(f"   - Total Amount: {order['total_amount']} تومان")
            print(f"   - Members: {order.get('consolidated_member_count', 0) + 1}")
            
            # Get order details
            details_response = requests.get(f"{ADMIN_API_URL}/orders/{order['id']}")
            if details_response.status_code == 200:
                details = details_response.json()
                if details.get('consolidated') and details.get('participants'):
                    print(f"   - Participants:")
                    for idx, participant in enumerate(details['participants']):
                        role = "(Leader)" if idx == 0 else "(Member)"
                        print(f"     {idx + 1}. {participant['user_name']} {role} - {participant['total_amount']} تومان")
                        print(f"        Items: {len(participant['items'])} products")
        
        return True
    else:
        print("❌ No consolidated orders found")
        return False

def main():
    """Main test function"""
    print("🚀 Starting Order Consolidation Test")
    print("=" * 50)
    
    # Step 1: Create test group order
    test_data = create_test_group_order()
    if not test_data:
        print("❌ Failed to create test group order")
        return
    
    # Step 2: Simulate payments (in a real scenario, users would pay through ZarinPal)
    print("\n🔄 Simulating payment process...")
    leader_paid = verify_payment_simulation(test_data['leader_authority'])
    invited_paid = verify_payment_simulation(test_data['invited_authority'])
    
    if not (leader_paid and invited_paid):
        print("❌ Payment simulation failed")
        return
    
    # Wait a moment for the system to process
    print("⏳ Waiting for system to process payments...")
    time.sleep(2)
    
    # Step 3: Check admin orders for consolidation
    print("\n🔍 Checking admin panel for consolidated orders...")
    success = check_admin_orders()
    
    if success:
        print("\n✅ Order consolidation test PASSED!")
        print("🎉 When leader and invited users both enable consolidation toggle,")
        print("   their orders are combined into a single order in the admin panel")
        print("   with each user's products listed separately.")
    else:
        print("\n❌ Order consolidation test FAILED!")
        print("🔧 Check that:")
        print("   1. Backend is running on http://localhost:8000")
        print("   2. Database has the necessary tables and columns")
        print("   3. ship_to_leader_address field is being set correctly")

if __name__ == "__main__":
    main()
