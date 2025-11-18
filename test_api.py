#!/usr/bin/env python3
import requests

try:
    response = requests.get('http://localhost:8001/api/popular-searches', timeout=10)
    print(f'Status: {response.status_code}')
    if response.status_code == 200:
        data = response.json()
        print(f'Success! Found {len(data)} popular searches:')
        for item in data[:3]:  # Show first 3
            print(f'  - {item["search_term"]} (active: {item["is_active"]})')
    else:
        print(f'Error response: {response.text}')
except requests.exceptions.RequestException as e:
    print(f'Request failed: {e}')
except Exception as e:
    print(f'Other error: {e}')