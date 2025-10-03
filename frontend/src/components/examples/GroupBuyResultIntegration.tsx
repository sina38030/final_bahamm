"use client";

import React, { useEffect } from 'react';
import { useGroupBuyResult } from '@/components/providers/GroupBuyResultProvider';

/**
 * Example component showing how to integrate the Group Buy Result Modal
 * into existing pages where leaders might visit after a group buy completes.
 * 
 * This component should be used in pages like:
 * - Home page
 * - Profile page 
 * - Orders page
 * - Group tracking page
 */

interface GroupBuyResultIntegrationProps {
  // Optional: specific group ID to check
  groupId?: string;
  // Optional: disable automatic checking
  autoCheck?: boolean;
}

const GroupBuyResultIntegration: React.FC<GroupBuyResultIntegrationProps> = ({
  groupId,
  autoCheck = true
}) => {
  const { checkForPendingGroupBuys, showModalForGroup } = useGroupBuyResult();

  useEffect(() => {
    if (!autoCheck) return;

    if (groupId) {
      // Check specific group
      showModalForGroup(groupId);
    } else {
      // Check all pending group buys for the user
      checkForPendingGroupBuys();
    }
  }, [groupId, autoCheck, checkForPendingGroupBuys, showModalForGroup]);

  // This component doesn't render anything - it just handles the logic
  return null;
};

export default GroupBuyResultIntegration;

/**
 * Usage Examples:
 * 
 * 1. In your home page component:
 * ```tsx
 * import GroupBuyResultIntegration from '@/components/examples/GroupBuyResultIntegration';
 * 
 * export default function HomePage() {
 *   return (
 *     <div>
 *       <GroupBuyResultIntegration />
 *       {/* rest of your page content *\/}
 *     </div>
 *   );
 * }
 * ```
 * 
 * 2. In a specific group tracking page:
 * ```tsx
 * import GroupBuyResultIntegration from '@/components/examples/GroupBuyResultIntegration';
 * 
 * export default function GroupTrackingPage({ groupId }: { groupId: string }) {
 *   return (
 *     <div>
 *       <GroupBuyResultIntegration groupId={groupId} />
 *       {/* rest of your page content *\/}
 *     </div>
 *   );
 * }
 * ```
 * 
 * 3. Manual trigger:
 * ```tsx
 * import { useGroupBuyResult } from '@/components/providers/GroupBuyResultProvider';
 * 
 * export default function SomeComponent() {
 *   const { showModalForGroup } = useGroupBuyResult();
 *   
 *   const handleShowResult = () => {
 *     showModalForGroup('group-123');
 *   };
 *   
 *   return (
 *     <button onClick={handleShowResult}>
 *       Show Group Buy Result
 *     </button>
 *   );
 * }
 * ```
 */
