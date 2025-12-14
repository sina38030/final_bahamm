#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Check what categories exist in production
"""
import requests
import sys
import io

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Production API URL - change if needed
API_URL = "https://bahamm.ir/api/categories"

try:
    print("Fetching categories from production...")
    response = requests.get(API_URL, timeout=10)
    
    if response.status_code == 200:
        categories = response.json()
        print(f"\nFound {len(categories)} categories:\n")
        for cat in categories:
            print(f"  ID {cat.get('id')}: {cat.get('name')} (slug: {cat.get('slug')})")
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
        
except Exception as e:
    print(f"Error: {e}")
    print("\nCouldn't fetch from production. Please check manually in admin panel.")

