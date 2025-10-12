# Payment Gateway Setup Guide

This guide will help you complete the ZarinPal payment gateway integration for your Bahamm application.

## 🎯 What's Already Done

✅ **Backend Implementation**
- ZarinPal payment class with request/verify methods
- Payment routes with `/request`, `/verify`, `/callback`, and `/create-order` endpoints
- Payment service for complete order management
- Database models updated with payment tracking fields

✅ **Frontend Implementation** 
- Checkout page with payment integration
- Payment callback handling page
- Payment success/failure pages
- API routes for payment processing

## 🔧 Setup Steps

### 1. Database Migration

Run the database migration to add payment tracking fields:

```bash
cd backend
# If using PostgreSQL
psql -d bahamm -f migrations/add_payment_tracking_fields.sql

# Or if using SQLite
sqlite3 bahamm.db < migrations/add_payment_tracking_fields.sql
```

### 2. Environment Configuration

Create a `.env` file in the backend directory:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bahamm

# JWT Configuration  
SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# SMS Configuration
SMS_PROVIDER=melipayamak
MELIPAYAMAK_API_KEY=your-melipayamak-api-key

# Payment Gateway Configuration (ZarinPal)
ZARINPAL_MERCHANT_ID=your-zarinpal-merchant-id
ZARINPAL_SANDBOX=true  # Set to false for production
FRONTEND_URL=http://localhost:3000

# Application Configuration
DEBUG=true
LOG_LEVEL=INFO
```

### 3. Update ZarinPal Merchant ID

Replace the default merchant ID in your `.env` file with your actual ZarinPal merchant ID:
- Go to [ZarinPal Dashboard](https://dashboard.zarinpal.com/)
- Get your merchant ID from the dashboard
- Update `ZARINPAL_MERCHANT_ID` in your `.env` file

### 4. Frontend Environment Setup

Create/update `.env.local` in the frontend directory:

```env
BACKEND_URL=http://localhost:8001
NEXT_PUBLIC_API_URL=http://localhost:8001
```

## 🚀 Usage Examples

### Basic Payment Request

```javascript
// Frontend - Simple payment request
const response = await fetch('/api/payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    amount: 100000, // Amount in Rial (10,000 Toman)
    description: 'پرداخت سفارش',
    mobile: '09123456789',
  }),
});

const data = await response.json();
if (data.success) {
  window.location.href = data.payment_url;
}
```

### Complete Order Payment

```javascript
// Frontend - Create order with payment
const response = await fetch('/api/payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    items: [
      {
        product_id: 1,
        quantity: 2,
        price: 50000 // Price in Toman
      }
    ],
    description: 'خرید محصولات',
    mobile: '09123456789',
  }),
});
```

### Payment Verification

```javascript
// Frontend - Verify payment after callback
const response = await fetch('/api/payment', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    authority: 'A00000000000000000000000000123456789',
    amount: 100000, // Same amount as request
  }),
});
```

## 🎯 API Endpoints

### Backend Endpoints

- **POST** `/api/payment/request` - Simple payment request
- **POST** `/api/payment/create-order` - Create order with payment
- **POST** `/api/payment/verify` - Verify payment
- **GET** `/api/payment/callback` - Payment callback (for ZarinPal)
- **GET** `/api/payment/orders` - Get user payment orders

### Frontend API Routes

- **POST** `/api/payment` - Payment request proxy
- **PUT** `/api/payment` - Payment verification proxy

## 🔍 Testing

### Test Payment Flow

1. **Start the backend server:**
   ```bash
   cd backend
   uvicorn main:app --reload --port 8001
   ```

2. **Start the frontend development server:**
   ```bash
   cd frontend  
   npm run dev
   ```

3. **Test the checkout flow:**
   - Add items to cart
   - Go to checkout page
   - Select payment method
   - Complete payment process

### ZarinPal Sandbox Testing

For testing, use these sandbox credentials:
- **Card Number:** `5022291070873466`
- **Expiry Date:** Any future date
- **CVV2:** Any 3-4 digits

## 🛠 Troubleshooting

### Common Issues

1. **"Authentication required" error**
   - Ensure user is logged in
   - Check JWT token in cookies/headers

2. **"Payment request failed" error**
   - Verify ZarinPal merchant ID
   - Check network connectivity
   - Review backend logs

3. **Database errors**
   - Run the migration script
   - Check database connection
   - Verify table structure

### Debug Mode

Enable debug logging in your `.env` file:
```env
DEBUG=true
LOG_LEVEL=DEBUG
```

## 📊 Order Status Flow

```
در انتظار پرداخت → پرداخت شده → در حال پردازش → ارسال شده → تحویل داده شده
    ↓
پرداخت ناموفق
```

## 🔒 Security Notes

1. **Never expose merchant ID** in frontend code
2. **Always verify payments** on the backend
3. **Use HTTPS** in production
4. **Validate all user inputs** before processing
5. **Log all payment transactions** for audit trails

## 📈 Next Steps

1. **Add payment notifications** (SMS/Email)
2. **Implement refund system**
3. **Add payment analytics**
4. **Setup automated testing**
5. **Configure monitoring and alerts**

## 🆘 Support

For ZarinPal integration issues:
- [ZarinPal Documentation](https://docs.zarinpal.com/)
- [ZarinPal Support](https://zarinpal.com/contact)

For application issues:
- Check backend logs in `backend/logs/`
- Review frontend console for errors
- Test API endpoints with tools like Postman 