import requests
import json

url = "http://localhost:8001/api/payment/create-order-public"
headers = {"Content-Type": "application/json"}
data = {
    "items": [
        {"product_id": 1, "quantity": 1, "price": 10000}
    ],
    "mobile": "09123456789",
    "mode": "alone"
}

try:
    response = requests.post(url, json=data, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")

