# Invitee Redirect Fix - Complete Summary

## Problem
Invitees were being redirected to `/invite` page instead of `/payment/success/invitee` page after successful payment, and the timer wasn't working.

## Root Causes Found

### 1. NULL Comparison Bug
**Issue:** `group_order.leader_id == order.user_id` comparison returned `True` when both were `None`
- Result: Invitees with `user_id = None` were detected as leaders
- **Fixed:** Added NULL-safe comparisons everywhere

### 2. Auto-Creation of Secondary Groups  
**Issue:** Backend automatically created secondary groups for invitees when they accessed `/api/payment/group-invite/{code}`
- Result: Invitees became "leaders" of their own secondary group immediately
- **Fixed:** Disabled auto-creation. Now secondary groups are created ONLY when invitee clicks "مبلغ پرداختیت رو پس بگیر!" button

### 3. Frontend Override
**Issue:** `AuthContext.tsx` was overriding backend redirect decisions
- **Fixed:** Added check to skip redirect if already on payment-related pages

## All Applied Fixes

### Backend Files

#### 1. `backend/app/routes/payment.py`
**Lines 738-744:** NULL-safe leader comparison
```python
elif (group_order.leader_id is not None and 
      order.user_id is not None and 
      group_order.leader_id == order.user_id):
```

**Lines 680-720:** Extract `group_order_id` from `PENDING_GROUP` in shipping_address

**Lines 371-372:** Add `expires_at` when creating GroupOrder
```python
leader_paid_at=datetime.now(TEHRAN_TZ),
expires_at=datetime.now(TEHRAN_TZ) + timedelta(hours=24),
```

**Lines 1076-1082:** NULL-safe invitee detection

**Lines 1247-1251:** Disabled auto-creation of secondary groups
```python
else:
    # ✅ DON'T auto-create secondary group
    # Invitee will manually create it when they click "مبلغ پرداختیت رو پس بگیر!" button
    # For now, just keep showing the primary group data
    logger.info(f"⏳ Invitee order {order.id} has no secondary group yet - will be created on button click")
    pass
```

#### 2. `backend/app/routes/group_order_routes.py`
**Lines 658-662:** NULL-safe `is_leader_order` computation
```python
"is_leader_order": (
    (order.group_order.leader_id is not None and 
     order.user_id is not None and 
     order.group_order.leader_id == order.user_id)
    if order.group_order else False
),
```

**Lines 147-264:** NEW `/create-secondary` endpoint
```python
@router.post("/create-secondary")
async def create_secondary_group(
    source_order_id: int = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Creates a secondary group for an invitee
    # Verifies ownership and payment status
    # Generates unique invite_token
    # Sets expires_at to 24h from now
    # Returns group_order_id, invite_token, expires_at
```

#### 3. `backend/app/routes/admin_routes.py`
**Lines 1710-1713:** NULL-safe leader detection
```python
leader_id = getattr(group, 'leader_id', None)
user_id = getattr(order, 'user_id', None)
is_leader_order = (group and leader_id is not None and user_id is not None and leader_id == user_id)
```

**Lines 1888-1890:** NULL-safe comparison in status propagation

### Frontend Files

#### 4. `frontend/src/contexts/AuthContext.tsx`
**Lines 301-308:** Skip redirect if already on payment pages
```typescript
const isOnPaymentPage = pathname.includes('/invite') || 
                        pathname.includes('/payment/success') || 
                        pathname.includes('/payment/callback');

if (isOnPaymentPage) {
  console.log('[AuthContext] Already on payment page, skipping redirect:', pathname);
  return;
}
```

**Lines 318-323:** Delegate to backend callback instead of deciding
```typescript
window.location.href = `/api/payment/callback?Authority=${encodeURIComponent(startParam)}&Status=OK`;
```

#### 5. `frontend/src/app/checkout/page.tsx`
**Line 1109:** Free order - delegate to backend
```typescript
window.location.href = `/api/payment/callback?Authority=${data.authority}&Status=OK`;
```

**Line 1172:** Wallet payment - delegate to backend
```typescript
window.location.href = `/api/payment/callback?Authority=${data.authority}&Status=OK`;
```

#### 6. `frontend/src/lib/api.ts`
**Lines 58-65:** Updated `createSecondaryGroup` to call new backend endpoint
```typescript
createSecondaryGroup: (orderId: string | number) => 
  api.post<{
    success: boolean;
    group_order_id: number;
    invite_token: string;
    expires_at: string | null;
    already_exists: boolean;
  }>("/group-orders/create-secondary", { source_order_id: Number(orderId) }),
```

#### 7. `frontend/src/app/payment/success/invitee/page.tsx`
**Lines 479-503:** Button now creates secondary group before redirecting
```typescript
<button
  onClick={async () => {
    // Create secondary group (invitee becomes leader)
    const result = await groupApi.createSecondaryGroup(data.order.id);
    if (result.success && result.invite_token) {
      // Redirect to invite page with new group's invite code
      window.location.href = `/invite?authority=${encodeURIComponent(inviteAuthority)}`;
    }
  }}
>
  مبلغ پرداختیت رو پس بگیر!
</button>
```

## Expected Flow After Fixes

### Leader Flow
1. Leader pays → Backend creates `GroupOrder` with `expires_at` ✅
2. Backend redirects to `/invite?authority={leader_authority}` ✅
3. `/invite` page constructs code `GB{order.id}{authority[:8]}` ✅
4. Fetches `/api/groups/{code}` → finds `GroupOrder` → **timer works!** ✅

### Invitee Flow
1. Invitee pays → Backend extracts `group_order_id` from `PENDING_GROUP` ✅
2. NULL-safe comparison: `leader_id != user_id` → detected as invitee ✅
3. Backend redirects to `/payment/success/invitee` ✅
4. Invitee sees success page with "مبلغ پرداختیت رو پس بگیر!" button ✅
5. Clicks "مبلغ پرداختیت رو پس بگیر!" button
6. Frontend calls `/api/group-orders/create-secondary` with `source_order_id` ✅
7. Backend creates secondary group with invitee as leader ✅
8. Frontend redirects to `/invite?authority={invitee_authority}` ✅
9. Secondary group has proper `expires_at` → **timer works!** ✅

## Files Changed (Must Deploy All)
1. ✅ `backend/app/routes/payment.py` - NULL-safe comparisons, disabled auto-creation, extract group_order_id
2. ✅ `backend/app/routes/group_order_routes.py` - NULL-safe is_leader_order, NEW `/create-secondary` endpoint
3. ✅ `backend/app/routes/admin_routes.py` - NULL-safe leader detection
4. ✅ `frontend/src/contexts/AuthContext.tsx` - Skip redirect on payment pages
5. ✅ `frontend/src/app/checkout/page.tsx` - Delegate to backend callback
6. ✅ `frontend/src/lib/api.ts` - Updated `createSecondaryGroup` API function (simplified signature)
7. ✅ `frontend/src/app/payment/success/invitee/page.tsx` - Button creates secondary group before redirect
8. ✅ `frontend/src/app/invite/page.tsx` - Updated to use new `createSecondaryGroup` API
9. ✅ `frontend/src/app/payment/success/invitee/_components/InviteCta.tsx` - Updated to use new API

## Deployment Commands

```bash
# 1. Commit changes
git add backend/app/routes/payment.py backend/app/routes/group_order_routes.py backend/app/routes/admin_routes.py frontend/src/contexts/AuthContext.tsx frontend/src/app/checkout/page.tsx frontend/src/lib/api.ts frontend/src/app/payment/success/invitee/page.tsx frontend/src/app/invite/page.tsx frontend/src/app/payment/success/invitee/_components/InviteCta.tsx INVITEE_REDIRECT_FIX.md
git commit -m "Fix: Invitee redirect with NULL-safe comparisons + manual secondary group creation"
git push origin main

# 2. Deploy to production (both backend and frontend)
ssh ubuntu@185.231.181.208 -i "C:\Users\User\.ssh\id_rsa" "cd /srv/app && git pull && sudo systemctl restart bahamm-backend && cd frontend && rm -rf .next && npm run build && pm2 restart frontend"
```

## Testing Checklist
- [ ] Leader pays → goes to `/invite` with working timer
- [ ] Invitee pays → goes to `/payment/success/invitee`
- [ ] Invitee clicks button → goes to `/invite` with working timer
- [ ] Secondary group is created on button click, not automatically
- [ ] NULL checks prevent false leader detection

## Notes
- ✅ Disabled secondary group auto-creation (was causing confusion)
- ✅ Secondary groups are now created ONLY when invitee clicks "مبلغ پرداختیت رو پس بگیر!" button
- ✅ The key fix is the NULL-safe comparison preventing invitees from being detected as leaders
- ✅ Timer works when group has proper `expires_at` field (set at group creation time)
- ✅ New endpoint `/group-orders/create-secondary` handles secondary group creation on-demand

