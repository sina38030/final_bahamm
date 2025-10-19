# Leader Payment Redirect Fix

## Problem
After a leader user clicked the pay button on the checkout page and completed a successful payment, they were being redirected to the success page (`/payment/success/invitee`) instead of the invite page (`/invite`).

## Root Causes

### 1. Backend Payment Callback Logic Issue
**File**: `backend/app/routes/payment.py` (lines 677-703)

**Problem**: The payment callback logic had a flaw in handling cases where:
- The `group_order` lookup failed (returned None)
- The `leader_id` didn't match for some reason

In these cases, the `else` clause would treat the leader as an invited user and redirect them to `/payment/success/invitee` instead of `/invite`.

**Fix**: 
- Added explicit check for when `group_order` is not found
- For GROUP order types without a found `group_order`, default to `/invite` (safer for leaders)
- Improved logging to include user_id and leader_id for debugging
- Updated the fallback logic to check `order_type` and send GROUP orders to invite page

### 2. Frontend Payment Callback Flag Issue
**File**: `frontend/src/app/payment/callback/page.tsx` (lines 52-89, 266-310)

**Problem**: The `payment_success_reached` localStorage flag was being checked for all users. This flag is set by the `/payment/success/invitee` page. If a leader somehow visited the success page (due to backend bug), the flag would be set, and subsequent visits to the callback page would show success inline instead of redirecting to invite.

**Fix**:
- Clear the `payment_success_reached` flag at the start of leader flow processing
- Removed the flag check for leader redirects - only check for actual page reloads
- This prevents leaders from getting stuck if they were incorrectly sent to success page

### 3. Group Order Creation Logic Issue
**File**: `backend/app/routes/payment.py` (line 331)

**Problem**: The condition for creating a GroupOrder was:
```python
if ((getattr(order_data, 'mode', None) or '').lower() == 'group' or not is_invited_user) and not order.group_order_id:
```

The `or not is_invited_user` clause would create GroupOrders for solo orders (where `is_invited_user` is False), which could lead to incorrect order types.

**Fix**: Changed to:
```python
if ((getattr(order_data, 'mode', None) or '').lower() == 'group' and not is_invited_user) and not order.group_order_id:
```

Now GroupOrder is only created when:
- `mode` is explicitly 'group' (sent from checkout page for leaders)
- AND user is not an invited user
- AND the order doesn't already have a group_order_id

## Changes Made

### Backend: `backend/app/routes/payment.py`

1. **Lines 681-717**: Improved payment callback redirect logic
   - Added explicit handling for missing `group_order`
   - Check `order.order_type` to determine appropriate fallback
   - Better logging with user_id and leader_id
   - GROUP orders without group_order now redirect to `/invite` (safer default)

2. **Line 331**: Fixed GroupOrder creation condition
   - Changed `or not is_invited_user` to `and not is_invited_user`
   - Prevents solo orders from being treated as group orders

### Frontend: `frontend/src/app/payment/callback/page.tsx`

1. **Lines 52-89**: Fixed leader redirect after processed authority check
   - Clear `payment_success_reached` flag for leader flows
   - Remove flag check, only check for page reload
   - Improved logging

2. **Lines 266-310**: Fixed default leader flow redirect
   - Clear `payment_success_reached` flag
   - Remove flag check, only check for page reload
   - Improved logging

## Testing Recommendations

1. **Leader Flow Test**:
   - Create a new group order as a leader
   - Complete payment
   - Verify redirect goes to `/invite` page
   - Check browser console for logs confirming leader detection

2. **Invited User Flow Test**:
   - Join an existing group using invite code
   - Complete payment
   - Verify redirect goes to `/payment/success/invitee` page

3. **Solo Purchase Test**:
   - Make a solo purchase (mode='alone')
   - Complete payment
   - Verify redirect goes to `/payment/callback` and shows success

4. **Reload Test**:
   - After successful leader payment, reload the callback page
   - Verify it shows success inline and doesn't redirect again

## Technical Details

### Leader Detection Logic
The backend now uses a multi-step approach to detect leaders:

1. Check if `order.order_type == OrderType.GROUP`
2. If order has `group_order_id`, look up the GroupOrder
3. Compare `group_order.leader_id` with `order.user_id`
4. If group_order not found but order_type is GROUP, assume leader

### Flow Diagram

```
Payment Complete
    ↓
Backend Callback (/api/payment/callback)
    ↓
Check order.order_type
    ↓
┌─────────────────┐
│ ALONE           │ → Redirect to /payment/callback?Authority=XXX
│                 │   → Frontend shows success or redirects to /invite
└─────────────────┘
┌─────────────────┐
│ GROUP           │ → Check group_order_id
│                 │   ↓
│                 │   Has group_order_id?
│                 │   ┌─ Yes → Look up GroupOrder
│                 │   │         ↓
│                 │   │         leader_id == user_id?
│                 │   │         ├─ Yes → LEADER → /invite
│                 │   │         └─ No  → INVITED → /payment/success/invitee
│                 │   │
│                 │   └─ No → Check order_type
│                 │             ├─ GROUP → /invite (safer default)
│                 │             └─ Other → /payment/success/invitee
└─────────────────┘
```

## Logs to Monitor

When testing, look for these log messages:

Backend:
- `✅ Leader order detected (order_id=X, group_id=Y, user_id=Z) ➜ redirecting to /invite`
- `✅ Invited user order detected (order_id=X, group_id=Y, user_id=Z, leader_id=W) ➜ redirecting to /payment/success/invitee`
- `GroupOrder X not found for order Y! Defaulting to invite page for GROUP orders.`

Frontend:
- `[PaymentCallback] Redirecting leader to invite page: /invite?authority=XXX`
- `[PaymentCallback] Redirecting leader to invite page (default flow): /invite?authority=XXX`

## Date
October 19, 2025

