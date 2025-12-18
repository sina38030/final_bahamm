#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Add missing categories via API (for production)
Usage: python add_categories_via_api.py
"""
import requests
import sys

# Production API URL
API_BASE_URL = "https://bahamm.ir/api"  # یا هر URL دیگری که سرور production شما داره

# Categories to add
categories_to_add = [
    {"name": "محصولات عمومی", "slug": "general"},
    {"name": "خواربار", "slug": "grocery"},
    {"name": "لبنیات", "slug": "dairy"},
    {"name": "پروتئین", "slug": "protein"},
]

def add_categories():
    """Add categories via API"""
    print("=" * 70)
    print("Adding categories via API...")
    print("=" * 70)
    
    # Note: You might need authentication token
    # If your API requires auth, add headers like:
    # headers = {"Authorization": "Bearer YOUR_TOKEN_HERE"}
    
    headers = {
        "Content-Type": "application/json"
    }
    
    added_count = 0
    
    for cat_data in categories_to_add:
        print(f"\nAdding category: {cat_data['name']}")
        
        try:
            # Try to create category via admin API
            response = requests.post(
                f"{API_BASE_URL}/admin/categories",
                json=cat_data,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"  ✓ Created: {cat_data['name']} (ID: {result.get('category_id')})")
                added_count += 1
            elif response.status_code == 400 and "already exists" in response.text.lower():
                print(f"  ⚠ Already exists: {cat_data['name']}")
            else:
                print(f"  ✗ Failed: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"  ✗ Error: {e}")
    
    print("\n" + "=" * 70)
    print(f"✓ Done! Added {added_count} categories.")
    print("=" * 70)
    
    return added_count

if __name__ == "__main__":
    print("\n⚠ IMPORTANT: This script will add categories to PRODUCTION!")
    print("API URL:", API_BASE_URL)
    
    # Ask for confirmation
    confirm = input("\nDo you want to continue? (yes/no): ")
    if confirm.lower() not in ['yes', 'y']:
        print("Cancelled.")
        sys.exit(0)
    
    add_categories()






