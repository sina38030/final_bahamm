# Order Consolidation Implementation

## Overview

This implementation allows group buy orders to be consolidated in the admin panel when both the leader and  users enable the consolidation toggle during checkout.

## How It Works

### Frontend (Toggle Implementation)
1. **Leader Experience**: The leader can enable the consolidation toggle during checkout
2. ** User Experience**:  users only see the toggle if the leader enabled it
3. **Toggle State**: The `greenToggle` state is passed as `allow_consolidation` to the backend

### Backend Changes

#### 1. Payment Service (`backend/app/services/payment_service.py`)
- Added `ship_to_leader_address` parameter to `create_payment_order` method
- Sets `ship_to_leader_address = True` when  users enable consolidation

#### 2. Payment Routes (`backend/app/routes/payment.py`)
- Modified payment routes to determine `ship_to_leader_address` based on:
  - User has `invite_code` (is  user)
  - User enables `allow_consolidation` toggle
- Logic: `ship_to_leader = invite_code && allow_consolidation`

#### 3. Admin Routes (`backend/app/routes/admin_routes.py`)
- **Orders List**: Consolidates orders when:
  - Group has `allow_consolidation = True` (leader enabled toggle)
  - Members have `ship_to_leader_address = True` ( users enabled toggle)
- **Order Details**: Returns consolidated view with separate participant sections

### Admin Panel Changes

#### 1. Order List Display
- Added visual indicators for consolidated orders
- Shows "گروهی (X نفر)" badge for consolidated orders
- Displays "سفارش گروهی ترکیب شده" subtitle

#### 2. Order Details Modal
- **Consolidated View**: Shows each participant's products separately
- **Participant Sections**: Each user's items are listed in their own section
- **Leader Identification**: First participant is marked as "(لیدر)"
- **Individual Totals**: Shows each participant's order total
- **Group Total**: Shows combined total at the bottom

## Database Schema

The implementation uses existing database fields:
- `group_orders.allow_consolidation`: Set when leader enables toggle
- `orders.ship_to_leader_address`: Set when  users enable toggle

## Consolidation Logic

Orders are consolidated when:
1. **Leader enables consolidation**: `group_orders.allow_consolidation = True`
2. ** users opt-in**: `orders.ship_to_leader_address = True`
3. **Orders are finalized**: All orders have `state = GROUP_SUCCESS`

## Files Modified

### Backend
- `backend/app/services/payment_service.py`
- `backend/app/routes/payment.py`
- `backend/app/routes/admin_routes.py` (already had consolidation logic)

### Frontend
- `frontend/src/app/admin-full/page.tsx`
- `frontend/src/app/admin/page.tsx`

## Testing

A test script `test_order_consolidation.py` is provided to verify:
1. Leader creates group order with consolidation enabled
2.  user joins with consolidation enabled
3. Admin panel shows consolidated order with separate user products

## Usage Example

### Admin Panel Display

**Before Consolidation:**
- Order #123 - Leader User (100,000 تومان)
- Order #124 -  User (50,000 تومان)

**After Consolidation:**
- Order #123 گروهی (2 نفر) - Leader User (150,000 تومان)
  - سفارش گروهی ترکیب شده

**Order Details:**
```
سفارش عضو (لیدر) — Leader User
├── Product A × 2 = 100,000 تومان

سفارش عضو —  User  
├── Product B × 1 = 50,000 تومان

جمع کل گروه: 150,000 تومان
```

## Benefits

1. **Simplified Order Management**: Admins see one consolidated order instead of multiple separate orders
2. **Clear Product Attribution**: Each user's products are clearly separated and identified
3. **Flexible Participation**: Users can choose whether to consolidate their orders
4. **Backward Compatibility**: Non-consolidated orders still display normally

## Future Enhancements

1. **Shipping Address Consolidation**: Use leader's address for all consolidated orders
2. **Bulk Status Updates**: Update status for all orders in a consolidated group
3. **Split Fulfillment**: Option to fulfill individual user portions separately
