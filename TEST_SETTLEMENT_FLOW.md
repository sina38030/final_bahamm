# Settlement Payment Flow Test Guide

## Test Steps:

### 1. Create a Group That Needs Settlement
- Go to a product page
- Choose "خرید گروهی" (Group Buy)
- Select 4-person tier (3 friends)
- Complete payment as leader
- Note the group ID

### 2. Have Only 1 Friend Join
- Share invite link
- Have another user join
- This creates a settlement requirement (leader paid for 3 friends but only 1 joined)

### 3. Check Settlement Status
- Go to `/groups-orders` page
- Click on Groups tab
- Find your group
- You should see "باقی‌مانده پرداخت" (Payment Remainder) with the amount

### 4. Pay Settlement
- Click "پرداخت باقی‌مانده" button
- Complete the ZarinPal payment
- You will be redirected to `/payment/success/settlement` page

### 5. Verify Status Update
- On the success page, click "مشاهده گروه‌ها" button
- You should be redirected to `/groups-orders?tab=groups`
- The group status should now show **"تسویه شد"** (Settled) in green
- The payment button should be hidden

### Expected Behavior:
✅ Custom event `settlement-completed` is dispatched when payment succeeds
✅ Groups page listens for this event and refreshes data
✅ Backend `settlement_paid_at` is set when payment is verified
✅ Frontend fetches updated group metadata with `settlement_paid: true`
✅ Status changes from "باقی‌مانده پرداخت" to "تسویه شد"
✅ Green badge is shown
✅ Payment button disappears

### Debug Console Logs to Check:
```
[SettlementSuccess] Marked settlement as completed for group {id}
[GroupsOrders] Settlement completed event received, refreshing...
```

### Common Issues:
1. **Status reverts after refresh**: Custom event not working - check browser console for errors
2. **Status doesn't change at all**: Backend not setting `settlement_paid_at` - check backend logs
3. **Payment button still shows**: Frontend not checking `settlement_paid` flag - verify API response

## Files Modified:
- `frontend/src/app/payment/success/settlement/page.tsx` - Dispatches custom event
- `frontend/src/app/groups-orders/page.tsx` - Listens for event and refetches data



