# Invited User Redirect Fix

## Problem
After successful payment, invited users were being redirected to `backend/api/payment` instead of the frontend success page `/payment/success/invitee`.

## Root Cause
The issue was multi-faceted:

1. **Order Type Detection**: The callback endpoint was checking `order.order_type == OrderType.ALONE` before checking if the order had a `group_order_id`, causing invited users to be misclassified as solo orders.

2. **Database Session Staleness**: After payment verification, the order needed to be refreshed from the database to get the updated `group_order_id` and `order_type`.

3. **Missing Fallback Detection**: If group linking failed for any reason, invited users weren't being detected and redirected to the correct page.

4. **Configuration Logging**: No visibility into what frontend URL was being used for redirects.

## Changes Made

### 1. backend/app/routes/payment.py

#### Added Configuration Logging (Lines 26-30)
```python
# Log configuration on startup
logger.info(f"🔧 Payment Routes Configuration:")
logger.info(f"   FRONTEND_URL: {settings.FRONTEND_URL}")
logger.info(f"   get_frontend_public_url: {settings.get_frontend_public_url}")
logger.info(f"   get_payment_callback_base_url: {settings.get_payment_callback_base_url}")
```

#### Enhanced Verification and Database Refresh (Lines 587-608)
- Added logging for verification results
- Added `db.commit()` after verification to ensure changes are persisted
- Used fresh SQLAlchemy `select()` query instead of cached query
- Added `db.refresh(order)` to force reload from database
- Added detailed logging of order state after refresh

#### Added Fallback Detection (Lines 625-633)
```python
# ✅ FALLBACK: Check if this was an invited order even if group linking somehow failed
was_invited_checkout = False
if order.shipping_address and (
    order.shipping_address.startswith("PENDING_INVITE:") or
    "PENDING_INVITE:" in order.shipping_address
):
    logger.warning(f"⚠️ Order {order.id} still has PENDING_INVITE marker - group linking may have failed")
    was_invited_checkout = True
```

#### Fixed Order Type Detection (Lines 635-645)
Changed from:
```python
if order.order_type == OrderType.ALONE:
```

To:
```python
if order.order_type == OrderType.ALONE and not order.group_order_id and not was_invited_checkout:
```

This ensures:
- Orders with `group_order_id` are never treated as solo orders
- Orders that were invited at checkout are properly detected even if group linking failed

#### Added Logging for Redirect URLs (Lines 613-616, 641-645, 665-670)
- Log the frontend base URL being used
- Log the final redirect URL before returning
- Helps debug configuration issues

### 2. backend/app/config.py

#### Enhanced `get_frontend_public_url` Method (Lines 50-66)
```python
if not base:
    # Fallback to safe default if not configured
    return "http://localhost:3000"
# ... strip backend suffixes ...
# Ensure we always have a valid URL
if not base:
    return "http://localhost:3000"
return base
```

Added double-check to ensure the method never returns an empty string, which would cause malformed redirect URLs.

### 3. backend/app/services/payment_service.py

#### Enhanced Invited User Detection Logging (Lines 320-366)
```python
logger.info(f"🔍 Checking if order {order.id} is invited: shipping_address={order.shipping_address[:100] if order.shipping_address else None}")
if order.shipping_address and order.shipping_address.startswith("PENDING_INVITE:"):
    logger.info(f"✅ INVITED USER DETECTED: order {order.id} has PENDING_INVITE prefix")
    # ... resolve group ...
    if pending_group_id:
        logger.info(f"✅✅✅ SUCCESSFULLY LINKED invited order {order.id} to group {pending_group_id} via invite token {invite_token}")
        logger.info(f"   Order type updated to: {order.order_type}")
        logger.info(f"   Order group_order_id updated to: {order.group_order_id}")
    else:
        logger.error(f"❌❌❌ Could not resolve group for invite token {invite_token} on order {order.id}")
```

## How It Works Now

### Payment Flow for Invited Users

1. **User pays at Zarinpal**
   - Order is created with `PENDING_INVITE:{invite_code}|{address}` in `shipping_address`

2. **Zarinpal redirects to backend callback**
   - URL: `https://bahamm.ir/backend/api/payment/callback?Authority=...&Status=OK`

3. **Backend processes payment**
   - Calls `verify_and_complete_payment()` which:
     - Verifies payment with Zarinpal
     - Detects `PENDING_INVITE:` prefix in shipping address
     - Resolves invite code to group
     - Sets `order.group_order_id` and `order.order_type = GROUP`
     - Commits changes to database
     - Logs everything with emoji indicators ✅❌⚠️

4. **Backend determines redirect destination**
   - Expires cached database objects with `db.expire_all()`
   - Commits any pending changes with `db.commit()`
   - Queries order again using fresh `select()` query
   - Refreshes order with `db.refresh(order)`
   - Checks if order has `group_order_id` (primary detection)
   - Checks if `shipping_address` has `PENDING_INVITE:` (fallback detection)
   - Determines user is invited
   - Constructs redirect URL: `{frontend_base}/payment/success/invitee?authority={Authority}&orderId={order.id}&groupId={group_id}`
   - Logs frontend base URL and final redirect URL
   - Returns `RedirectResponse` with status code 303

5. **Browser follows redirect to frontend**
   - User lands on `/payment/success/invitee` page
   - Frontend can load order details using authority/orderId parameters

## Testing

To verify the fix is working:

1. **Check Backend Logs on Startup**
   ```
   🔧 Payment Routes Configuration:
      FRONTEND_URL: https://bahamm.ir
      get_frontend_public_url: https://bahamm.ir
      get_payment_callback_base_url: https://bahamm.ir/backend/api
   ```

2. **Complete an Invited User Payment**
   - Monitor backend logs for:
     ```
     ✅ INVITED USER DETECTED: order X has PENDING_INVITE prefix
     ✅✅✅ SUCCESSFULLY LINKED invited order X to group Y via invite token GB...
     🔗 FRONTEND_BASE_URL (invitee): https://bahamm.ir
     🔗 REDIRECT_URL (invitee): https://bahamm.ir/payment/success/invitee?authority=...&orderId=X&groupId=Y
     🚀 Final redirect: https://bahamm.ir/payment/success/invitee?authority=...&orderId=X&groupId=Y
     ```

3. **Verify Redirect**
   - After payment, user should land on `/payment/success/invitee` page (not `/backend/api/payment`)
   - Page should show success message
   - "مبلغ پرداختیت رو پس بگیر!" button should be visible

## Fallback Handling

If group linking fails (invalid invite code, deleted group, etc.):
- Order will still have `PENDING_INVITE:` in shipping address
- Fallback detection will catch this: `was_invited_checkout = True`
- User will still be redirected to invitee success page
- Frontend can show appropriate error message

## Configuration Requirements

For production deployment, ensure `.env` or environment variables include:
```bash
FRONTEND_URL=https://bahamm.ir
```

Or for local development:
```bash
FRONTEND_URL=http://localhost:3000
```

The code will auto-detect and use the correct callback URLs.

## Monitoring

Look for these log patterns to monitor invited user payments:

**Success:**
```
✅ INVITED USER DETECTED
✅✅✅ SUCCESSFULLY LINKED
🔗 REDIRECT_URL (invitee): https://bahamm.ir/payment/success/invitee
```

**Failure:**
```
❌❌❌ Could not resolve group for invite token
⚠️ Order X still has PENDING_INVITE marker - group linking may have failed
⚠️ Order X was invited but group linking failed - redirecting to invitee page
```

## Related Files
- `backend/app/routes/payment.py` - Main callback endpoint
- `backend/app/services/payment_service.py` - Payment verification and group linking
- `backend/app/config.py` - Configuration and URL construction
- `frontend/src/app/payment/success/invitee/page.tsx` - Success page for invited users

