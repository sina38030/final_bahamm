#!/usr/bin/env python3
import requests
import json

# Test the my-groups-and-orders API
def test_groups_api():
    url = "http://127.0.0.1:8001/api/group-orders/my-groups-and-orders"
    
    # We need to find a valid user_id from the database first
    print("Testing my-groups-and-orders API...")
    
    # Try without auth first (should fail)
    try:
        response = requests.get(url)
        print(f"No auth: Status {response.status_code}")
        if response.status_code != 200:
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Try with fake auth token (should also fail but differently)
    try:
        headers = {"Authorization": "Bearer fake_token"}
        response = requests.get(url, headers=headers)
        print(f"Fake auth: Status {response.status_code}")
        if response.status_code != 200:
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

# Test the admin group-buys API to see all groups
def test_admin_groups_api():
    url = "http://127.0.0.1:8001/api/admin/group-buys"
    
    print("\nTesting admin group-buys API...")
    try:
        response = requests.get(url)
        print(f"Admin API: Status {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Found {len(data)} groups")
            
            # Show recent groups with kind info
            for i, group in enumerate(data[:3]):
                print(f"Group {group.get('id')}: kind={group.get('kind', 'unknown')}, status={group.get('status')}")
        else:
            print(f"Error response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_groups_api()
    test_admin_groups_api()