# Test Scenarios for SMS Notification Feature

## Prerequisites

### Test Accounts Setup

**Leader Account (Website User):**
```
Phone: 09123456789
Password: testpass123
telegram_id: NULL
is_phone_verified: TRUE
```

**Member Account (Website User):**
```
Phone: 09343438812
Password: testpass456
telegram_id: NULL
is_phone_verified: TRUE
```

## Scenario 1: First Member Joins Regular Group

### Setup
1. Login as Leader (09123456789)
2. Add product to cart (price: 100,000 تومان)
3. Create group order (mode: group)
4. Complete payment
5. Copy invite link

### Test Steps
1. Logout and login as Member (09343438812)
2. Visit invite link
3. Verify product shows in cart
4. Proceed to checkout
5. Complete payment via ZarinPal

### Expected Result
**Leader receives SMS:**
```
دوستت با شماره 09343438812 به عضو گروهت شد! قیمت سبد به 50٬000 تومان کاهش یافت!
```

### Verification
- Check Leader's phone for SMS
- Check backend logs: `grep "Sent new member notification" backend/logs/*.log`
- Verify price calculation: 100,000 → 50,000 (50%)

---

## Scenario 2: Second Member Joins Regular Group

### Setup
- Use same group from Scenario 1
- Already has 1 paid member
- Current leader price: 50,000 تومان

### Test Steps
1. Create new test account (09121234567)
2. Login as new member
3. Visit same invite link
4. Complete purchase

### Expected Result
**Leader receives SMS:**
```
دوستت با شماره 09121234567 به عضو گروهت شد! قیمت سبد به 33٬333 تومان کاهش یافت!
```

### Verification
- Price: 50,000 → 33,333 (33%)
- Check leader received SMS
- Verify member count in database

---

## Scenario 3: Third Member Joins (Group Becomes Free)

### Setup
- Use same group from Scenario 2
- Already has 2 paid members
- Current leader price: 33,333 تومان

### Test Steps
1. Create new test account (09129876543)
2. Login as new member
3. Visit same invite link
4. Complete purchase

### Expected Result
**Leader receives SMS:**
```
دوستت با شماره 09129876543 به عضو گروهت شد! قیمت سبد به 0 تومان کاهش یافت!
```

### Verification
- Price: 33,333 → 0 (FREE!)
- Leader should be excited 🎉
- Group is now complete

---

## Scenario 4: Secondary Group (First Member)

### Setup
1. Member from Scenario 1 wants to create their own group
2. Member's order amount: 80,000 تومان
3. Member clicks "مبلغ پرداختیت رو پس بگیر!" button
4. Creates secondary group and gets invite link

### Test Steps
1. Create new test account (09131234567)
2. Login as new member
3. Visit member's invite link
4. Complete purchase

### Expected Result
**Original Member (now acting as leader) receives SMS:**
```
دوستت با شماره 09131234567 به عضو گروهت شد! قیمت سبد به 60٬000 تومان کاهش یافت!
```

### Verification
- Price: 80,000 → 60,000 (75% of original)
- Secondary group discount applied correctly
- Check `basket_snapshot` has `kind: secondary`

---

## Scenario 5: Telegram User as Leader (Skip SMS)

### Setup
**Telegram Leader Account:**
```
Phone: 09111111111
telegram_id: 123456789
is_phone_verified: TRUE
```

### Test Steps
1. Login via Telegram mini app
2. Create group order
3. Complete payment
4. Have website user join as member

### Expected Result
**NO SMS sent to leader**

### Verification
- Check logs: `"Leader X is a Telegram user, skipping SMS notification"`
- Confirm no SMS received
- This is expected behavior (Telegram notifications later)

---

## Scenario 6: Leader with Unverified Phone

### Setup
**Leader Account:**
```
Phone: 09122222222
telegram_id: NULL
is_phone_verified: FALSE
```

### Test Steps
1. Create group as this leader
2. Have member join and pay

### Expected Result
**NO SMS sent**

### Verification
- Check logs: `"Leader X has no verified phone number, skipping SMS notification"`
- Security measure working correctly

---

## Scenario 7: Member with No Phone Number

### Setup
- Leader has valid phone
- New member has no phone number in profile

### Test Steps
1. Member joins and completes payment
2. Member's phone_number field is NULL

### Expected Result
**Leader receives SMS with "نامشخص":**
```
دوستت با شماره نامشخص به عضو گروهت شد! قیمت سبد به 50٬000 تومان کاهش یافت!
```

### Verification
- SMS still sent successfully
- Phone shows as "نامشخص" (unknown)
- Graceful handling of missing data

---

## Scenario 8: Multiple Rapid Joins

### Setup
- Create group with leader
- Have 3 members join within 1 minute

### Test Steps
1. Member 1 completes payment at 10:00:00
2. Member 2 completes payment at 10:00:20
3. Member 3 completes payment at 10:00:40

### Expected Result
**Leader receives 3 separate SMS messages:**
```
10:00:05 - دوستت با شماره 09123456789 به عضو گروهت شد! قیمت سبد به 50٬000 تومان کاهش یافت!
10:00:25 - دوستت با شماره 09111111111 به عضو گروهت شد! قیمت سبد به 33٬333 تومان کاهش یافت!
10:00:45 - دوستت با شماره 09222222222 به عضو گروهت شد! قیمت سبد به 0 تومان کاهش یافت!
```

### Verification
- All 3 SMS sent successfully
- Prices calculated correctly for each state
- No race conditions
- SMS order matches payment order

---

## Scenario 9: Payment Failure (No SMS)

### Setup
- Member starts checkout
- Payment fails at ZarinPal

### Test Steps
1. Member clicks pay
2. Cancel payment at ZarinPal page
3. Return to site

### Expected Result
**NO SMS sent to leader**

### Verification
- Order not linked to group
- Payment not verified
- No notification triggered
- Correct behavior (only notify on successful payment)

---

## Scenario 10: Network Error During SMS (Payment Still Succeeds)

### Setup
- Simulate SMS service failure
- Set `MELIPAYAMAK_API_KEY` to invalid value temporarily

### Test Steps
1. Member joins and completes payment
2. SMS sending fails

### Expected Result
- **Payment verified successfully** ✅
- **Order linked to group** ✅
- **SMS sending fails** ❌ (but logged, not critical)
- **Payment not rolled back** ✅

### Verification
```sql
SELECT * FROM orders WHERE id = [order_id];
-- Should show:
-- - paid_at IS NOT NULL
-- - payment_ref_id IS NOT NULL
-- - group_order_id IS NOT NULL
-- - order_type = 'GROUP'
```

**Logs should show:**
```
✅ SUCCESSFULLY LINKED invited order X to group Y
❌ Error sending notification to leader for group Y: [SMS error]
✅ Payment verification completed successfully
```

---

## Performance Test

### Scenario 11: Large Group (10 Members)

### Setup
- Create group with 10 products (basket: 1,000,000 تومان)
- Have 10 members join sequentially

### Test Steps
1. Member 1 joins → SMS sent
2. Member 2 joins → SMS sent
3. ... continue for all 10 members
4. Measure response time for each payment

### Expected Result
- Each payment completes in < 5 seconds
- SMS sending doesn't block payment
- All SMS received in order
- Database queries remain efficient

### Verification
```bash
# Check payment verification times in logs
grep "Payment verification completed" backend/logs/*.log | awk '{print $2}'
```

---

## Error Recovery Test

### Scenario 12: Database Temporarily Down

### Setup
- Simulate database connection issue during price calculation

### Test Steps
1. Member completes payment
2. Database query fails during `_calculate_leader_current_price()`

### Expected Result
- Error logged: `"Error calculating leader price for group X"`
- Price defaults to 0.0
- SMS still attempts to send (with price = 0)
- **Payment still succeeds** ✅

### Verification
- Payment not affected
- Error contained within notification logic
- Graceful degradation

---

## SQL Queries for Verification

### Check SMS Notification Sent
```sql
-- Check if order was successfully linked to group
SELECT 
    o.id,
    o.user_id,
    o.group_order_id,
    o.order_type,
    o.paid_at,
    o.payment_ref_id,
    g.leader_id,
    u.phone_number as leader_phone
FROM orders o
JOIN group_orders g ON o.group_order_id = g.id
JOIN users u ON g.leader_id = u.id
WHERE o.id = [order_id];
```

### Count Paid Members
```sql
SELECT COUNT(*) as paid_members
FROM orders
WHERE group_order_id = [group_id]
  AND user_id != [leader_id]
  AND is_settlement_payment = 0
  AND (payment_ref_id IS NOT NULL OR paid_at IS NOT NULL);
```

### Check Group Type
```sql
SELECT 
    id,
    leader_id,
    basket_snapshot,
    JSON_EXTRACT(basket_snapshot, '$.kind') as group_type
FROM group_orders
WHERE id = [group_id];
```

---

## Log Monitoring

### Successful SMS
```bash
tail -f backend/logs/payment.log | grep "Sent new member notification"
```

### SMS Skipped (Telegram User)
```bash
tail -f backend/logs/payment.log | grep "Telegram user, skipping SMS"
```

### SMS Errors
```bash
tail -f backend/logs/payment.log | grep "Error sending notification"
```

### Price Calculation
```bash
tail -f backend/logs/payment.log | grep "calculate_leader_current_price"
```

---

## Acceptance Criteria

✅ **Must Pass:**
1. Website leaders receive SMS on member join
2. SMS includes correct phone number
3. SMS shows accurate updated price
4. Regular and secondary groups calculated correctly
5. Telegram users skip SMS (no errors)
6. Unverified phones skip SMS (no errors)
7. SMS failure doesn't block payment
8. Multiple rapid joins handled correctly
9. Price decreases with each member
10. Free price shows as "0 تومان"

✅ **Performance:**
- Payment verification < 5 seconds
- SMS sending is async (non-blocking)
- No database deadlocks with concurrent joins

✅ **Error Handling:**
- All errors logged
- No payment rollbacks due to SMS issues
- Graceful degradation

---

## Reporting

After testing, document:
1. Total test cases run: ___
2. Passed: ___
3. Failed: ___
4. Issues found: ___
5. SMS delivery rate: ___%
6. Average payment time: ___ seconds

---

**Ready for Production:** Only if all scenarios pass! 🚀



