#!/usr/bin/env python3
"""
Test script to verify both backend and frontend servers are running
"""

import requests
import time
import sys

def test_backend():
    """Test backend server"""
    try:
        print("Testing backend server...")
        response = requests.get('http://localhost:8001/api/admin/dashboard', timeout=5)
        print(f"✅ Backend Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Dashboard data: {data}")
        else:
            print(f"   Error: {response.text}")
        return response.status_code == 200
    except requests.exceptions.ConnectionError:
        print("❌ Backend server is not running on port 8001")
        return False
    except Exception as e:
        print(f"❌ Backend error: {e}")
        return False

def test_frontend():
    """Test frontend server"""
    try:
        print("Testing frontend server...")
        response = requests.get('http://localhost:3000', timeout=5)
        print(f"✅ Frontend Status: {response.status_code}")
        return response.status_code == 200
    except requests.exceptions.ConnectionError:
        print("❌ Frontend server is not running on port 3000")
        return False
    except Exception as e:
        print(f"❌ Frontend error: {e}")
        return False

def main():
    print("🧪 Testing Server Status")
    print("=" * 40)
    
    backend_ok = test_backend()
    print()
    frontend_ok = test_frontend()
    
    print("\n" + "=" * 40)
    if backend_ok and frontend_ok:
        print("✅ Both servers are running!")
        print("🌐 Admin Panel: http://localhost:3000/admin-full")
    else:
        print("❌ Some servers are not running")
        if not backend_ok:
            print("   Please start backend: python backend/main.py")
        if not frontend_ok:
            print("   Please start frontend: cd frontend && npm run dev")
        
        print("\n💡 Or use the batch file: start_servers_fixed.bat")
    
    return 0 if (backend_ok and frontend_ok) else 1

if __name__ == "__main__":
    sys.exit(main()) 