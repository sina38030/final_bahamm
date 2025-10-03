"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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

interface UseGroupBuyResultModalProps {
  groupBuyData?: GroupBuyData | null;
  enabled?: boolean;
}

const DIGIT_NORMALIZATION_MAP: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '٬': '', ',': '', '٫': '.', '　': '', ' ': ''
};

const safeNumber = (value: any, fallback = 0): number => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    const withAscii = trimmed.replace(/[۰-۹٠-٩٬٫,　\s]/g, (ch) => DIGIT_NORMALIZATION_MAP[ch] ?? ch);
    const sanitized = withAscii.replace(/[^0-9.-]/g, '');
    if (!sanitized || sanitized === '-' || sanitized === '.' || sanitized === '-.') return fallback;
    const parsed = Number(sanitized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (typeof value === 'object') {
    if ('amount' in (value as any)) return safeNumber((value as any).amount, fallback);
    if ('value' in (value as any)) return safeNumber((value as any).value, fallback);
    if ('total' in (value as any)) return safeNumber((value as any).total, fallback);
    if ('raw' in (value as any)) return safeNumber((value as any).raw, fallback);
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const useGroupBuyResultModal = ({ 
  groupBuyData, 
  enabled = true 
}: UseGroupBuyResultModalProps = {}) => {
  const { user, isAuthenticated } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!enabled || !groupBuyData) {
      return;
    }

    // Only show for leaders (provider may force isLeader=true)
    if (!groupBuyData.isLeader) {
      return;
    }

    // Only show for successful group buys
    if (groupBuyData.status !== 'success') {
      return;
    }

    const { groupId, initialPaid, finalLeaderPrice, actualMembers, requiredMembers } = groupBuyData as any;
    // Previous behavior: use counts to constrain delta sign
    const expected = safeNumber(requiredMembers, 0);
    const actual = safeNumber(actualMembers, 0);
    const leaderOwes = actual < expected;
    const refundDue = actual > expected;
    const rawDelta = safeNumber(finalLeaderPrice, 0) - safeNumber(initialPaid, 0);
    const delta = leaderOwes ? Math.max(0, rawDelta) : refundDue ? Math.min(0, rawDelta) : 0;

    // Check if modal was already shown in this session
    const modalShown = sessionStorage.getItem(`gb-modal-${groupId}`);
    
    // Determine if we should show the modal
    const shouldShow = !modalShown || delta !== 0 || leaderOwes || refundDue; // restore previous show conditions

    if (shouldShow) {
      // Small delay to ensure page is loaded
      const timer = setTimeout(() => {
        setIsModalOpen(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [enabled, groupBuyData]);

  const closeModal = () => {
    setIsModalOpen(false);
    if (groupBuyData?.groupId) {
      sessionStorage.setItem(`gb-modal-${groupBuyData.groupId}`, '1');
    }
  };

  return {
    isModalOpen,
    closeModal,
    groupBuyData,
  };
};

// Utility function to calculate settlement state
export const calculateSettlementState = (
  actualMembers: number,
  requiredMembers: number,
  initialPaid: number,
  finalLeaderPrice: number
) => {
  const delta = finalLeaderPrice - initialPaid;
  
  if (delta === 0) {
    return {
      state: 'settled' as const,
      delta: 0,
      message: 'تسویه انجام شد. پرداخت اضافه‌ای نیاز نیست.'
    };
  } else if (delta > 0) {
    return {
      state: 'leader_owes' as const,
      delta,
      message: `باقی‌مانده پرداخت: ${Math.abs(delta).toLocaleString('fa-IR')} تومان`
    };
  } else {
    return {
      state: 'refund_due' as const,
      delta,
      message: `مبلغ قابل بازگشت: ${Math.abs(delta).toLocaleString('fa-IR')} تومان`
    };
  }
};

// Function to fetch group buy data from API
export const fetchGroupBuyData = async (groupId: string): Promise<GroupBuyData | null> => {
  try {
    const response = await fetch(`/api/groups/${groupId}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`API responded with status ${response.status}: ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    
    // Transform API response to our expected format
      // Derive counts and deltas on the client payload
      const achievedPaidNonLeaders = Math.max(0, (data.participants || []).filter((p: any) => !p.isLeader && (p.paid || String(p.status || '').toLowerCase().includes('paid'))).length);
      const selectedExpectedFriends = safeNumber(data.expectedFriends ?? data.minJoinersForSuccess, 1);
      const countsMatch = safeNumber(achievedPaidNonLeaders, 0) === safeNumber(selectedExpectedFriends, 0);

      // استفاده از داده‌های API که حالا دقیقاً مانند cart محاسبه می‌شوند
      const originalTotal = safeNumber(data.pricing?.originalTotal, safeNumber(data.orderSummary?.originalPrice, safeNumber(data.initialPayment, 0))); // alone price
      const currentTotal = safeNumber(data.pricing?.currentTotal, safeNumber(data.orderSummary?.finalItemsPrice, originalTotal));
      
      // API حالا دقیقاً مانند cart کار می‌کند، پس نیاز به fallback نداریم
      const correctOriginal = originalTotal;
      const correctCurrent = currentTotal;
      const correctDiscount = Math.max(0, originalTotal - currentTotal);

      return {
        groupId: data.id,
        status: data.status,
        actualMembers: achievedPaidNonLeaders,
        requiredMembers: selectedExpectedFriends,
        initialPaid: safeNumber(data.initialPayment, safeNumber(data.amountPaid, correctOriginal)),
        finalLeaderPrice: safeNumber(data.finalLeaderPrice, currentTotal),
        orderSummary: {
          originalPrice: correctOriginal,
          groupDiscount: correctDiscount,
          finalItemsPrice: correctCurrent,
          shippingCost: safeNumber(data.shippingCost, safeNumber(data.orderSummary?.shippingCost, 0)),
          rewardCredit: safeNumber(data.rewardCredit, safeNumber(data.orderSummary?.rewardCredit, 0)),
          grandTotal: safeNumber(data.orderSummary?.grandTotal, correctCurrent + safeNumber(data.shippingCost, 0) - safeNumber(data.rewardCredit, 0)),
          amountPaid: safeNumber(data.amountPaid, safeNumber(data.initialPayment, correctCurrent)),
        },
        shareUrl: data.invite?.shareUrl || '',
        isLeader: data.participants?.some((p: any) => p.isLeader && p.id === data.currentUserId) || false,
      };
  } catch (error) {
    console.error('Error fetching group buy data for group', groupId, ':', error);
    return null;
  }
};
