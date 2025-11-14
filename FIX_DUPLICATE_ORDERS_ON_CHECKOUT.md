# Fix: Duplicate Orders Appearing in Groups-Orders Page

## Problem Description

When a user clicks the "Pay" button on the checkout page, a new order was immediately appearing in the "Orders" tab on the groups-orders page, even before the payment was completed. This happened for:
- Solo purchases (buying alone)
- Invited users joining a group

The order should only appear **after** successful payment verification, not when the payment is initiated.

## Root Cause

The backend endpoint `/api/group-orders/my-groups-and-orders` was fetching ALL orders for the user with only one filter: `is_settlement_payment == False`. This meant it was returning orders in ALL statuses, including:
- ✅ "در انتظار" (Pending - paid, waiting for fulfillment) - **should be shown**
- ✅ "تکمیل شده" (Completed) - **should be shown**
- ❌ "در انتظار پرداخت" (Pending Payment - not yet paid) - **should NOT be shown**

When a user clicks "Pay", an order is created with status "در انتظار پرداخت", which was being immediately returned by the API and displayed in the frontend.

## Solution

Modified the backend endpoint to only return orders that have been successfully paid. The fix uses two filters:

1. **Explicit Exclusion**: `Order.status != "در انتظار پرداخت"` - Directly excludes orders with "Pending Payment" status
2. **Payment Evidence**: Orders must have at least one of:
   - `payment_ref_id` is not NULL (ZarinPal reference ID after successful payment)
   - `paid_at` is not NULL (timestamp of payment)

This ensures that only orders that have completed the payment verification step are shown to users.

## Changes Made

### File: `backend/app/routes/group_order_routes.py`

#### Change 1: Main order query (lines 659-674)
**Before:**
```python
user_orders = db.query(Order).options(
    joinedload(Order.group_order),
    joinedload(Order.items).joinedload(OrderItem.product)
).filter(
    Order.user_id == current_user.id,
    Order.is_settlement_payment == False
).all()
```

**After:**
```python
user_orders = db.query(Order).options(
    joinedload(Order.group_order),
    joinedload(Order.items).joinedload(OrderItem.product)
).filter(
    Order.user_id == current_user.id,
    Order.is_settlement_payment == False,
    # Explicitly exclude unpaid orders
    Order.status != "در انتظار پرداخت",
    # Only show orders that have payment evidence (paid orders)
    or_(
        Order.payment_ref_id.isnot(None),
        Order.paid_at.isnot(None)
    )
).all()
```

#### Change 2: Leader order query (lines 813-823)
**Before:**
```python
leader_order = db.query(Order).filter(
    Order.group_order_id == group.id,
    Order.user_id == group.leader_id
).first()
```

**After:**
```python
leader_order = db.query(Order).filter(
    Order.group_order_id == group.id,
    Order.user_id == group.leader_id,
    # Explicitly exclude unpaid orders
    Order.status != "در انتظار پرداخت",
    # Only show orders that have payment evidence (paid orders)
    or_(
        Order.payment_ref_id.isnot(None),
        Order.paid_at.isnot(None)
    )
).first()
```

## Expected Behavior After Fix

### Before Payment
1. User adds items to cart
2. User clicks "Proceed to Checkout"
3. User fills in address and selects payment method
4. User clicks "Pay" button
5. ✅ **Order is NOT shown in Orders tab yet** (order exists but with status "در انتظار پرداخت")
6. User is redirected to payment gateway (ZarinPal)

### After Successful Payment
7. User completes payment on ZarinPal
8. ZarinPal redirects back to app
9. Backend verifies payment and updates order:
   - Sets `payment_ref_id` to ZarinPal reference ID
   - Sets `paid_at` to current timestamp
   - Updates status to "در انتظار" (Pending fulfillment)
10. ✅ **Now the order appears in Orders tab**

### After Failed Payment
- User cancels payment or payment fails
- Order remains with status "در انتظار پرداخت"
- ✅ **Order does NOT appear in Orders tab** (correctly hidden)

## Admin Panel Behavior

The admin panel already has proper filtering (see `backend/app/routes/admin_routes.py` lines 1356-1368) that excludes unpaid orders. This fix ensures consistency between the user-facing orders page and admin panel.

## Testing Checklist

- [x] Syntax validation passed
- [ ] Manual test: Solo purchase flow
  - [ ] Click "Pay" and verify order doesn't appear in Orders tab
  - [ ] Complete payment and verify order appears after verification
  - [ ] Cancel payment and verify order doesn't appear
- [ ] Manual test: Group purchase flow (leader)
  - [ ] Click "Pay" and verify order doesn't appear in Orders tab
  - [ ] Complete payment and verify order appears in Groups tab
- [ ] Manual test: Group purchase flow (invited user)
  - [ ] Click "Pay" and verify order doesn't appear in Orders tab
  - [ ] Complete payment and verify order appears after verification
- [ ] Manual test: Free orders (0 price)
  - [ ] Verify free orders still appear correctly (they have `paid_at` set immediately)

## Notes

- Free orders (amount = 0) are handled correctly because `PaymentService.create_payment_order()` sets `paid_at` immediately for free orders (line 133 in `backend/app/services/payment_service.py`)
- Settlement payment orders are already excluded by the existing filter `is_settlement_payment == False`
- The fix is defensive and uses `or_()` to check multiple payment evidence fields, ensuring compatibility even if different payment methods set different fields

