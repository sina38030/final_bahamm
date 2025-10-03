# Group Buy Result Modal Implementation Guide

## Overview

This implementation provides a comprehensive "Group Buy Result" modal system that shows leaders the outcome of their group purchases and handles settlement states according to the provided specifications.

## Features

✅ **Bottom Sheet Modal Design** - Slides up from bottom with modern UI  
✅ **Settlement State Logic** - Handles 3 states: settled, leader_owes, refund_due  
✅ **Session Storage Tracking** - Prevents repeated showing of resolved modals  
✅ **Automatic Display Logic** - Shows when leader revisits site  
✅ **Order Summary Display** - Complete breakdown of pricing and settlements  
✅ **RTL Support** - Fully right-to-left layout with Persian number formatting  

## Settlement States

### 1. Settled (تسویه انجام شد)
- **Condition**: `actualMembers` exactly matches the chosen tier
- **Logic**: `requiredMembers == actualMembers - 1`
- **Display**: "تسویه انجام شد. پرداخت اضافه‌ای نیاز نیست."
- **Example**: Leader chose "with 1 friend", exactly 1 friend joined

### 2. Leader Owes (باقی‌مانده پرداخت)
- **Condition**: Group ended below the chosen discount tier
- **Logic**: `delta > 0` where `delta = finalLeaderPrice - initialPaid`
- **Display**: "باقی‌مانده پرداخت: {delta} تومان"
- **Action**: Show payment button

### 3. Refund Due (مبلغ قابل بازگشت)
- **Condition**: Group ended at a better tier than chosen
- **Logic**: `delta < 0`
- **Display**: "مبلغ قابل بازگشت: {abs(delta)} تومان"
- **Action**: Process refund to wallet

## File Structure

```
frontend/src/
├── components/
│   ├── modals/
│   │   └── GroupBuyResultModal.tsx          # Main modal component
│   ├── providers/
│   │   └── GroupBuyResultProvider.tsx       # Global modal provider
│   └── examples/
│       └── GroupBuyResultIntegration.tsx    # Integration examples
├── hooks/
│   └── useGroupBuyResultModal.ts            # Modal logic hook
├── app/
│   ├── api/user/pending-group-buys/
│   │   └── route.ts                         # API endpoint for pending groups
│   └── test-group-buy-modal/
│       └── page.tsx                         # Test page with scenarios
└── providers/
    └── Providers.tsx                        # Updated with GroupBuyResultProvider
```

## Usage

### 1. Basic Integration (Already Done)

The modal is automatically integrated at the app level via `GroupBuyResultProvider` in `Providers.tsx`. It will automatically check for pending group buys when users log in.

### 2. Manual Trigger

```tsx
import { useGroupBuyResult } from '@/components/providers/GroupBuyResultProvider';

function MyComponent() {
  const { showModalForGroup } = useGroupBuyResult();
  
  const handleShowResult = () => {
    showModalForGroup('group-123');
  };
  
  return <button onClick={handleShowResult}>Show Result</button>;
}
```

### 3. Page-Specific Integration

```tsx
import GroupBuyResultIntegration from '@/components/examples/GroupBuyResultIntegration';

export default function HomePage() {
  return (
    <div>
      <GroupBuyResultIntegration />
      {/* Your page content */}
    </div>
  );
}
```

## Testing

Visit `/test-group-buy-modal` to test all three settlement scenarios:

1. **Settled**: Leader chose "with 2 friends", exactly 2 friends joined
2. **Leader Owes**: Leader chose "with 2 friends", only 1 friend joined  
3. **Refund Due**: Leader chose "with 2 friends", 4 friends joined

## API Integration

### Required API Endpoints

1. **GET /api/user/pending-group-buys**
   - Returns array of user's group buys that might need settlement
   - Used for automatic modal checking

2. **GET /api/groups/{groupId}**
   - Returns detailed group buy data
   - Used to calculate settlement state

### Expected Data Structure

```typescript
interface GroupBuyData {
  groupId: string;
  status: 'success' | 'ongoing' | 'failed';
  actualMembers: number;
  requiredMembers: number;
  initialPaid: number;
  finalLeaderPrice: number;
  orderSummary: {
    originalPrice: number;
    groupDiscount: number;
    finalItemsPrice: number;
    shippingCost: number;
    rewardCredit: number;
    grandTotal: number;
    amountPaid: number;
  };
  shareUrl?: string;
  isLeader: boolean;
}
```

## Customization

### Styling
The modal uses Tailwind CSS classes and follows the existing design system. Colors and spacing can be customized in `GroupBuyResultModal.tsx`.

### Behavior
- **Session Storage Key**: `gb-modal-{groupId}`
- **Auto-show Delay**: 500ms after page load
- **Modal Animation**: 300ms slide-up transition

### Settlement Logic
The settlement calculation is in `useGroupBuyResultModal.ts` in the `calculateSettlementState` function. Modify this to change the business logic.

## Integration with Backend

To fully integrate with your backend:

1. Update `fetchGroupBuyData` in `useGroupBuyResultModal.ts` to call your actual API
2. Implement the `/api/user/pending-group-buys` endpoint to query your database
3. Add payment processing logic to handle `leader_owes` scenario
4. Add refund processing logic to handle `refund_due` scenario

## Security Considerations

- Modal only shows for authenticated users who are group leaders
- Session storage prevents modal spam
- API calls should validate user permissions
- Payment operations should use secure payment gateways

## Performance Notes

- Modal provider is lightweight and doesn't impact performance
- API calls are debounced and cached where appropriate  
- Modal animations use CSS transforms for smooth performance
- Auto-checking has a 1-second delay to avoid blocking page load

## Future Enhancements

- Add push notifications for settlement reminders
- Implement batch payment processing for multiple pending groups
- Add email notifications for settlement status
- Create admin interface for managing settlements
- Add analytics tracking for modal interactions
