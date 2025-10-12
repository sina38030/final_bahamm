#!/usr/bin/env python3
"""
Test script to verify timezone changes are working correctly
"""

import requests
import json
from datetime import datetime, timezone, timedelta

def test_time_api():
    try:
        # Test the time API
        response = requests.get('http://localhost:8001/api/time/now')
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Time API Response: {json.dumps(data, indent=2)}")
            
            # Parse the returned time
            api_time_str = data.get('now', '')
            if '+03:30' in api_time_str or '+0330' in api_time_str:
                print("✅ API is returning Tehran timezone (+03:30)")
            else:
                print(f"❌ API timezone might be incorrect: {api_time_str}")
                
        else:
            print(f"❌ Time API failed with status: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing time API: {e}")

def test_admin_api():
    try:
        # Test a simple admin endpoint
        response = requests.get('http://localhost:8001/api/admin/dashboard')
        if response.status_code == 200:
            print("✅ Admin API is accessible")
        else:
            print(f"⚠️ Admin API returned status: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing admin API: {e}")

def show_current_times():
    # Show different timezone representations
    tehran_tz = timezone(timedelta(hours=3, minutes=30))
    utc_tz = timezone.utc
    
    now_tehran = datetime.now(tehran_tz)
    now_utc = datetime.now(utc_tz)
    
    print(f"\n📅 Current Times:")
    print(f"Tehran (UTC+3:30): {now_tehran.isoformat()}")
    print(f"UTC: {now_utc.isoformat()}")
    print(f"Time difference: {(now_tehran - now_utc).total_seconds() / 3600} hours")

if __name__ == "__main__":
    print("🔍 Testing Timezone Changes...")
    print("=" * 50)
    
    show_current_times()
    print("\n" + "=" * 50)
    
    test_time_api()
    test_admin_api()
    
    print("\n" + "=" * 50)
    print("✅ Timezone testing completed!")
