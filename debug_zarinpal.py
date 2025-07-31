#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import json

def debug_zarinpal():
    print("🔍 تست مستقیم ZarinPal API...")
    print("=" * 50)
    
    # Test ZarinPal API directly
    zarinpal_data = {
        "merchant_id": "00000000-0000-0000-0000-000000000000",  # Sandbox merchant ID
        "amount": 10000,  # 1,000 Toman in Rial
        "description": "تست مستقیم",
        "callback_url": "http://localhost:3000/payment/verify"
    }
    
    print(f"📤 ارسال درخواست به ZarinPal:")
    print(f"   URL: https://sandbox.zarinpal.com/pg/rest/WebGate/PaymentRequest.json")
    print(f"   Data: {zarinpal_data}")
    print("-" * 30)
    
    try:
        response = requests.post(
            "https://sandbox.zarinpal.com/pg/rest/WebGate/PaymentRequest.json",
            json=zarinpal_data,
            timeout=15
        )
        
        print(f"📥 پاسخ دریافت شد:")
        print(f"   Status Code: {response.status_code}")
        print(f"   Headers: {dict(response.headers)}")
        print(f"   Content: {response.text}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                print(f"   JSON: {result}")
                
                if result.get('Status') == 100:
                    authority = result.get('Authority')
                    print(f"✅ موفق! Authority: {authority}")
                    print(f"🔗 لینک پرداخت: https://sandbox.zarinpal.com/pg/StartPay/{authority}")
                else:
                    print(f"❌ خطا از ZarinPal: Status = {result.get('Status')}")
                    print(f"   Errors: {result.get('errors', 'No error details')}")
            except json.JSONDecodeError as e:
                print(f"❌ خطا در تجزیه JSON: {e}")
        else:
            print(f"❌ خطا HTTP: {response.status_code}")
            
    except requests.exceptions.Timeout:
        print("❌ خطا: Timeout - ارتباط با ZarinPal قطع شد")
    except requests.exceptions.ConnectionError:
        print("❌ خطا: Connection Error - عدم دسترسی به اینترنت یا ZarinPal")
    except Exception as e:
        print(f"❌ خطا: {type(e).__name__}: {e}")

if __name__ == "__main__":
    debug_zarinpal() 