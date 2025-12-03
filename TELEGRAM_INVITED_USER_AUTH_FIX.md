# 🔐 Telegram Mini App: Invited User Authentication Fix

## Problem Summary

When invited users tried to join a group order through the Telegram mini app, they were incorrectly identified as the **group leader**, causing:

1. ❌ **Wrong user_id**: Invited user's order was saved with leader's `user_id`
2. ❌ **Wrong redirect**: After payment, redirected to `/invite` instead of `/payment/success/invitee`
3. ❌ **Wrong telegram_id**: In admin-full, invited users showed leader's telegram_id/username

### Why It Happened

**In Web Browser (✅ Works Correctly)**:
- Each user opens invite link in their own browser
- Separate localStorage and authentication tokens
- Each user has their own session

**In Telegram Mini App (❌ Was Broken)**:
- When users share invite links, mini app maintains the **same localStorage**
- Invited user **inherits leader's JWT token** from localStorage
- Backend thinks invited user IS the leader

## Technical Root Cause

### 1. Token Inheritance Issue

When invited user clicks invite link in Telegram:
```
Leader creates group → Stores JWT token in localStorage
  ↓
Invited user clicks invite link → Opens SAME mini app
  ↓
localStorage still has leader's token! ⚠️
  ↓
Checkout sends leader's token in Authorization header
  ↓
Backend creates order with leader's user_id
```

### 2. Failed is_invited Detection

```python
# Backend checks if user is invited
order_user_id = order.user_id  # Leader's ID (because of inherited token)
leader_id = group_order.leader_id  # Also Leader's ID

is_invited = (leader_id != order_user_id)  # False! They're the same!
```

Result: Backend thinks invited user is the leader → Wrong redirect

## Solution Implemented

### Option 1: Force Re-authentication (Implemented ✅)

When invited user arrives via invite link, force them to authenticate with **their own Telegram account**.

## Changes Made

### 1. AuthContext.tsx - Force Re-auth for Invite Codes

**File**: `frontend/src/contexts/AuthContext.tsx`

**Lines**: 329-435 (modified)

**What was added**:
- Detect when user arrives via invite code in Telegram mini app
- Check if current Telegram user ID matches the token owner's ID
- If **mismatch detected**:
  - Clear old token from localStorage
  - Force fresh Telegram authentication with NEW user's data
  - Log detailed information for debugging
- If **no token exists**: Authenticate the invited user
- If **IDs match**: User is already correctly authenticated

**Key Logic**:
```typescript
const currentTelegramId = String(currentTelegramUser.id);
const tokenTelegramId = user.telegram_id ? String(user.telegram_id) : null;

if (tokenTelegramId && tokenTelegramId !== currentTelegramId) {
  // MISMATCH! Clear old token and re-authenticate
  console.log('[AuthContext] 🔄 Telegram ID mismatch detected!');
  localStorage.removeItem('auth_token');
  setToken(null);
  setUser(null);
  
  // Force fresh authentication
  telegramLogin({
    init_data: tg.initData,
    init_data_unsafe: tg.initDataUnsafe
  });
}
```

**Console Logs Added**:
- `🔄 Telegram ID mismatch detected!`
- `Token owner Telegram ID: XXXXX`
- `Current Telegram user ID: YYYYY`
- `Clearing old token and forcing re-authentication...`
- `🔑 Attempting Telegram login for invited user: YYYYY`
- `✅ Invited user authenticated successfully with their own account`
- `⚠️ Telegram auth failed, redirecting to landingM`

### 2. Checkout Page - Additional Security Check

**File**: `frontend/src/app/checkout/page.tsx`

**Lines**: 935-970 (modified)

**What was added**:
- **Pre-payment verification** of Telegram ID
- Before processing payment, verify current Telegram user matches token owner
- If mismatch found:
  - Block payment
  - Clear invalid token
  - Redirect to home page with error message

**Key Logic**:
```typescript
if (window.Telegram?.WebApp) {
  const currentTgId = String(currentTelegramUser.id);
  const tokenTgId = String(user.telegram_id);
  
  if (currentTgId !== tokenTgId) {
    console.error('[Checkout] 🚨 SECURITY: Telegram ID mismatch detected!');
    alert('خطای احراز هویت. لطفا دوباره وارد شوید');
    localStorage.removeItem('auth_token');
    router.push('/');
    return;
  }
}
```

**Console Logs Added**:
- `🚨 SECURITY: Telegram ID mismatch detected!`
- `Current Telegram user ID: XXXXX`
- `Token owner Telegram ID: YYYYY`
- `✅ Telegram ID verification passed: XXXXX`

## Flow Diagram: Before vs After Fix

### Before Fix (❌ Broken)
```
1. Leader logs in (Telegram ID: 123456, user_id: 10)
   └─> JWT token stored in localStorage

2. Leader creates group order
   └─> Order created with user_id: 10

3. Invited user clicks invite link (Telegram ID: 789012)
   └─> Opens Telegram mini app
   └─> localStorage STILL has leader's token ⚠️
   └─> Goes to landingM → checkout

4. Invited user pays
   └─> Sends leader's token in Authorization header
   └─> Backend decodes token: user_id = 10 (LEADER!)
   └─> Creates order with user_id: 10
   └─> Backend checks: order.user_id (10) == leader_id (10) ❌
   └─> is_invited = False
   └─> Redirects to /invite (WRONG!)

5. Admin-full shows:
   └─> Invited user telegram_id: 123456 (LEADER'S ID!) ❌
```

### After Fix (✅ Working)
```
1. Leader logs in (Telegram ID: 123456, user_id: 10)
   └─> JWT token stored in localStorage

2. Leader creates group order
   └─> Order created with user_id: 10

3. Invited user clicks invite link (Telegram ID: 789012)
   └─> Opens Telegram mini app
   └─> AuthContext detects invite code: "GB789ABC"
   └─> Checks Telegram ID: 789012 vs token's ID: 123456
   └─> MISMATCH DETECTED! ✅
   └─> Clears localStorage.auth_token
   └─> Forces Telegram re-authentication with ID: 789012
   └─> Creates NEW user or logs in existing user
   └─> Gets NEW JWT token (user_id: 25)
   └─> Goes to landingM

4. Invited user pays
   └─> Sends THEIR OWN token in Authorization header
   └─> Backend decodes token: user_id = 25 (INVITED USER!)
   └─> Creates order with user_id: 25
   └─> Backend checks: order.user_id (25) != leader_id (10) ✅
   └─> is_invited = True
   └─> Redirects to /payment/success/invitee (CORRECT!)

5. Admin-full shows:
   └─> Invited user telegram_id: 789012 (CORRECT!) ✅
   └─> Invited user username: @invited_user (CORRECT!) ✅
```

## Testing Instructions

### 1. Test in Telegram Mini App (Critical Path)

**A. As Leader:**
1. Open Telegram mini app: `t.me/Bahamm_bot/bahamm`
2. Log in (will auto-login with Telegram)
3. Add products to cart
4. Checkout as group leader
5. Pay successfully
6. Note your Telegram ID and username

**B. As Invited User (Different Telegram Account):**
1. Share invite link from leader: `t.me/Bahamm_bot/bahamm?startapp=GB123ABC`
2. Click link from **different Telegram account**
3. **Watch Console Logs** (open dev tools in Telegram desktop)
4. Expected logs:
   ```
   [AuthContext] Detected invite code pattern: GB123ABC
   [AuthContext] 🔄 Telegram ID mismatch detected!
   [AuthContext]   Token owner Telegram ID: 123456
   [AuthContext]   Current Telegram user ID: 789012
   [AuthContext]   Clearing old token and forcing re-authentication...
   [AuthContext] 🔑 Attempting Telegram login for invited user: 789012
   [AuthContext] ✅ Invited user authenticated successfully with their own account
   ```
5. Proceed to checkout
6. **Watch Checkout Console Logs**:
   ```
   [Checkout] ✅ Telegram ID verification passed: 789012
   ```
7. Complete payment
8. **Expected Result**: Redirect to `/payment/success/invitee` ✅

### 2. Verify in Admin-Full

1. Open admin-full: `https://bahamm.ir/admin-full`
2. Find the group order
3. Check participants list
4. **Verify**:
   - Leader shows correct telegram_id and username ✅
   - Invited user shows **their own** telegram_id and username ✅
   - NOT showing leader's telegram_id for invited user ✅

### 3. Test Edge Cases

**A. Same User Multiple Times:**
- Leader clicks their own invite link
- Should work normally (no ID mismatch)

**B. Multiple Invited Users:**
- User A clicks invite → pays → success
- User B clicks invite → pays → success
- Each should have their own telegram_id

**C. Phone Auth User (No Telegram ID):**
- User with only phone auth has no telegram_id
- Should be forced to Telegram login when clicking invite

## Debugging

### Console Log Identifiers

Look for these emoji prefixes in browser console:

- `🔄` - Token mismatch detected, clearing old auth
- `🔑` - Attempting authentication
- `✅` - Success
- `⚠️` - Warning (non-critical)
- `🚨` - Security issue (payment blocked)

### Common Issues

**Issue 1: Still seeing leader's telegram_id for invited user**

**Cause**: Cache or not fully re-authenticated

**Solution**: 
```javascript
// In browser console
localStorage.clear();
location.reload();
```

**Issue 2: Invited user goes to `/invite` instead of `/payment/success/invitee`**

**Cause**: Backend still sees same user_id

**Solution**: Check backend logs for:
```
✅ Order after verification: id=X, user_id=Y, group_order_id=Z
```
Verify `user_id` is different from `leader_id`

**Issue 3: Auth loop (keeps asking to log in)**

**Cause**: Telegram auth failing

**Solution**: Check:
- Telegram bot token is correct in backend
- initData validation is passing
- User hasn't blocked the bot

## Backend Changes NOT Required

The fix is entirely **frontend-only**. No backend changes needed because:

1. Backend already correctly identifies invited users IF they have different `user_id`
2. Backend already redirects correctly based on `is_invited` flag
3. Backend already stores telegram_id correctly from JWT token

The issue was **frontend sending wrong token**, not backend processing it incorrectly.

## Monitoring

### Key Metrics to Watch

After deployment, monitor:

1. **Payment success rate** for invited users (should increase)
2. **Redirect errors** to `/invite` for invited users (should decrease to 0)
3. **Admin-full complaints** about wrong telegram_id (should stop)
4. **Console errors** about Telegram ID mismatch (should appear then resolve)

### Success Criteria

✅ Invited users redirect to `/payment/success/invitee` (100%)
✅ Admin-full shows correct telegram_id for each user (100%)
✅ No shared sessions between leader and invited users (100%)
✅ Clear console logs showing auth flow (100%)

## Rollback Plan

If issues occur, revert these files:
1. `frontend/src/contexts/AuthContext.tsx` (lines 329-435)
2. `frontend/src/app/checkout/page.tsx` (lines 935-970)

Rollback command:
```bash
git checkout HEAD~1 frontend/src/contexts/AuthContext.tsx frontend/src/app/checkout/page.tsx
```

## Related Documentation

- `TELEGRAM_AUTH_IMPLEMENTATION_SUMMARY.md` - Original Telegram auth setup
- `INVITED_USER_REDIRECT_FIX.md` - Previous redirect fix
- `PAYMENT_CALLBACK_FIXED.md` - Payment callback routing
- `SERVER_RESTART_GUIDE.md` - Deployment guide

## Future Improvements

1. **Add server-side validation**: Backend could also check Telegram initData on payment
2. **Session isolation**: Use Telegram's CloudStorage API for user-specific data
3. **Analytics**: Track authentication flow completion rates
4. **Error reporting**: Send mismatch events to monitoring service

## Author Notes

This fix addresses a critical user experience issue specific to Telegram mini apps where localStorage is shared across different user sessions. The solution ensures each user authenticates with their own Telegram account before making purchases, preventing identity confusion and ensuring correct data attribution.

The implementation is defensive with multiple layers:
1. **AuthContext** - Proactive: Clears wrong token on invite link arrival
2. **Checkout** - Reactive: Blocks payment if mismatch detected

Both layers include extensive logging for debugging and monitoring.

---

**Status**: ✅ Implemented and Ready for Testing
**Date**: December 3, 2024
**Impact**: Critical - Affects all Telegram mini app invited users

