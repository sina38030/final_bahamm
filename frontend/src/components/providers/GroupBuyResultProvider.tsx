"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import GroupBuyResultModal from '@/components/modals/GroupBuyResultModal';
import { useGroupBuyResultModal, fetchGroupBuyData } from '@/hooks/useGroupBuyResultModal';

interface GroupBuyResultContextType {
  checkForPendingGroupBuys: () => Promise<void>;
  showModalForGroup: (groupId: string, options?: { force?: boolean }) => Promise<void>;
}

const GroupBuyResultContext = createContext<GroupBuyResultContextType>({
  checkForPendingGroupBuys: async () => {},
  showModalForGroup: async () => {},
});

export const useGroupBuyResult = () => useContext(GroupBuyResultContext);

interface GroupBuyResultProviderProps {
  children: React.ReactNode;
}

export const GroupBuyResultProvider: React.FC<GroupBuyResultProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [currentGroupBuyData, setCurrentGroupBuyData] = useState<any>(null);
  const PUBLIC_API = '/api';
  const enableInviteFallback = (process.env.NEXT_PUBLIC_ENABLE_INVITE_FALLBACK || "0") === "1";
  // Guard to prevent duplicate runs in React StrictMode (dev) and excessive checks
  const didInitRef = useRef(false);
  
  const { isModalOpen, closeModal } = useGroupBuyResultModal({ 
    groupBuyData: currentGroupBuyData,
    enabled: true 
  });

  // Check for pending group buys when user logs in or page loads
  const checkForPendingGroupBuys = async () => {
    if (!isAuthenticated || !user) return;

    // Limit heavy checks to home page to avoid impacting all routes
    try {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname || '/';
        if (path !== '/') return;
      }
    } catch {}

    try {
      // Fetch admin group-buys list and find groups where current user is leader by phone
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      let res: Response;
      try {
        res = await fetch(`${PUBLIC_API}/admin/group-buys`, { cache: 'no-store', signal: controller.signal });
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err && err.name === 'AbortError') return;
        throw err;
      }
      clearTimeout(timeoutId);
      if (!res.ok) return;
      const list: any[] = await res.json().catch(() => []);
      const listArr: any[] = Array.isArray(list) ? list : [];
      const myGroups = listArr.filter((r: any) => String(r.creator_phone || '').trim() === String(user.phone_number || '').trim());
      // Prefer successful ones not yet acknowledged
      const successIds = myGroups
        .filter((r: any) => {
          const s = String(r.status || '').toUpperCase();
          return s.includes('FINAL') || s.includes('SUCCESS') || String(r.status || '').includes('موفق');
        })
        .map((r: any) => String(r.id));
      for (const gid of successIds) {
        const suppressedSession = sessionStorage.getItem(`gb-modal-${gid}`);
        let suppressedPersistent = false;
        try {
          const rawSeen = localStorage.getItem('gb-seen');
          const seenArr = rawSeen ? JSON.parse(rawSeen) : [];
          suppressedPersistent = Array.isArray(seenArr) && seenArr.includes(String(gid));
        } catch {}
        if (suppressedSession || suppressedPersistent) continue;
        // Force show for leader on home
        await showModalForGroup(gid, { force: true });
        break; // one at a time
      }

      // Fallback: scan recent successful groups and check details to match leader phone
      if (successIds.length === 0) {
        const candidates = listArr
          .filter((r: any) => {
            const s = String(r.status || '').toUpperCase();
            return s.includes('FINAL') || s.includes('SUCCESS') || String(r.status || '').includes('موفق');
          })
          .slice(0, 30); // limit to avoid heavy scans
        for (const r of candidates) {
          const gid = String(r.id);
          const suppressedSession = sessionStorage.getItem(`gb-modal-${gid}`);
          let suppressedPersistent = false;
          try {
            const rawSeen = localStorage.getItem('gb-seen');
            const seenArr = rawSeen ? JSON.parse(rawSeen) : [];
            suppressedPersistent = Array.isArray(seenArr) && seenArr.includes(String(gid));
          } catch {}
          if (suppressedSession || suppressedPersistent) continue;
          try {
            const detRes = await fetch(`${PUBLIC_API}/admin/group-buys/${gid}`, { cache: 'no-store' });
            if (!detRes.ok) continue;
            const det = await detRes.json().catch(() => null);
            const phone = String(det?.leader_phone || '').trim();
            if (phone && phone === String(user.phone_number || '').trim()) {
              await showModalForGroup(gid, { force: true });
              break;
            }
          } catch (err: any) {
            if (err && err.name === 'AbortError') {
              // ignore aborted fetch
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking for pending group buys:', error);
    }
  };

  // Show modal for a specific group
  const showModalForGroup = async (groupId: string, options?: { force?: boolean }) => {
    try {
      const groupData = await fetchGroupBuyData(groupId);
      if (!groupData) return;
      const isLeader = options?.force ? true : groupData.isLeader;
      if (isLeader && groupData.status === 'success') {
        setCurrentGroupBuyData({ ...groupData, isLeader: true });
      }
    } catch (error) {
      console.error(`Error showing modal for group ${groupId}:`, error);
      // Silently fail - don't show modal if data fetch fails
    }
  };

  // Check for pending group buys on mount and when user changes
  useEffect(() => {
    if (!(isAuthenticated && user)) return;
    // Prevent double-invocation in React StrictMode (development)
    if (didInitRef.current) return;
    didInitRef.current = true;

    // Small delay to ensure page is fully loaded
    const timer = setTimeout(() => {
      void checkForPendingGroupBuys();
    }, 1000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, user]);

  // One-time trigger set after finalize on track page
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem('gb-show-on-home');
      if (pending) {
        // Respect persistent seen
        let seen = false;
        try {
          const rawSeen = localStorage.getItem('gb-seen');
          const seenArr = rawSeen ? JSON.parse(rawSeen) : [];
          seen = Array.isArray(seenArr) && seenArr.includes(String(pending));
        } catch {}
        sessionStorage.removeItem('gb-show-on-home');
        if (!seen) {
          void showModalForGroup(pending, { force: true });
        }
      }
      // Also check persistent pending list across sessions
      const raw = localStorage.getItem('gb-pending');
      const ids: string[] = raw ? JSON.parse(raw) : [];
      if (Array.isArray(ids) && ids.length > 0) {
        // Show the first one and keep it pending until user interacts with modal
        const first = String(ids[0]);
        let seen = false;
        try {
          const rawSeen = localStorage.getItem('gb-seen');
          const seenArr = rawSeen ? JSON.parse(rawSeen) : [];
          seen = Array.isArray(seenArr) && seenArr.includes(first);
        } catch {}
        if (!seen) {
          void showModalForGroup(first, { force: true });
        }
      }
      // Hardcoded invite code fallback for reported issue (resolve invite → id)
      if (enableInviteFallback) {
        const INVITE = 'GB298A0000000';
        // Try to resolve invite code via groups list
        fetch(`${PUBLIC_API}/admin/group-buys`, { cache: 'no-store' })
          .then(r => r.ok ? r.json() : Promise.reject())
          .then((lst: any[]) => {
            if (!Array.isArray(lst)) return;
            const row = lst.find((x: any) => String(x.invite_code || '').trim() === INVITE);
            if (row && row.id != null) {
              const gid = String(row.id);
              let seen = false;
              try {
                const rawSeen = localStorage.getItem('gb-seen');
                const seenArr = rawSeen ? JSON.parse(rawSeen) : [];
                seen = Array.isArray(seenArr) && seenArr.includes(gid);
              } catch {}
              if (!seen) {
                void showModalForGroup(gid, { force: true });
              }
            }
          })
          .catch(() => {});
      }
    } catch {}
  }, []);

  const handleModalClose = () => {
    closeModal();
    setCurrentGroupBuyData(null);
  };

  return (
    <GroupBuyResultContext.Provider value={{ checkForPendingGroupBuys, showModalForGroup }}>
      {children}
      
      {/* Group Buy Result Modal */}
      {currentGroupBuyData && (
        <GroupBuyResultModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          groupId={currentGroupBuyData.groupId}
          actualMembers={currentGroupBuyData.actualMembers}
          requiredMembers={currentGroupBuyData.requiredMembers}
          initialPaid={currentGroupBuyData.initialPaid}
          finalLeaderPrice={currentGroupBuyData.finalLeaderPrice}
          orderSummary={currentGroupBuyData.orderSummary}
          shareUrl={currentGroupBuyData.shareUrl}
        />
      )}
    </GroupBuyResultContext.Provider>
  );
};
