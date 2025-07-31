# Payment Authentication Troubleshooting Guide

## Problem: "Authentication Required" Error on Payment

If you're getting an "authentication required" error when clicking the payment button, here's how to fix it:

## ✅ What Was Fixed

The issue was that the checkout page wasn't sending the authentication token with the payment request. The following changes were made:

### 1. Updated Checkout Page (`frontend/src/app/checkout/page.tsx`)

**Before:**
```javascript
const response = await fetch('/api/payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    amount: amountInRial,
    description: `پرداخت سفارش - ${items.length} کالا`,
    mobile: savedAddress?.phone,
  }),
});
```

**After:**
```javascript
// Get authentication token
const token = localStorage.getItem('auth_token');
if (!token) {
  alert('لطفاً ابتدا وارد حساب کاربری خود شوید');
  router.push('/auth/login');
  return;
}

const response = await fetch('/api/payment', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`, // Added auth header
  },
  body: JSON.stringify({
    amount: amountInRial,
    description: `پرداخت سفارش - ${items.length} کالا`,
    mobile: savedAddress?.phone,
    items: orderItems, // Added items for order creation
  }),
});
```

### 2. Enhanced Payment Callback (`frontend/src/app/payment/callback/page.tsx`)

- Added proper token validation
- Added payment verification step
- Improved error handling and user feedback

## 🔍 How to Test the Fix

1. **Make sure you're logged in:**
   - Go to `/auth/login`
   - Enter your phone number
   - Verify with OTP code

2. **Check if token exists:**
   - Open browser DevTools (F12)
   - Go to Application/Storage tab
   - Check Local Storage for `auth_token`

3. **Test payment flow:**
   - Add items to cart
   - Go to checkout
   - Click payment button
   - Should redirect to ZarinPal instead of showing auth error

## 🚨 Common Issues and Solutions

### Issue 1: Still Getting Auth Error
**Possible Causes:**
- Token expired
- User not properly logged in
- Token corrupted

**Solution:**
1. Clear browser storage: `localStorage.clear()`
2. Log in again
3. Try payment again

### Issue 2: "Token not found" Error
**Possible Causes:**
- User never logged in
- Token was cleared

**Solution:**
1. Go to `/auth/login`
2. Complete login process
3. Return to checkout

### Issue 3: Token Exists But Still Auth Error
**Possible Causes:**
- Token format incorrect
- Backend auth middleware issue

**Solution:**
1. Check token format in DevTools
2. Should start with "eyJ..." (JWT format)
3. If not, clear storage and login again

## 🔧 Debug Steps

### 1. Check Token in Browser
```javascript
// Open browser console and run:
console.log('Token:', localStorage.getItem('auth_token'));
```

### 2. Check Token Validity
```javascript
// In browser console:
const token = localStorage.getItem('auth_token');
if (token) {
  fetch('/api/payment', {
    method: 'GET', 
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(r => console.log('Auth status:', r.status));
}
```

### 3. Verify Backend is Running
- Backend should be running on `http://localhost:8001`
- Check if `/api/payment/request` endpoint is accessible

## 📋 Checklist Before Payment

- [ ] User is logged in (check token in localStorage)
- [ ] Backend server is running
- [ ] Frontend can communicate with backend
- [ ] User has selected address
- [ ] Cart has items

## 🛠 Manual Testing

### Test Authentication Flow:
1. Go to `/auth/login`
2. Enter: `09123456789`
3. Use verification code from backend logs
4. Should redirect and store token

### Test Payment Flow:
1. Add items to cart
2. Go to `/checkout`
3. Select address
4. Click payment button
5. Should redirect to ZarinPal (not show auth error)

## 📞 Still Having Issues?

If you're still getting authentication errors:

1. **Check browser console** for detailed error messages
2. **Check backend logs** for auth-related errors
3. **Verify environment variables** are set correctly
4. **Test with a fresh browser session** (incognito mode)

## 💡 Tips

- Always test in incognito mode to avoid cached auth issues
- Check both frontend console and backend logs for errors
- Ensure backend is running before testing frontend
- Use browser DevTools Network tab to see actual API requests 