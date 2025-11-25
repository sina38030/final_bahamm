# SMS Notification Flow Diagram

## High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     NEW MEMBER JOINS GROUP                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  1. Invited User Completes Payment                              │
│     - User clicks invite link from leader                        │
│     - Adds items to cart                                         │
│     - Proceeds to checkout                                       │
│     - Completes payment via ZarinPal                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. Payment Verification (payment_service.py)                   │
│     verify_and_complete_payment()                               │
│     - Verifies payment with ZarinPal                            │
│     - Updates order status to "در انتظار"                      │
│     - Detects PENDING_INVITE marker in shipping_address         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. Link Order to Group                                         │
│     - Resolves invite token to group_order_id                   │
│     - Sets order.group_order_id = pending_group_id              │
│     - Sets order.order_type = OrderType.GROUP                   │
│     - Clears PENDING_INVITE marker                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. Trigger Notification (NEW!)                                 │
│     await _notify_leader_new_member(group_id, order)            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  5. Validate Leader & Get Info                                  │
│     - Fetch GroupOrder and leader User from DB                  │
│     - Check leader.phone_number is verified                     │
│     - Skip if leader.telegram_id exists (Telegram user)         │
│     - Get new_member.phone_number                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  6. Calculate Updated Price                                     │
│     _calculate_leader_current_price(group_order)                │
│     - Count paid non-leader members                             │
│     - Determine if regular or secondary group                   │
│     - Get basket items from snapshot or DB                      │
│     - Calculate price based on member count                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  7. Format & Send SMS                                           │
│     - Format price with Persian separators: 55,000 → 55٬000     │
│     - Build message: "دوستت با شماره X به عضو گروهت شد! ..."   │
│     - Call notification_service.send_notification()             │
│     - SMS sent via sms_service (Melipayamak)                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  8. Leader Receives SMS                                         │
│     📱 دوستت با شماره 09343438812 به عضو گروهت شد!             │
│        قیمت سبد به 55٬000 تومان کاهش یافت!                     │
└─────────────────────────────────────────────────────────────────┘
```

## Price Calculation Details

### Regular Groups

```
Member Count │ Leader's Price
─────────────┼──────────────────────
     0       │ 100% (solo_price)
     1       │ 50%  (friend_1_price)
     2       │ 33%  (friend_2_price)
    3+       │ FREE (0 تومان)
```

**Example:**
```
Initial basket: 100,000 تومان

Member 1 joins → SMS: "قیمت سبد به 50٬000 تومان کاهش یافت!"
Member 2 joins → SMS: "قیمت سبد به 33٬333 تومان کاهش یافت!"
Member 3 joins → SMS: "قیمت سبد به 0 تومان کاهش یافت!"
```

### Secondary Groups (Referral System)

```
Member Count │ Leader's Price │ Discount
─────────────┼────────────────┼──────────
     0       │ 100%           │ 0%
     1       │ 75%            │ 25%
     2       │ 50%            │ 50%
     3       │ 25%            │ 75%
    4+       │ FREE           │ 100%
```

**Calculation Formula:**
```
discount_per_member = total_basket_value ÷ 4
leader_price = total_basket_value - (member_count × discount_per_member)
```

**Example:**
```
Initial basket: 120,000 تومان

Member 1 joins → Leader pays: 90,000 تومان   (75%)
Member 2 joins → Leader pays: 60,000 تومان   (50%)
Member 3 joins → Leader pays: 30,000 تومان   (25%)
Member 4 joins → Leader pays: 0 تومان        (FREE!)
```

## Decision Tree

```
┌─────────────────────────┐
│  New Member Paid?       │
└───────────┬─────────────┘
            ↓ YES
┌─────────────────────────┐
│  Is Leader Website User?│
│  (no telegram_id)       │
└───────────┬─────────────┘
            ↓ YES
┌─────────────────────────┐
│  Leader Phone Verified? │
└───────────┬─────────────┘
            ↓ YES
┌─────────────────────────┐
│  Calculate Price        │
└───────────┬─────────────┘
            ↓
┌─────────────────────────┐
│  Send SMS Notification  │
└─────────────────────────┘
```

## Database Queries

### Query 1: Get Group & Leader
```python
group_order = db.query(GroupOrder).filter(GroupOrder.id == group_id).first()
leader = db.query(User).filter(User.id == group_order.leader_id).first()
```

### Query 2: Count Paid Members
```python
paid_count = db.query(Order).filter(
    Order.group_order_id == group_id,
    Order.user_id != leader_id,
    Order.is_settlement_payment == False,
    or_(
        Order.payment_ref_id.isnot(None),
        Order.paid_at.isnot(None),
    ),
).count()
```

### Query 3: Get Basket Items (if not in snapshot)
```python
leader_order = db.query(Order).filter(
    Order.group_order_id == group_id,
    Order.user_id == leader_id,
    Order.is_settlement_payment == False,
).first()

order_items = db.query(OrderItem).filter(
    OrderItem.order_id == leader_order.id
).all()
```

## Error Handling

```
┌──────────────────────┐
│  Notification Error? │
└─────────┬────────────┘
          │
          ├─→ Log Error (ERROR level)
          │
          ├─→ Don't Block Payment ✅
          │
          └─→ Continue Processing
```

**Philosophy:** Notifications are nice-to-have, not critical. Payment success is the priority.

## Code Location Reference

```
backend/app/services/payment_service.py
│
├─ Line 366: Notification trigger
│   └─→ await _notify_leader_new_member(pending_group_id, order)
│
├─ Lines 889-945: _notify_leader_new_member()
│   ├─ Validate leader & get info
│   ├─ Calculate price
│   ├─ Format message
│   └─ Send SMS
│
└─ Lines 947-1089: _calculate_leader_current_price()
    ├─ Count paid members
    ├─ Get basket items
    ├─ Regular group pricing
    └─ Secondary group pricing
```

## Integration Points

```
payment_service.py
       │
       ├─→ notification_service.send_notification()
       │            │
       │            └─→ sms_service.send_sms()
       │                        │
       │                        └─→ Melipayamak API
       │
       └─→ Database Models
                   │
                   ├─→ GroupOrder
                   ├─→ Order
                   ├─→ User
                   ├─→ OrderItem
                   └─→ Product
```

## Message Format

### Persian Numbers & Separators
```python
# Input
price = 55000

# Processing
formatted = f"{int(price):,}"           # "55,000"
formatted = formatted.replace(",", "٬")  # "55٬000" (Persian separator)

# Output SMS
"دوستت با شماره 09343438812 به عضو گروهت شد! قیمت سبد به 55٬000 تومان کاهش یافت!"
```

### Components
1. **Greeting:** "دوستت" (Your friend)
2. **Phone:** "با شماره {phone}"
3. **Action:** "به عضو گروهت شد!" (joined your group!)
4. **Price Update:** "قیمت سبد به {price} تومان کاهش یافت!" (Basket price reduced to {price} Toman!)

## Testing Scenarios

### Scenario 1: Happy Path (Regular Group)
```
Given: Leader creates group with 100k basket
When: First friend joins and pays
Then: Leader receives SMS: "...به 50٬000 تومان کاهش یافت!"
```

### Scenario 2: Happy Path (Secondary Group)
```
Given: Leader creates secondary group with 80k basket
When: First friend joins and pays
Then: Leader receives SMS: "...به 60٬000 تومان کاهش یافت!"
```

### Scenario 3: Multiple Members
```
Given: Leader has 2 paid members (price = 33,333)
When: Third friend joins and pays
Then: Leader receives SMS: "...به 0 تومان کاهش یافت!"
```

### Scenario 4: Telegram Leader (Skip SMS)
```
Given: Leader has telegram_id set
When: Friend joins and pays
Then: No SMS sent (logged as INFO)
```

### Scenario 5: Unverified Phone
```
Given: Leader has unverified phone
When: Friend joins and pays
Then: No SMS sent (logged as INFO)
```

### Scenario 6: Unknown Member Phone
```
Given: New member has no phone number
When: Member joins and pays
Then: SMS sent with "نامشخص" as phone
```

---

## Summary

This notification system enhances the group buying experience by:
- ✅ Keeping leaders informed in real-time
- ✅ Showing tangible benefit (price reduction)
- ✅ Building social proof (friend's phone number)
- ✅ Working seamlessly with existing infrastructure
- ✅ Gracefully handling edge cases



