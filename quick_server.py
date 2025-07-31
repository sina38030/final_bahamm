#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import string
import uvicorn
import uuid
import requests

app = FastAPI(title="Quick Test Server")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PhoneRequest(BaseModel):
    phone_number: str
    user_type: str = "CUSTOMER"

# Memory storage
codes = {}
# Store payment amounts by authority for verification
payment_amounts = {}
order_data_storage = {}

@app.get("/")
async def root():
    return {"message": "سرور تست در حال اجرا است", "status": "OK"}

@app.get("/api/health")
async def health():
    return {"status": "healthy", "message": "سرور سالم است"}

# Admin endpoints for testing
@app.get("/admin/dashboard")
async def admin_dashboard():
    return {
        "total_users": 5,
        "total_products": 15,
        "total_orders": 8,
        "total_categories": 3,
        "recent_orders": 3,
        "total_revenue": 125000
    }

@app.get("/admin/orders")
async def admin_orders():
    return [
        {
            "id": 1,
            "user_id": 1,
            "user_name": "کاربر تست",
            "user_phone": "09155106656",
            "total_amount": 45000,
            "status": "COMPLETED",
            "created_at": "2025-01-08T10:00:00Z",
            "items_count": 2
        },
        {
            "id": 2,
            "user_id": 2,
            "user_name": "کاربر دوم",
            "user_phone": "09123456789",
            "total_amount": 80000,
            "status": "PENDING",
            "created_at": "2025-01-08T11:00:00Z",
            "items_count": 3
        }
    ]

@app.get("/admin/users")
async def admin_users():
    return [
        {
            "id": 1,
            "first_name": "علی",
            "last_name": "احمدی",
            "phone_number": "09155106656",
            "user_type": "CUSTOMER",
            "is_phone_verified": True,
            "created_at": "2025-01-01T10:00:00Z",
            "orders_count": 3
        },
        {
            "id": 2,
            "first_name": "فاطمه",
            "last_name": "محمدی",
            "phone_number": "09123456789",
            "user_type": "CUSTOMER",
            "is_phone_verified": True,
            "created_at": "2025-01-02T10:00:00Z",
            "orders_count": 1
        }
    ]

@app.get("/admin/products")
async def admin_products():
    return [
        {
            "id": 1,
            "name": "سیب قرمز ممتاز",
            "price": 25000,
            "inventory": 100,
            "category_name": "میوه",
            "store_name": "فروشگاه میوه",
            "created_at": "2025-01-01T10:00:00Z"
        },
        {
            "id": 2,
            "name": "موز درجه یک",
            "price": 18000,
            "inventory": 50,
            "category_name": "میوه",
            "store_name": "فروشگاه میوه",
            "created_at": "2025-01-01T10:00:00Z"
        }
    ]

@app.get("/admin/categories")
async def admin_categories():
    return [
        {
            "id": 1,
            "name": "میوه",
            "description": "انواع میوه‌های تازه",
            "created_at": "2025-01-01T10:00:00Z"
        },
        {
            "id": 2,
            "name": "سبزیجات",
            "description": "انواع سبزیجات تازه",
            "created_at": "2025-01-01T10:00:00Z"
        }
    ]

@app.get("/admin/group-buys")
async def admin_group_buys():
    return [
        {
            "id": 1,
            "product_name": "سیب قرمز ممتاز",
            "creator_name": "علی احمدی",
            "creator_phone": "09155106656",
            "invite_code": "ABC123",
            "participants_count": 5,
            "status": "ACTIVE",
            "created_at": "2025-01-08T10:00:00Z",
            "expires_at": "2025-01-15T10:00:00Z"
        },
        {
            "id": 2,
            "product_name": "موز درجه یک",
            "creator_name": "فاطمه محمدی",
            "creator_phone": "09123456789",
            "invite_code": "XYZ789",
            "participants_count": 3,
            "status": "COMPLETED",
            "created_at": "2025-01-07T10:00:00Z",
            "expires_at": "2025-01-14T10:00:00Z"
        }
    ]

@app.post("/api/auth/send-verification")
async def send_verification(request: PhoneRequest):
    # Generate 5-digit code
    code = ''.join(random.choices(string.digits, k=5))
    codes[request.phone_number] = code
    
    # Print to console
    print(f"\n🔥 کد تایید برای {request.phone_number}: {code}")
    print(f"📱 نوع کاربر: {request.user_type}")
    print("-" * 50)
    
    return {
        "message": "کد تایید با موفقیت ارسال شد",
        "success": True,
        "expires_in": 300
    }

@app.post("/api/auth/verify")
async def verify_code(phone_number: str, code: str):
    stored_code = codes.get(phone_number)
    if stored_code and stored_code == code:
        print(f"✅ کد تایید شد برای: {phone_number}")
        return {
            "message": "ورود موفقیت‌آمیز",
            "success": True,
            "token": "test_token_123"
        }
    else:
        print(f"❌ کد اشتباه برای: {phone_number}")
        return {
            "message": "کد تایید اشتباه است",
            "success": False
        }

@app.post("/api/payment/request")
@app.post("/api/payment/request-public")
async def payment_request(request: dict):
    print(f"\n💳 درخواست پرداخت:")
    print(f"   مبلغ: {request.get('amount', 0)} ریال")
    print(f"   توضیحات: {request.get('description', '')}")
    print(f"   موبایل: {request.get('mobile', '')}")
    print("-" * 50)
    
    # ZarinPal v4 API call
    import requests
    
    zarinpal_data = {
        "merchant_id": "2cea1309-4a05-4f02-82ce-9a6d183db8a4",  # Real merchant ID
        "amount": request.get('amount', 0),
        "description": request.get('description', 'پرداخت تست'),
        "callback_url": "http://localhost:3000/payment/callback"
    }
    
    try:
        response = requests.post(
            "https://api.zarinpal.com/pg/v4/payment/request.json",
            json=zarinpal_data,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
            timeout=15
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('data') and result['data'].get('code') == 100:
                authority = result['data'].get('authority')
                
                # Store payment amount for verification
                payment_amounts[authority] = request.get('amount', 0)
                
                print(f"✅ Authority دریافت شد: {authority}")
                
                return {
                    "success": True,
                    "payment_url": f"https://www.zarinpal.com/pg/StartPay/{authority}",
                    "authority": authority,
                    "message": "درخواست پرداخت با موفقیت ایجاد شد"
                }
            else:
                print(f"❌ خطا از ZarinPal: {result}")
                return {"success": False, "message": "خطا در ایجاد درخواست پرداخت"}
        else:
            print(f"❌ خطا HTTP: {response.status_code}")
            return {"success": False, "message": "خطا در ارتباط با درگاه پرداخت"}
            
    except Exception as e:
        print(f"❌ خطا: {e}")
        return {"success": False, "message": "خطا در ارتباط با سرور"}

@app.post("/api/payment/create-order")
@app.post("/api/payment/create-order-public")
async def create_order(request: dict):
    print(f"\n🛒 ایجاد سفارش:")
    items = request.get('items', [])
    total_amount = 0
    for item in items:
        item_total = item.get('quantity', 0) * item.get('price', 0)
        total_amount += item_total
        # Show product name if available, otherwise show product_id
        product_display = item.get('name', f"محصول {item.get('product_id')}")
        print(f"   {product_display}: {item.get('quantity')} عدد - {item.get('price')} تومان")
    
    # Convert Toman to Rial (multiply by 10)
    total_rial = total_amount * 10
    
    print(f"   مجموع: {total_amount} تومان ({total_rial} ریال)")
    print(f"   توضیحات: {request.get('description', '')}")
    print(f"   موبایل: {request.get('mobile', '')}")
    print("-" * 50)
    
    # Handle FREE orders specially (no ZarinPal payment needed)
    if total_rial == 0:
        print(f"🎉 FREE ORDER DETECTED!")
        free_authority = f"FREE_{random.randint(100000, 999999)}"
        order_id = "ORD_" + str(random.randint(1000, 9999))
        
        # Store the free order info AND order data
        payment_amounts[free_authority] = 0
        
        # Store complete product information from frontend for FREE orders
        enhanced_items = []
        for item in items:
            enhanced_item = {
                "product_id": item.get('product_id'),
                "quantity": item.get('quantity'),
                "price": item.get('price'),
                "name": item.get('name'),  # Store actual product name from frontend
                "image": item.get('image'),  # Store actual product image from frontend
                "description": item.get('description')  # Store actual product description from frontend
            }
            enhanced_items.append(enhanced_item)
        
        order_data_storage[free_authority] = {
            "items": enhanced_items,
            "total_amount": total_amount,
            "description": request.get('description', ''),
            "mobile": request.get('mobile', '')
        }
        
        print(f"✅ Free Authority: {free_authority}")
        print(f"✅ Order ID: {order_id}")
        print(f"🔍 Stored FREE order items: {items}")
        print("🎁 User will be redirected to invite page directly!")
        
        return {
            "success": True,
            "payment_url": f"http://localhost:3000/invite?authority={free_authority}&ref_id=FREE_{random.randint(100000, 999999)}",
            "authority": free_authority,
            "order_id": order_id,
            "total_amount": total_amount,
            "message": "سفارش رایگان با موفقیت ثبت شد",
            "payment_type": "FREE_ORDER"
        }
    
    # ZarinPal v4 API call - REAL PAYMENTS ONLY
    import requests
    
    zarinpal_data = {
        "merchant_id": "2cea1309-4a05-4f02-82ce-9a6d183db8a4",  # Real merchant ID
        "amount": total_rial,
        "description": request.get('description', 'پرداخت سفارش'),
        "callback_url": "http://localhost:3000/payment/callback"  # Updated callback URL to match frontend port
    }
    
    try:
        response = requests.post(
            "https://api.zarinpal.com/pg/v4/payment/request.json",
            json=zarinpal_data,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
            timeout=15
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('data') and result['data'].get('code') == 100:
                authority = result['data'].get('authority')
                order_id = "ORD_" + str(random.randint(1000, 9999))
                payment_url = f"https://www.zarinpal.com/pg/StartPay/{authority}"
                
                # Store payment amount and order data for verification
                payment_amounts[authority] = total_rial
                
                # Store complete product information from frontend
                enhanced_items = []
                for item in items:
                    enhanced_item = {
                        "product_id": item.get('product_id'),
                        "quantity": item.get('quantity'),
                        "price": item.get('price'),
                        "name": item.get('name'),  # Store actual product name from frontend
                        "image": item.get('image'),  # Store actual product image from frontend
                        "description": item.get('description')  # Store actual product description from frontend
                    }
                    enhanced_items.append(enhanced_item)
                
                order_data_storage[authority] = {
                    "items": enhanced_items,
                    "total_amount": total_amount,
                    "description": request.get('description', ''),
                    "mobile": request.get('mobile', '')
                }
                
                print(f"🎉 REAL BANKING PAYMENT CREATED!")
                print(f"✅ Authority: {authority}")
                print(f"✅ Order ID: {order_id}")
                print(f"🏦 Banking URL: {payment_url}")
                print("🏛️ User will be redirected to REAL BANK website!")
                
                return {
                    "success": True,
                    "payment_url": payment_url,
                    "authority": authority,
                    "order_id": order_id,
                    "total_amount": total_amount,
                    "message": "سفارش با موفقیت ایجاد شد - پرداخت بانکی واقعی",
                    "payment_type": "REAL_BANKING"
                }
            else:
                print(f"❌ خطا از ZarinPal: {result}")
                return {"success": False, "message": "خطا در ایجاد درخواست پرداخت"}
        else:
            print(f"❌ خطا HTTP: {response.status_code}")
            return {"success": False, "message": "خطا در ارتباط با درگاه پرداخت"}
            
    except Exception as e:
        print(f"❌ خطا: {e}")
        return {"success": False, "message": "خطا در ارتباط با سرور"}

@app.get("/api/payment/order/{authority}")
async def get_order_by_authority(authority: str):
    print(f"\n📋 درخواست اطلاعات سفارش:")
    print(f"   Authority: {authority}")
    print("-" * 50)
    
    # Check if this is a real authority (starts with A000...) or free (starts with FREE_)
    if authority.startswith('A000') or authority.startswith('FREE_'):
        # Get real order data if available, otherwise use defaults
        stored_order = order_data_storage.get(authority, {})
        stored_items = stored_order.get('items', [])
        
        # Debug: Print stored order data
        print(f"🔍 Stored order data: {stored_order}")
        print(f"🔍 Stored items: {stored_items}")
        
        # Product name mapping based on common product IDs
        product_names = {
            1: "خیار گلخانه‌ای",
            2: "گوجه فرنگی درشت",
            3: "پیاز زرد",
            4: "سیب قرمز",
            5: "موز",
            6: "پرتقال"
        }
        
        # Product images mapping
        product_images = {
            1: "https://bahamm.ir/img/products/cucumber.jpg",
            2: "https://bahamm.ir/img/products/tomato.jpg",
            3: "https://bahamm.ir/img/products/onion.jpg",
            4: "https://bahamm.ir/img/products/apple.jpg",
            5: "https://bahamm.ir/img/products/banana.jpg",
            6: "https://bahamm.ir/img/products/orange.jpg"
        }
        
        # Convert real items to proper format for frontend
        formatted_items = []
        for i, item in enumerate(stored_items):
            product_id = item.get('product_id', i + 1)
            quantity = item.get('quantity', 1)
            price = item.get('price', 0)
            
            # PRIORITIZE real product information from frontend
            product_name = item.get('name')
            if not product_name:
                # Only use mapping if no real name provided
                product_name = product_names.get(product_id, f"محصول {product_id}")
            
            # Use real product image if available, otherwise use mapping
            product_image = item.get('image')
            if not product_image:
                # Only use mapping if no real image provided
                product_image = product_images.get(product_id, "https://bahamm.ir/img/products/placeholder.jpg")
            
            # Use real product description if available
            product_description = item.get('description')
            if not product_description:
                product_description = f"توضیحات {product_name}"
            
            formatted_items.append({
                "id": i + 1,
                "product_id": product_id,
                "quantity": quantity,
                "base_price": price,
                "product": {
                    "id": product_id,
                    "name": product_name,
                    "description": product_description,
                    "market_price": price,
                    "images": [product_image]
                }
            })
        
        # If no real items stored, create default item
        if not formatted_items:
            total_amount = payment_amounts.get(authority, 50000)
            formatted_items.append({
                "id": 1,
                "product_id": 1,
                "quantity": 1,
                "base_price": total_amount,
                "product": {
                    "id": 1,
                    "name": "خیار گلخانه‌ای",
                    "description": "خیار تازه گلخانه‌ای",
                    "market_price": total_amount,
                    "images": ["https://bahamm.ir/img/products/cucumber.jpg"]
                }
            })
        
        order_data = {
            "success": True,
            "order": {
                "id": f"ORD_{random.randint(1000, 9999)}",
                "total_amount": stored_order.get('total_amount', payment_amounts.get(authority, 50000)),
                "status": "completed",
                "created_at": "2024-01-01T12:00:00Z",
                "payment_authority": authority,
                "payment_ref_id": f"REF_{random.randint(100000, 999999)}",
                "items": formatted_items,
                "group_buy": {
                    "expires_at": "2024-12-31T23:59:59Z",
                    "participants_count": 1,
                    "invite_code": f"INV_{random.randint(100000, 999999)}"
                }
            }
        }
        
        print(f"✅ اطلاعات سفارش ارسال شد با {len(formatted_items)} محصول")
        print(f"🎯 محصولات: {[item['product']['name'] for item in formatted_items]}")
        return order_data
    else:
        print(f"❌ Authority نامعتبر")
        return {
            "success": False,
            "error": "Authority نامعتبر است"
        }

@app.post("/api/payment/verify")
@app.post("/api/payment/verify-public")
async def verify_payment(request: dict):
    authority = request.get('authority')
    
    # Look up the amount from stored payments
    amount = payment_amounts.get(authority)
    
    print(f"\n✅ تایید پرداخت:")
    print(f"   Authority: {authority}")
    print(f"   مبلغ: {amount} ریال")
    print("-" * 50)
    
    # Check if we have the payment amount
    if amount is None:
        print(f"❌ خطا: مبلغ پرداخت برای Authority {authority} یافت نشد")
        
        # Check if this is a free order
        if authority and authority.startswith('FREE_'):
            print(f"🎁 Free Order تایید شد: {authority}")
            return {
                "success": True,
                "ref_id": f"FREE_REF_{random.randint(100000, 999999)}",
                "message": "سفارش رایگان با موفقیت تایید شد"
            }
        
        return {
            "success": False,
            "message": "خطا: اطلاعات پرداخت یافت نشد"
        }
    
    # ZarinPal v4 verification
    import requests
    
    verify_data = {
        "merchant_id": "2cea1309-4a05-4f02-82ce-9a6d183db8a4",  # Real merchant ID
        "authority": authority,
        "amount": amount
    }
    
    try:
        response = requests.post(
            "https://api.zarinpal.com/pg/v4/payment/verify.json",
            json=verify_data,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
            timeout=15
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('data') and result['data'].get('code') == 100:
                ref_id = result['data'].get('ref_id')
                print(f"✅ پرداخت تایید شد - RefID: {ref_id}")
                
                # Clean up stored payment amount after successful verification
                if authority in payment_amounts:
                    del payment_amounts[authority]
                
                return {
                    "success": True,
                    "ref_id": ref_id,
                    "message": "پرداخت با موفقیت تایید شد"
                }
            else:
                print(f"❌ خطا در تایید: {result}")
                return {"success": False, "message": "پرداخت تایید نشد"}
        else:
            print(f"❌ خطا HTTP: {response.status_code}")
            return {"success": False, "message": "خطا در ارتباط با درگاه پرداخت"}
            
    except Exception as e:
        print(f"❌ خطا: {e}")
        return {"success": False, "message": "خطا در ارتباط با سرور"}

if __name__ == "__main__":
    print("🚀 شروع سرور تست...")
    print("📍 آدرس: http://localhost:8002")
    print("🔧 برای توقف: Ctrl+C")
    print("=" * 50)
    
    uvicorn.run(
        app, 
        host="127.0.0.1", 
        port=8002,
        log_level="info"
    ) 