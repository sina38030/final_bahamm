# Quick Reference: SMS Notification Feature

## What It Does

When someone joins a group and pays, the leader gets an SMS like:
```
دوستت با شماره 09343438812 به عضو گروهت شد! قیمت سبد به 55٬000 تومان کاهش یافت!
```

## Implementation Summary

### File Modified
- `backend/app/services/payment_service.py`

### Lines Changed
- **Line 366**: Added notification trigger
- **Lines 889-945**: Added `_notify_leader_new_member()` method
- **Lines 947-987**: Added `_get_leader_price_from_api()` method

### Total Lines Added: ~100 lines

## Key Features

✅ **Automatic**: Triggers when invited user pays  
✅ **Smart Filtering**: Only sends to website users (skips Telegram users)  
✅ **Accurate Pricing**: Calculates based on actual paid members  
✅ **Both Group Types**: Handles regular and secondary groups  
✅ **Error Tolerant**: Never blocks payment if notification fails  
✅ **Well Logged**: All actions logged for debugging  

## Price Calculation

Price is retrieved from the track API endpoint (`/api/groups/{group_id}`), which uses the same logic as the frontend track page.

### Regular Groups
| Members | Price |
|---------|-------|
| 0 | 100% |
| 1 | 50% |
| 2 | 33% |
| 3+ | FREE |

### Secondary Groups
| Members | Price |
|---------|-------|
| 0 | 100% |
| 1 | 75% |
| 2 | 50% |
| 3 | 25% |
| 4+ | FREE |

**Source:** Frontend API at `/api/groups/[groupId]/route.ts` (lines 405-438)

## Who Gets SMS?

✅ Leaders with:
- Verified phone number
- NO telegram_id (website users only)

❌ Skipped:
- Telegram mini app users
- Unverified phone numbers

## Testing

### Quick Test
1. Create group as leader (website account)
2. Share invite link
3. Friend joins and pays
4. Check leader's SMS

### Expected SMS Format
```
دوستت با شماره [PHONE] به عضو گروهت شد! قیمت سبد به [PRICE] تومان کاهش یافت!
```

## Logs to Watch

```
✅ SUCCESSFULLY LINKED invited order X to group Y
✅ Sent new member notification to leader X for group Y
⚠️  Leader X is a Telegram user, skipping SMS notification
❌ Error sending notification to leader for group X
```

## Troubleshooting

### SMS Not Sent?

**Check 1: Is leader a website user?**
```sql
SELECT id, phone_number, telegram_id, is_phone_verified 
FROM users 
WHERE id = [leader_id];
```
- If `telegram_id` is NOT NULL → SMS skipped (expected)
- If `is_phone_verified` is FALSE → SMS skipped (expected)

**Check 2: Did order link to group?**
```sql
SELECT id, group_order_id, order_type, paid_at 
FROM orders 
WHERE id = [new_member_order_id];
```
- `group_order_id` should not be NULL
- `order_type` should be 'GROUP'
- `paid_at` should not be NULL

**Check 3: Check logs**
```bash
grep "notify_leader_new_member" backend/logs/*.log
```

### Wrong Price Shown?

**Check paid members count:**
```sql
SELECT COUNT(*) 
FROM orders 
WHERE group_order_id = [group_id]
  AND user_id != [leader_id]
  AND is_settlement_payment = 0
  AND (payment_ref_id IS NOT NULL OR paid_at IS NOT NULL);
```

**Check basket snapshot:**
```sql
SELECT basket_snapshot 
FROM group_orders 
WHERE id = [group_id];
```

## API Endpoints (No Changes)

No new API endpoints were added. The notification happens internally during payment verification.

## Database Schema (No Changes)

Uses existing tables:
- `group_orders`
- `orders`
- `users`
- `order_items`
- `products`

## Configuration (No Changes)

Uses existing SMS configuration:
- `MELIPAYAMAK_API_KEY`
- `SMS_PROVIDER`

## Rollback

To disable, comment line 366 in `payment_service.py`:
```python
# await self._notify_leader_new_member(pending_group_id, order)
```

## Performance Impact

✅ **Minimal**: 
- 2-3 additional DB queries per member join
- SMS sending is async (non-blocking)
- Errors don't affect payment success

## Dependencies

Uses existing services:
- `app.services.notification.notification_service`
- `app.services.sms.sms_service`
- `app.models.*`

## Future Work (Not Implemented)

- [ ] Telegram bot notifications
- [ ] Notification preferences
- [ ] Include product names in SMS
- [ ] Deep links to tracking page

## Support

For issues:
1. Check logs in `backend/logs/`
2. Verify user types (website vs Telegram)
3. Confirm payment completed successfully
4. Check SMS service status

---

**Status:** ✅ Complete and Production Ready  
**Version:** 1.0  
**Date:** November 14, 2025  
**Author:** AI Assistant

