"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/utils/apiClient";
import dynamic from "next/dynamic";
import { useGroupBuyResult } from "@/components/providers/GroupBuyResultProvider";
import GroupBuyResultContent from "@/components/groupbuy/GroupBuyResultContent";
import { fetchGroupBuyData } from "@/hooks/useGroupBuyResultModal";
import DeliveryTimeModal from "@/components/modals/DeliveryTimeModal";
// import { requestSlot, releaseSlot } from "@/utils/queue";

// Debounce utility to prevent excessive updates
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

type TabKey = "groups" | "orders";

interface GroupLeadershipData {
  isLeader: boolean;
  status: 'ongoing' | 'success' | 'failed';
  finalized: boolean;
  settlement: {
    remainder: number | null;
    status: 'pending' | 'settled';
  };
}

interface UserOrder {
  id: number;
  user_id?: number;
  total_amount: number;
  status: string;
  created_at: string;
  payment_authority?: string;
  payment_ref_id?: string;
  shipping_address?: string | null;
  delivery_slot?: string | null;
  items_count: number;
  is_settlement_payment?: boolean;
  group_order_id?: number;
  group_finalized?: boolean;
  // New explicit fields to replace regex dependency
  is_leader_order?: boolean;
  group_status?: 'ongoing' | 'success' | 'failed';
  settlement_status?: 'pending' | 'settled';
  settlement_remainder?: number;
}

// Minimal backend group metadata contract used in this page
interface GroupMeta {
  id: number;
  is_leader: boolean;
  status?: string;
  expires_at?: string | null;
  paid_members?: number | string | null;
  refund_due_amount?: number | string | null;
  settlement_amount?: number | string | null;
  settlement_required?: boolean;
  refund_paid_at?: string | null;
  order_original_price?: number | string | null;
  order_current_price?: number | string | null;
  order_shipping_cost?: number | string | null;
  order_reward_credit?: number | string | null;
  leader_amount_paid?: number | string | null;
  kind?: string;
  is_secondary?: boolean;
  group_type?: string;
  type?: string;
}

// Lightweight result data shape used from fetchGroupBuyData
interface ResultDataShape {
  requiredMembers?: number | string;
  actualMembers?: number | string;
  initialPaid?: number | string;
  finalLeaderPrice?: number | string;
  orderSummary?: {
    originalPrice?: number | string;
    finalItemsPrice?: number | string;
    shippingCost?: number | string;
    rewardCredit?: number | string;
    amountPaid?: number | string;
  };
}

type ToastKind = 'success' | 'error' | 'info';
type ToastDetail = { type?: ToastKind; message: string };

function fireToast(detail: ToastDetail) {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app-toast', { detail }));
    }
  } catch {}
}

function getBackendUrl(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('تنظیمات سرور یافت نشد. لطفاً متغیر NEXT_PUBLIC_BACKEND_URL را پیکربندی کنید.');
  }
  return 'http://127.0.0.1:8001';
}

// Format delivery slot strings or embedded JSON to a human-friendly Persian string
function formatDeliverySlot(raw?: string | null): string {
  try {
    if (!raw) return "";
    let slot: any = raw;
    // If JSON-encoded, parse and extract nested delivery_slot or window
    if (typeof slot === 'string' && (slot.trim().startsWith('{') || slot.trim().startsWith('['))) {
      try {
        const obj = JSON.parse(slot);
        if (obj && typeof obj === 'object') {
          if (typeof obj.delivery_slot === 'string' && obj.delivery_slot.trim().length > 0) {
            slot = obj.delivery_slot;
          } else if (obj.date && (obj.from || obj.to)) {
            const d = new Date(String(obj.date));
            const faDate = isNaN(d.getTime()) ? String(obj.date) : d.toLocaleDateString('fa-IR');
            const from = obj.from ? String(obj.from) : '';
            const to = obj.to ? String(obj.to) : '';
            return `${faDate}${from || to ? `، ${from}${to ? ` تا ${to}` : ''}` : ''}`;
          }
        }
      } catch {
        // ignore JSON parse errors and fall back to raw string
      }
    }
    if (typeof slot !== 'string') slot = String(slot ?? '');
    const s = slot.trim();
    if (!s) return '';
    // Replace relative terms like 'فردا' with explicit date
    if (/^فردا(\s|$)/.test(s) || s === 'فردا') {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const faDate = tomorrow.toLocaleDateString('fa-IR');
      // Extract optional time window if present
      const times = s.replace(/^فردا\s*/, '');
      if (times && /\d{1,2}:\d{2}/.test(times)) {
        // Normalize possible separators like '-' or 'تا'
        const m = times.match(/(\d{1,2}:\d{2})(?:\s*(?:-|تا)\s*(\d{1,2}:\d{2}))?/);
        if (m) {
          const from = m[1] || '';
          const to = m[2] || '';
          return `${faDate}${from || to ? `، ${from}${to ? ` تا ${to}` : ''}` : ''}`;
        }
      }
      return faDate;
    }
    // Try patterns like: YYYY-MM-DD HH:mm-HH:mm or with 'T'
    const m = s.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}:\d{2}))?(?:\s*-\s*(\d{1,2}:\d{2}))?$/);
    if (m) {
      const d = new Date(m[1]);
      const faDate = isNaN(d.getTime()) ? m[1] : d.toLocaleDateString('fa-IR');
      const from = m[2] || '';
      const to = m[3] || '';
      return `${faDate}${from || to ? `، ${from}${to ? ` تا ${to}` : ''}` : ''}`;
    }
    // Fallback to raw string
    if (process.env.NODE_ENV === 'development') {
      try { console.warn('formatDeliverySlot: unknown pattern, returning raw', { raw: s }); } catch {}
    }
    return s;
  } catch {
    return String(raw ?? '');
  }
}

// Remove any internal PENDING_ markers stored in shipping_address
function sanitizeAddress(addr?: string | null): string | null {
  if (!addr) return null;
  try {
    let s = addr.replace(/^PENDING_(GROUP|INVITE):[^|]*\|?/, '');
    const t = s.trim();
    if (!t) return null;
    // If JSON-encoded address, expand with details
    if (t.startsWith('{') || t.startsWith('[')) {
      try {
        const obj = JSON.parse(t);
        if (obj && typeof obj === 'object') {
          const full = String(obj.full_address || obj.address || '').trim();
          const details = String(obj.details || obj.receiver_name || '').trim();
          const postal = String(obj.postal_code || obj.postalCode || '').trim();
          const parts: string[] = [];
          if (full) parts.push(full);
          if (details) parts.push(details);
          if (postal) parts.push(`کدپستی: ${postal}`);
          const combined = parts.join('، ');
          if (combined) return combined;
        }
      } catch {
        // fall through
      }
    }
    return t;
  } catch {
    return addr;
  }
}

const DIGIT_NORMALIZATION_MAP: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '٬': '', ',': '', '　': '', ' ': '', '٫': '.'
};

function toSafeNumber(value: any, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    const withAsciiDigits = trimmed.replace(/[۰-۹٠-٩٬,٫,　\s]/g, (ch) => DIGIT_NORMALIZATION_MAP[ch] ?? ch);
    const sanitized = withAsciiDigits.replace(/[^0-9.-]/g, '');
    if (!sanitized || sanitized === '-' || sanitized === '.' || sanitized === '-.') {
      return fallback;
    }
    const parsed = Number(sanitized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (typeof value === 'object') {
    if ('amount' in (value as any)) return toSafeNumber((value as any).amount, fallback);
    if ('value' in (value as any)) return toSafeNumber((value as any).value, fallback);
    if ('total' in (value as any)) return toSafeNumber((value as any).total, fallback);
    if ('raw' in (value as any)) return toSafeNumber((value as any).raw, fallback);
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// Map backend status to Persian label and a badge color
function getFaStatus(statusRaw?: string | null): { label: string; bg: string; text: string } {
  const raw = String(statusRaw || '').trim();
  const s = raw.toLowerCase();

  // Persian keywords first
  if (raw.includes('ارسال')) return { label: 'ارسال شده', bg: 'bg-blue-50', text: 'text-blue-700' };
  if (raw.includes('تحویل')) return { label: 'تحویل داده شده', bg: 'bg-green-50', text: 'text-green-700' };
  if (raw.includes('مرجوع')) return { label: 'مرجوع شده', bg: 'bg-rose-50', text: 'text-rose-700' };
  if (raw.includes('لغو')) return { label: 'لغو شده', bg: 'bg-gray-100', text: 'text-gray-700' };
  if (raw.includes('تکمیل')) return { label: 'تکمیل شده', bg: 'bg-green-50', text: 'text-green-700' };
  if (raw.includes('آماده')) return { label: 'در حال آماده‌سازی', bg: 'bg-amber-50', text: 'text-amber-700' };
  if (raw.includes('انتظار')) return { label: 'در انتظار', bg: 'bg-yellow-50', text: 'text-yellow-700' };

  // English/variants normalization
  if (/pending|await|awaiting/.test(s)) return { label: 'در انتظار', bg: 'bg-yellow-50', text: 'text-yellow-700' };
  if (/prepare|processing|in_progress|pack/.test(s)) return { label: 'در حال آماده‌سازی', bg: 'bg-amber-50', text: 'text-amber-700' };
  if (/sent|ship|shipped|dispatch|dispatched|in_transit|out_for_delivery/.test(s)) return { label: 'ارسال شده', bg: 'bg-blue-50', text: 'text-blue-700' };
  if (/deliver|delivered|delivering/.test(s)) return { label: 'تحویل داده شده', bg: 'bg-green-50', text: 'text-green-700' };
  if (/return|returned|refund|refunded/.test(s)) return { label: 'مرجوع شده', bg: 'bg-rose-50', text: 'text-rose-700' };
  if (/cancel|canceled|cancelled|void/.test(s)) return { label: 'لغو شده', bg: 'bg-gray-100', text: 'text-gray-700' };
  if (/complete|completed|done|fulfilled|success/.test(s)) return { label: 'تکمیل شده', bg: 'bg-green-50', text: 'text-green-700' };

  // Fallback
  return { label: raw || 'نامشخص', bg: 'bg-gray-100', text: 'text-gray-700' };
}

function isCancelledStatus(statusRaw?: string | null): boolean {
  const raw = String(statusRaw || '').trim();
  const s = raw.toLowerCase();
  if (!raw) return false;
  if (raw.includes('لغو')) return true;
  return /cancel|canceled|cancelled|void/.test(s);
}

export default function GroupsOrdersPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("orders");
  // Allow deep-linking to Orders tab via query param
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const t = (params.get('tab') || '').toLowerCase();
      if (t === 'orders') setTab('orders');
      if (t === 'groups') setTab('groups');
    } catch {}
  }, []);
  const { isAuthenticated, user, token } = useAuth();

  // Minimal debug logging - remove sensitive data
  if (process.env.NODE_ENV === 'development') {
    console.log('User auth status:', { isAuthenticated, userId: user?.id });
  }
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [groupsMeta, setGroupsMeta] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  // Removed ordersLoading and showSpinner - UI shows cached data immediately
  const [apiCallInProgress, setApiCallInProgress] = useState(false); // Prevent concurrent API calls
  // Removed leadershipById state - leadership data is loaded lazily when needed
  const [showDeliveryTimeModal, setShowDeliveryTimeModal] = useState(false);
  const [selectedGroupForDelivery, setSelectedGroupForDelivery] = useState<string | null>(null);
  const [selectedDeliverySlot, setSelectedDeliverySlot] = useState<{ date: string; from: string; to: string; delivery_slot: string } | null>(null);
  // Removed manual refresh state
  const [refundSubmittedGroupIds, setRefundSubmittedGroupIds] = useState<string[]>([]);
  const [embedModalOpen, setEmbedModalOpen] = useState(false);
  const [toast, setToast] = useState<{ type: ToastKind; message: string } | null>(null);
  const fetchLockRef = useRef(false);
  const lastFetchAtRef = useRef<number>(0);

  const handleSelectDeliveryTime = (groupId: string) => {
    setSelectedGroupForDelivery(groupId);
    setShowDeliveryTimeModal(true);
  };

  const handleDeliverySlotSelect = async (slot: { date: string; from: string; to: string; delivery_slot: string }) => {
    if (!selectedGroupForDelivery) return;

    try {
      // Find the leader's order for this group
      const gidNum = parseInt(selectedGroupForDelivery);
      // Prefer finalized leader order created at finalize time
      const byFinalizeRef = orders.find(order =>
        order.group_order_id === gidNum && order.is_leader_order === true
      );
      // Fallback: find any order for this group
      const byLeaderFlag = orders.find(order =>
        order.group_order_id === gidNum
      );
      const leaderOrder = byFinalizeRef || byLeaderFlag;

      if (!leaderOrder) {
        console.error('Leader order not found for delivery time selection');
        alert('سفارش رهبر گروه یافت نشد. لطفاً دوباره تلاش کنید.');
        return;
      }

      // Update the order with delivery slot
      const res = await apiClient.put(`/orders/${leaderOrder.id}/delivery-slot`, {
        date: slot.date,
        from: slot.from,
        to: slot.to,
        delivery_slot: slot.delivery_slot,
        shipping_address: leaderOrder.shipping_address || null
      });

      if (!res.ok) {
        let errorMsg = 'خطا در ثبت زمان تحویل';
        try {
          const errorData = await res.json();
          errorMsg = errorData?.detail || errorData?.error || errorMsg;
        } catch {
          const errorText = await res.text().catch(() => '');
          if (errorText && !errorText.includes('<html>')) {
            errorMsg = errorText;
          }
        }
        console.error('Delivery slot update failed:', errorMsg);
        alert(errorMsg);
        return;
      }

      alert('زمان تحویل با موفقیت ثبت شد');
      setSelectedDeliverySlot(slot);
      // Refresh data to show updated delivery slot
      await refreshData();
    } catch (error) {
      console.error('Delivery slot selection error:', error);
      alert('خطا در اتصال به سرور. لطفاً اتصال اینترنت خود را بررسی کنید.');
    } finally {
      setShowDeliveryTimeModal(false);
      setSelectedGroupForDelivery(null);
    }
  };

  // Removed manual refresh function

  // IMPORTANT: Only use local/session-derived identifiers to avoid exposing other users' groups.

  // جایگزین کردن fetchMyGroups و fetchUserOrders با یک API call یکپارچه
  const fetchUserGroupsAndOrders = React.useCallback(async () => {
    const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('auth_token');
    if (!isAuthenticated && !hasToken) {
      setGroupIds([]);
      setOrders([]);
      return;
    }
    try {
      setFetching(true);
      setApiCallInProgress(true);
      setOrdersError(null);
      
      const res = await apiClient.get('/group-orders/my-groups-and-orders');
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
      }
      
      const data = await res.json();

      // فقط گروه‌هایی که کاربر لیدر آن‌هاست در تب «گروه‌ها» نمایش داده شوند
      const leaderGroupsRaw = (data.groups || []).filter((g: any) => g && g.is_leader === true);
      // Helper: parse date-like values safely
      const toTime = (v: any) => {
        if (!v) return 0;
        const t = Date.parse(String(v));
        return Number.isNaN(t) ? 0 : t;
      };
      // Sort groups by newest first (created_at/expires_at fallback), then id desc
      const leaderGroups = leaderGroupsRaw.slice().sort((a: any, b: any) => {
        const tb = toTime(b.created_at || b.createdAt || b.created || b.expires_at || b.expiresAt);
        const ta = toTime(a.created_at || a.createdAt || a.created || a.expires_at || a.expiresAt);
        if (tb !== ta) return tb - ta;
        return Number(b.id || 0) - Number(a.id || 0);
      });
      const leaderGroupIds = leaderGroups.map((g: any) => String(g.id));
      setGroupIds(leaderGroupIds);
      setGroupsMeta(leaderGroups);

      // Sort orders by newest first
      const sortedOrders: UserOrder[] = Array.isArray(data.orders)
        ? data.orders.slice().sort((a: any, b: any) => {
            const tb = toTime(b.created_at || b.createdAt || b.created);
            const ta = toTime(a.created_at || a.createdAt || a.created);
            if (tb !== ta) return tb - ta;
            return Number(b.id || 0) - Number(a.id || 0);
          })
        : [];
      setOrders(sortedOrders);
      
      
      // Debug logging for groups
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Groups Meta Debug:', leaderGroups.map(g => ({
          id: g.id,
          refund_due_amount: g.refund_due_amount,
          settlement_amount: g.settlement_amount,
          settlement_required: g.settlement_required,
          status: g.status,
          participants: g.participants ? g.participants.length : 'N/A',
          paid_participants: g.participants ? g.participants.filter((p: any) => p.paid && !p.isLeader).length : 'N/A'
        })));
      }
      // Update refund-submitted snapshot after fetching groups
      try {
        const submitted: string[] = [];
        for (const g of leaderGroups) {
          const gidStr = String(g.id);
          if (localStorage.getItem(`gb-refund-submitted-${gidStr}`)) {
            submitted.push(gidStr);
          }
        }
        setRefundSubmittedGroupIds(submitted);
      } catch {}
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Fetched unified data:', {
          groups: data.groups?.length || 0,
          orders: data.orders?.length || 0,
          hasLeaderGroups: data.has_leader_groups
        });
      }
      
    } catch (e: any) {
      console.error('=== UNIFIED API ERROR ===');
      console.error('Error:', e);
      setOrdersError(e?.message || 'خطا در دریافت اطلاعات');
      setGroupIds([]);
      setGroupsMeta([]);
      setOrders([]);
    } finally {
      setFetching(false);
      setApiCallInProgress(false);
      setInitialLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Gate: If user is not authenticated and no token is stored, show login prompt
  try {
    const noSession = !isAuthenticated && (typeof window === 'undefined' || !localStorage.getItem('auth_token'));
    if (noSession) {
      return (
        <div dir="rtl" className="min-h-screen bg-gray-50 pb-20">
          <div className="sticky top-0 bg-white z-10">
            <div className="px-4 py-3 border-b">
              <div className="relative flex items-center justify-between">
                <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-bold">گروه و سفارش‌ها</h1>
                <button onClick={() => router.back()} className="ml-auto p-2 hover:bg-gray-100 rounded-full" aria-label="بازگشت">
                  <span className="inline-block">❮</span>
                </button>
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="bg-white border rounded-xl p-6 text-center shadow-sm max-w-md mx-auto">
              <div className="text-sm text-gray-700 mb-4">برای دیدن گروه و سفارش‌ها وارد شوید</div>
              <button
                onClick={() => router.push('/auth/login')}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-medium py-2.5 px-4 rounded-lg"
              >
                ورود
              </button>
            </div>
          </div>
        </div>
      );
    }
  } catch {}

  // Local toast listener (unified toast surface for this page)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let timer: any = null;
    const onToast = (e: Event) => {
      try {
        const { message, type } = (e as CustomEvent<ToastDetail>).detail || {} as any;
        if (!message) return;
        setToast({ type: (type || 'info') as ToastKind, message });
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => setToast(null), 3000);
      } catch {}
    };
    window.addEventListener('app-toast', onToast as EventListener);
    return () => {
      window.removeEventListener('app-toast', onToast as EventListener);
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const requestRefresh = () => {
      if (!isAuthenticated) return;
      if (apiCallInProgress) return;
      const now = Date.now();
      if (fetchLockRef.current) return;
      if (now - lastFetchAtRef.current < 800) return; // throttle
      fetchLockRef.current = true;
      lastFetchAtRef.current = now;
      void fetchUserGroupsAndOrders().finally(() => {
        fetchLockRef.current = false;
      });
    };

    // Attempt fetch if either context authenticated or token exists in storage
    const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('auth_token');
    if (isAuthenticated || hasToken) {
      requestRefresh();
    } else {
      setGroupIds([]);
      setGroupsMeta([]);
      setOrders([]);
    }

    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === 'auth_token') {
        requestRefresh();
      }
      if (e.key === 'gb-finalized' || e.key === 'gb-settled' || e.key === 'gb-my-active-groups') {
        requestRefresh();
      }
      if (e.key && e.key.startsWith('gb-refund-submitted-')) {
        requestRefresh();
      }
    };

    const onFinalizeCustom = () => { requestRefresh(); };
    const onRefundCustom = () => { requestRefresh(); };
    const onMessage = (ev: MessageEvent) => {
      try {
        if (ev?.origin !== window.location.origin) return;
        if (ev?.data && (ev.data.type === 'gb-finalized' || ev.data.type === 'gb-settled')) {
          requestRefresh();
        }
        if (ev?.data && ev.data.type === 'embed-modal') {
          setEmbedModalOpen(Boolean(ev.data.open));
        }
      } catch {}
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage);
      window.addEventListener('gb-finalized', onFinalizeCustom as EventListener);
      window.addEventListener('gb-refund-submitted', onRefundCustom as EventListener);
      window.addEventListener('message', onMessage as EventListener);
      return () => {
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('gb-finalized', onFinalizeCustom as EventListener);
        window.removeEventListener('gb-refund-submitted', onRefundCustom as EventListener);
        window.removeEventListener('message', onMessage as EventListener);
      };
    }
    return () => {};
  }, [isAuthenticated, mounted, apiCallInProgress, fetchUserGroupsAndOrders]);

  // Duplicate message listener removed (handled in unified effect above)

  // Keep a live snapshot of groups with submitted refund cards
  useEffect(() => {
    try {
      const submitted: string[] = [];
      for (const gid of groupIds) {
        if (localStorage.getItem(`gb-refund-submitted-${gid}`)) {
          submitted.push(String(gid));
        }
      }
      setRefundSubmittedGroupIds(submitted);
    } catch {}
  }, [groupIds]);

  // Listen for same-tab refund submitted event to update snapshot immediately
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onRefundSubmitted = (e: Event) => {
      try {
        const ev = e as CustomEvent<{ groupId?: string }>;
        const gid = ev?.detail?.groupId ? String(ev.detail.groupId) : null;
        if (gid) {
          setRefundSubmittedGroupIds(prev => Array.from(new Set([...prev, gid])));
        } else {
          // Fallback: rescan
          const submitted: string[] = [];
          for (const g of groupIds) {
            if (localStorage.getItem(`gb-refund-submitted-${g}`)) {
              submitted.push(String(g));
            }
          }
          setRefundSubmittedGroupIds(submitted);
        }
      } catch {}
    };
    window.addEventListener('gb-refund-submitted', onRefundSubmitted as EventListener);
    return () => {
      window.removeEventListener('gb-refund-submitted', onRefundSubmitted as EventListener);
    };
  }, [groupIds]);

  // Refresh unified data immediately in the same tab after refund submission
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onRefundSubmitted = () => {
      if (isAuthenticated && !apiCallInProgress) {
        void fetchUserGroupsAndOrders();
      }
    };
    window.addEventListener('gb-refund-submitted', onRefundSubmitted as EventListener);
    return () => {
      window.removeEventListener('gb-refund-submitted', onRefundSubmitted as EventListener);
    };
  }, [isAuthenticated, apiCallInProgress, fetchUserGroupsAndOrders]);

  // حذف شد - فقط از scanLocalGroups استفاده می‌کنیم

  // Removed backend scanning entirely to prevent leaking other users' groups.

  // Never query backend-wide lists here.

  // متد برای refresh کردن داده‌ها پس از انتخاب زمان تحویل
  const refreshData = React.useCallback(async () => {
    if (!isAuthenticated) return;
    if (apiCallInProgress) return;
    const now = Date.now();
    if (fetchLockRef.current || now - lastFetchAtRef.current < 800) return;
    fetchLockRef.current = true;
    lastFetchAtRef.current = now;
    try {
      await fetchUserGroupsAndOrders();
    } finally {
      fetchLockRef.current = false;
    }
  }, [isAuthenticated, apiCallInProgress, fetchUserGroupsAndOrders]);

  // Leadership data will be loaded lazily when needed
  // Removed stableLeadershipById as leadership data is no longer pre-loaded

  const activeOrders = useMemo(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Recalculating activeOrders');
    }

    const filtered = (orders || []).filter((o) => {
      const status = String(o?.status || '').trim();
      const statusLower = status.toLowerCase();

      // Hide settlement payments
      if (o.is_settlement_payment === true) {
        return false;
      }

      // Final statuses should NOT be active (applies to ALL orders, including leader)
      const finalStatuses = [
        'تکمیل شده', 'completed',
        'لغو شده', 'cancelled', 'canceled',
        'success', 'finalized', 'group_finalized', 'failed', 'expired'
      ];
      const isFinal = finalStatuses.includes(status) || finalStatuses.includes(statusLower);
      if (isFinal) {
        return false;
      }

      // Show leader order only when group is successful AND settlement is settled
      if (o.is_leader_order === true) {
        return o.group_status === 'success' && o.settlement_status === 'settled';
      }

      // Other non-final orders are active
      return true;
    });

    // Minimal summary logging
    if (process.env.NODE_ENV === 'development') {
      console.log(`Active orders: ${filtered.length} of ${orders.length}`);
    }

    // Ensure newest first in UI (fallback safety; source is already sorted)
    return filtered.slice().sort((a, b) => {
      const tb = Date.parse(String((b as any).created_at || (b as any).createdAt));
      const ta = Date.parse(String((a as any).created_at || (a as any).createdAt));
      const nTb = Number.isNaN(tb) ? 0 : tb;
      const nTa = Number.isNaN(ta) ? 0 : ta;
      if (nTb !== nTa) return nTb - nTa;
      return Number((b as any).id || 0) - Number((a as any).id || 0);
    });
  }, [orders]);

  // Previous (inactive) orders: explicitly those marked completed by admin.
  const previousOrders = useMemo(() => {
    const finalStatuses = [
      'تکمیل شده', 'completed',
      'لغو شده', 'cancelled', 'canceled',
      'success', 'finalized', 'group_finalized', 'failed', 'expired'
    ];
    const filtered = (orders || []).filter((o) => {
      // Exclude settlement payments
      if (o.is_settlement_payment === true) return false;
      const status = String(o?.status || '').trim();
      const statusLower = status.toLowerCase();
      const isFinal = finalStatuses.includes(status) || finalStatuses.includes(statusLower);
      // Also include leader orders of failed groups so user can see failure in Orders tab
      let isFailedLeader = Boolean(o.group_order_id && o.is_leader_order === true && o.group_status === 'failed');
      // Fallback: treat as failed if group's expiry has passed and no paid members
      if (!isFailedLeader && o.group_order_id && o.is_leader_order === true) {
        try {
          const gm = groupsMeta.find((g: any) => Number(g.id) === Number(o.group_order_id));
          if (gm && gm.expires_at) {
            const exp = Date.parse(String(gm.expires_at));
            const expired = !Number.isNaN(exp) && Date.now() >= exp;
            const paid = Number(gm.paid_members || 0);
            if (expired && paid < 1) isFailedLeader = true;
          }
        } catch {}
      }
      return isFinal || isFailedLeader;
    });
    return filtered.slice().sort((a, b) => {
      const tb = Date.parse(String((b as any).created_at || (b as any).createdAt));
      const ta = Date.parse(String((a as any).created_at || (a as any).createdAt));
      const nTb = Number.isNaN(tb) ? 0 : tb;
      const nTa = Number.isNaN(ta) ? 0 : ta;
      if (nTb !== nTa) return nTb - nTa;
      return Number((b as any).id || 0) - Number((a as any).id || 0);
    });
  }, [orders]);

  // Derive the display address for an order: prefer its own, otherwise use group leader's address
  const deriveDisplayAddress = useCallback((o: UserOrder): string | null => {
    const raw = (o?.shipping_address ?? '') as string;
    const selfAddr = sanitizeAddress(raw);
    const inGroup = Boolean(o?.group_order_id);
    const isLeader = o?.is_leader_order === true;
    // Detect ship-to-leader usage (toggle ON) regardless of user's own address
    const allowConsolidation = (o as any)?.allow_consolidation === true;
    const shipToLeaderFlag = (o as any)?.ship_to_leader === true;
    const consolidated = (o as any)?.consolidated === true;
    const hasPendingMarker = typeof raw === 'string' && /^PENDING_(GROUP|INVITE)/.test(raw);
    // Accept multiple authoritative signals from backend or stored markers
    let isShipToLeader = inGroup && !isLeader && (allowConsolidation || shipToLeaderFlag || consolidated || hasPendingMarker);
    // Fallback: read client-side persisted flag by order id when backend flags are missing
    try {
      if (!isShipToLeader && inGroup && !isLeader && (o?.id != null)) {
        const key = `ship_to_leader_order_${o.id}`;
        const val = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
        if (val === '1') {
          isShipToLeader = true;
        }
      }
    } catch {}

    // If toggle (ship-to-leader) is ON for invited member, show generic message
    if (isShipToLeader) {
      return 'سفارش شما به آدرس سرگروه ارسال خواهد شد';
    }

    // Default: show own address if present, otherwise fallback to leader's address
    if (selfAddr) return selfAddr;
    try {
      if (!inGroup) return null;
      const leaderOrder = orders.find(ord => ord.group_order_id === o.group_order_id && ord.is_leader_order === true);
      const leaderAddr = sanitizeAddress(leaderOrder?.shipping_address);
      if (leaderAddr && leaderAddr.trim()) return leaderAddr;
    } catch {}
    return null;
  }, [orders]);

  // Removed useEffect that was tracking leadership data changes

  const hasOrder = useMemo(() => {
    if (!isAuthenticated) return false;
    return orders.length > 0;
  }, [isAuthenticated, orders]);

  // Removed duplicate local-only scan that overwrote backend results for groupIds.

  // Initial data loading is now handled by the unified useEffect above

  // Removed hack for forcing leader status - rely on backend data only

  // Removed - no longer need to track leadership data changes

  // Removed visibility change listener for orders - no automatic refresh

  // Removed polling - data is only fetched on mount and specific events

  const allGroupIds = useMemo(() => Array.from(new Set(groupIds || [])), [groupIds]);

  const hasGroups = useMemo(() => {
    return allGroupIds.length > 0;
  }, [allGroupIds]);

  // Removed polling - group statuses are only fetched on mount and specific events

  // Leadership detection is now handled by the unified API - no need for separate calls

  const hasLeaderGroup = useMemo(() => {
    // Use backend groups metadata to determine leadership
    return groupsMeta.some(group => group.is_leader === true);
  }, [groupsMeta]);



  // After initial data load: choose default tab based on availability
  // - If user has Groups tab: show Groups
  // - Otherwise: show Orders
  // Respect explicit ?tab= in URL and do not override it
  useEffect(() => {
    if (initialLoading) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const t = (params.get('tab') || '').toLowerCase();
      if (t === 'orders' || t === 'groups') return;
    } catch {}
    setTab(hasLeaderGroup ? 'groups' : 'orders');
  }, [initialLoading, hasLeaderGroup]);

  return (
      <div dir="rtl" className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white z-10">
        <div className="px-4 py-3 border-b">
          <div className="relative flex items-center justify-between">
            <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-bold">گروه و سفارش‌ها</h1>
            <button onClick={() => router.back()} className="ml-auto p-2 hover:bg-gray-100 rounded-full" aria-label="بازگشت">
              <span className="inline-block">❮</span>
            </button>
          </div>
        </div>
        <div className={`grid ${hasLeaderGroup ? 'grid-cols-2' : 'grid-cols-1'} text-center`}>
          {hasLeaderGroup && (
            <button
              className={`py-3 ${
                tab === "groups" ? "border-b-2 border-rose-500 text-rose-600" : "text-gray-600"
              }`}
              onClick={() => setTab("groups")}
            >
              گروه ها
            </button>
          )}
          <button
            className={`py-3 ${
              tab === "orders" ? "border-b-2 border-rose-500 text-rose-600" : "text-gray-600"
            }`}
            onClick={() => setTab("orders")}
          >
            سفارش ها
          </button>
        </div>
      </div>

      {hasLeaderGroup && tab === 'groups' && (
      <div className={`p-4 space-y-4 ${embedModalOpen ? 'relative z-[9999]' : ''}`}>
          {debugInfo && <div className="text-xs bg-yellow-100 p-2 rounded">{debugInfo}</div>}
          
          

          
          {fetching ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-2xl shadow overflow-hidden animate-pulse">
                  <div className="px-4 pt-4 pb-2">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  </div>
                  <div className="border-t">
                    <div className="w-full h-[300px] bg-gray-100"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : allGroupIds.length === 0 ? (
            <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg text-center">
              گروهی ندارید.
            </div>
          ) : (
            allGroupIds.map((gid) => {
              // Find group metadata from backend
              const groupMeta = groupsMeta.find((g: GroupMeta) => String(g.id) === gid);
              if (!groupMeta) {
                // Show loading skeleton for groups without metadata yet
                return (
                  <div key={gid} className="bg-white rounded-2xl shadow overflow-hidden animate-pulse">
                    <div className="px-4 pt-4 pb-2">
                      <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    </div>
                    <div className="border-t">
                      <div className="w-full h-[300px] bg-gray-100"></div>
                    </div>
                  </div>
                );
              }
              
              // Derive status from group metadata with better validation
              const backendStatus = (groupMeta.status || '').toLowerCase();
              let groupStatus: 'ongoing' | 'success' | 'failed' = 'ongoing';

              // Only trust explicit final statuses from backend.
              // Avoid inferring failure on mere expiry to prevent incorrect flash.
              if (backendStatus.includes('finalized') || backendStatus.includes('success') || backendStatus === 'group_finalized') {
                groupStatus = 'success';
              } else if (backendStatus.includes('failed') || backendStatus.includes('expired') || backendStatus === 'group_failed') {
                groupStatus = 'failed';
              } else {
                // Keep as ongoing until authoritative status is known.
                // Also check if group has expired with insufficient members
                const now = Date.now();
                const expiresAt = groupMeta.expires_at ? Date.parse(groupMeta.expires_at) : null;
                const isExpired = expiresAt && now >= expiresAt;
                const paidMembers = Number(groupMeta.paid_members || 0);
                
                if (isExpired && paidMembers < 1) {
                  groupStatus = 'failed';
                } else {
                  groupStatus = 'ongoing';
                }
              }
              
              return (
                <LazyTrackEmbed
                  key={gid}
                  gid={gid}
                  status={groupStatus}
                  isLeader={groupMeta.is_leader === true}
                  onSelectDeliveryTime={handleSelectDeliveryTime}
                  orders={orders}
                  leadershipById={{}} // No longer needed
                  groupsMeta={groupsMeta}
                />
              );
            }).filter(Boolean)
          )}
      </div>
      )}

      {tab === 'orders' && (
      <div className={`p-4 space-y-3`}>
          
          {initialLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow p-4 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                    <div className="ml-3">
                      <div className="h-8 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : ordersError ? (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
              {ordersError}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Active orders */}
              {activeOrders.length > 0 && (
                <div className="space-y-3">
                  {activeOrders.map((o) => {
                    const st = getFaStatus(o.status);
                    return (
                    <div key={o.id} className="bg-white rounded-xl shadow p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-semibold text-emerald-700">سفارش فعال</div>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>{st.label}</span>
                      </div>
                      <div className="text-sm">
                        {o.delivery_slot && (
                          <div className="text-gray-600 text-xs mt-1">زمان تحویل: {formatDeliverySlot(o.delivery_slot)}</div>
                        )}
                        {deriveDisplayAddress(o) && (
                          <div className="text-gray-600 text-xs mt-1 break-words">آدرس: {deriveDisplayAddress(o)}</div>
                        )}
                        <div className="text-gray-800 text-xs mt-1">مبلغ فاکتور: {o.total_amount?.toLocaleString('fa-IR')} تومان</div>
                      </div>
                      <div className="mt-3 flex flex-col gap-2">
                        {/* دکمه جزییات سفارش */}
                        <button
                          className="text-sm px-3 py-1 rounded-full bg-rose-500 text-white"
                          onClick={() => router.push(`/order/${o.id}`)}
                        >
                          جزییات سفارش
                        </button>
                        {/* دکمه انتخاب/تغییر زمان ارسال برای سرگروه پس از نهایی شدن سفارش گروهی */}
                        {o.group_order_id && o.is_leader_order && !isCancelledStatus(o.status) && (
                          <button
                            className="text-sm px-3 py-1 rounded-full bg-blue-500 text-white"
                            onClick={() => handleSelectDeliveryTime(String(o.group_order_id))}
                          >
                            {o.delivery_slot ? 'تغییر زمان ارسال' : 'انتخاب زمان ارسال'}
                          </button>
                        )}
                        {/* دکمه مبلغ پرداختیت رو پس بگیر! فقط برای سفارش‌های فعال غیر لیدر که authority دارند */}
                        {o.group_order_id && !o.is_leader_order && o.payment_authority && !isCancelledStatus(o.status) && (
                          <RefundButtonWithTimer authority={String(o.payment_authority)} />
                        )}
                      </div>
                    </div>
                  );})}
                </div>
              )}

              {/* Previous orders */}
              {previousOrders.length > 0 && (
                <div className="space-y-3">
                  {previousOrders.map((o) => {
                    const failedLeader = Boolean(o.group_order_id && o.is_leader_order === true && o.group_status === 'failed');
                    const st = failedLeader
                      ? { label: 'گروه تشکیل نشد', bg: 'bg-red-50', text: 'text-red-700' }
                      : getFaStatus(o.status);
                    return (
                    <div key={o.id} className="bg-white rounded-xl shadow p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-semibold text-gray-600">سفارش قبلی</div>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>{st.label}</span>
                      </div>
                      <div className="text-sm">
                        {o.delivery_slot && (
                          <div className="text-gray-600 text-xs mt-1">زمان تحویل: {formatDeliverySlot(o.delivery_slot)}</div>
                        )}
                        {deriveDisplayAddress(o) && (
                          <div className="text-gray-600 text-xs mt-1 break-words">آدرس: {deriveDisplayAddress(o)}</div>
                        )}
                        <div className="text-gray-800 text-xs mt-1">مبلغ فاکتور: {o.total_amount?.toLocaleString('fa-IR')} تومان</div>
                        {failedLeader && (
                          <div className="text-xs text-gray-600 mt-1">این گروه به حداقل اعضا نرسید.</div>
                        )}
                      </div>
                      <div className="mt-3 flex flex-col gap-2">
                        <button
                          className="text-sm px-3 py-1 rounded-full bg-rose-500 text-white"
                          onClick={() => router.push(`/order/${o.id}`)}
                        >
                          جزییات سفارش
                        </button>
                        {/* نمایش دکمه بازگشت وجه تا زمانی که تایمر صفر نشده، حتی برای سفارش تکمیل‌شده */}
                        {o.group_order_id && !o.is_leader_order && o.payment_authority && !isCancelledStatus(o.status) && (
                          <RefundButtonWithTimer authority={String(o.payment_authority)} />
                        )}
                        {failedLeader && o.group_order_id && (
                          <div className="mt-2">
                            <div className="text-xs text-gray-700 mb-2">گروه شما تشکیل نشد. برای بازگشت وجه، یکی از روش‌های زیر را انتخاب کنید:</div>
                            <FailedLeaderRefundControls groupId={Number(o.group_order_id)} />
                          </div>
                        )}
                      </div>
                    </div>
                  );})}
                </div>
              )}

              {activeOrders.length === 0 && previousOrders.length === 0 && (
                <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg text-center">
                  سفارشی ندارید.
                </div>
              )}
            </div>
          )}
      </div>
      )}

      {/* Delivery Time Modal */}
      {showDeliveryTimeModal && selectedGroupForDelivery && (
        <DeliveryTimeModal
          isOpen={showDeliveryTimeModal}
          onClose={() => {
            setShowDeliveryTimeModal(false);
            setSelectedGroupForDelivery(null);
          }}
          onSelectSlot={handleDeliverySlotSelect}
          // No targetDate passed - let modal calculate dynamically based on current date
        />
      )}
      
      
      {/* When an embed modal is open inside iframe, lift this page content above bottom nav */}
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2 rounded-lg shadow-md text-sm ${toast.type === 'success' ? 'bg-emerald-600 text-white' : toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-gray-800 text-white'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

function FailedLeaderRefundControls({ groupId }: { groupId: number }) {
  const { token, isAuthenticated } = useAuth() as any;
  const [cardNumber, setCardNumber] = useState("");
  const [submittingCard, setSubmittingCard] = useState(false);
  const [isRefundingWallet, setIsRefundingWallet] = useState(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  useEffect(() => {
    try {
      const key = `gb-refund-submitted-${String(groupId)}`;
      setSubmitted(!!localStorage.getItem(key));
    } catch {}
  }, [groupId]);

  const handleRefundToWallet = async () => {
    if (isRefundingWallet) return;
    try {
      setIsRefundingWallet(true);
      const BACKEND_URL = getBackendUrl();
      const res = await fetch(`${BACKEND_URL}/api/group-orders/refund-to-wallet/${groupId}`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        fireToast({ type: 'error', message: (data?.detail || data?.error || 'خطا در بازگشت به کیف پول') });
        setIsRefundingWallet(false);
        return;
      }
      try {
        localStorage.setItem(`gb-refund-submitted-${groupId}`, String(Date.now()));
        localStorage.setItem(`gb-refund-method-${groupId}`, 'wallet');
        setSubmitted(true);
        window.dispatchEvent(new CustomEvent('gb-refund-submitted', { detail: { groupId: String(groupId) } }));
      } catch {}
      fireToast({ type: 'success', message: 'مبلغ به کیف پول شما واریز شد' });
    } catch {
      fireToast({ type: 'error', message: 'خطا در اتصال به سرور' });
    } finally {
      setIsRefundingWallet(false);
    }
  };

  const handleSubmitCard = async () => {
    const cleaned = cardNumber.replace(/[^0-9]/g, '');
    if (cleaned.length < 16) {
      fireToast({ type: 'error', message: 'شماره کارت باید ۱۶ رقم باشد' });
      return;
    }
    try {
      setSubmittingCard(true);
      const BACKEND_URL = getBackendUrl();
      const res = await fetch(`${BACKEND_URL}/api/group-orders/submit-refund-card/${groupId}`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: new URLSearchParams({ card_number: cleaned })
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        fireToast({ type: 'error', message: (data?.detail || data?.error || 'خطا در ثبت کارت') });
        setSubmittingCard(false);
        return;
      }
      try {
        localStorage.setItem(`gb-refund-submitted-${groupId}`, String(Date.now()));
        localStorage.setItem(`gb-refund-method-${groupId}`, 'bank');
        setSubmitted(true);
        window.dispatchEvent(new CustomEvent('gb-refund-submitted', { detail: { groupId: String(groupId) } }));
      } catch {}
      fireToast({ type: 'success', message: 'اطلاعات کارت ثبت شد. مبلغ به کارت شما واریز و نتیجه اطلاع‌رسانی خواهد شد.' });
    } catch {
      fireToast({ type: 'error', message: 'خطا در اتصال به سرور' });
    } finally {
      setSubmittingCard(false);
    }
  };

  if (submitted) {
    const method = (() => {
      try { return localStorage.getItem(`gb-refund-method-${groupId}`) || 'bank'; } catch { return 'bank'; }
    })();
    return (
      <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3">
        {method === 'wallet' ? 'واریز به کیف پول با موفقیت انجام شد.' : 'اطلاعات کارت ثبت شد. مبلغ به کارت شما واریز خواهد شد.'}
      </div>
    );
  }

  return (
    <div className="space-y-2" dir="rtl">
      <div className="flex gap-2">
        <button
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium py-2 px-3 rounded"
          disabled={isRefundingWallet}
          onClick={handleRefundToWallet}
        >
          بازگشت به کیف پول
        </button>
      </div>
      <div className="border rounded-lg p-3">
        <label className="block text-sm font-medium text-gray-700 mb-2">شماره کارت برای واریز</label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="---- ---- ---- ----"
          className="w-full border rounded-lg p-3 text-right"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
        />
        <button
          onClick={handleSubmitCard}
          disabled={submittingCard}
          className="mt-3 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 px-4 rounded-lg"
        >
          {submittingCard ? 'در حال ثبت...' : 'ثبت اطلاعات کارت'}
        </button>
      </div>
    </div>
  );
}

function RefundButtonWithTimer({ authority }: { authority: string }) {
  const router = useRouter();
  const [expiryMs, setExpiryMs] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [hide, setHide] = useState<boolean>(false);

  // Local storage keys for cross-tab persistence
  const authExpiryKey = useMemo(() => `gb-expiry-by-authority-${String(authority)}`, [authority]);

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        if (!authority) return;
        // 1) Initialize from localStorage immediately (no network) so UI has correct countdown
        try {
          const cached = localStorage.getItem(authExpiryKey);
          if (cached) {
            const t = Number(cached);
            if (Number.isFinite(t) && t > Date.now()) {
              setExpiryMs(t);
            }
          }
        } catch {}

        const res = await fetch(`/api/payment/order/${authority}`);
        const data = await res.json().catch(() => null as any);
        if (!data?.success || !data.order) return;
        const ord = data.order;
        const code = (ord?.group_buy?.invite_code) || (ord?.id ? `GB${ord.id}${String(authority).slice(0, 8)}` : '');
        if (!code) return;
        const gRes = await fetch(`/api/groups/${encodeURIComponent(code)}`);
        if (!gRes.ok) return;
        const g = await gRes.json().catch(() => null as any);
        if (abort || !g) return;
        // Do NOT hide based on primary group status; only the backend-provided secondary-window deadline controls visibility
        const expiresAtMsCamel = (g as any)?.expiresAtMs;
        const expiresAtMsSnake = (g as any)?.expires_at_ms;
        const expiresAtCamel = (g as any)?.expiresAt;
        const expiresAtSnake = (g as any)?.expires_at;
        const expiresInSecondsCamel = (g as any)?.expiresInSeconds;
        const expiresInSecondsSnake = (g as any)?.expires_in_seconds;
        const remainingSecondsCamel = (g as any)?.remainingSeconds;
        const remainingSecondsSnake = (g as any)?.remaining_seconds;

        if (expiresAtMsCamel != null || expiresAtMsSnake != null) {
          const target = Number(expiresAtMsCamel != null ? expiresAtMsCamel : expiresAtMsSnake) || 0;
          if (target > 0) {
            setExpiryMs(target);
            try { localStorage.setItem(authExpiryKey, String(target)); } catch {}
          }
        } else if (remainingSecondsCamel != null || remainingSecondsSnake != null) {
          const secs = Math.max(0, Number(remainingSecondsCamel != null ? remainingSecondsCamel : remainingSecondsSnake) || 0);
          const target = Date.now() + secs * 1000;
          setExpiryMs(target);
          try { localStorage.setItem(authExpiryKey, String(target)); } catch {}
        } else if (expiresInSecondsCamel != null || expiresInSecondsSnake != null) {
          const secs = Math.max(0, Number(expiresInSecondsCamel != null ? expiresInSecondsCamel : expiresInSecondsSnake) || 0);
          const target = Date.now() + secs * 1000;
          setExpiryMs(target);
          try { localStorage.setItem(authExpiryKey, String(target)); } catch {}
        } else if (expiresAtCamel || expiresAtSnake) {
          const raw = String(expiresAtCamel || expiresAtSnake);
          const parsed = Date.parse(raw);
          if (!Number.isNaN(parsed)) {
            setExpiryMs(parsed);
            try { localStorage.setItem(authExpiryKey, String(parsed)); } catch {}
          }
        } else {
          // No fallback: only backend controls the deadline
        }
      } catch {}
    })();
    return () => { abort = true; };
  }, [authority, authExpiryKey]);

  useEffect(() => {
    if (!expiryMs) return;
    const tick = () => {
      try {
        const left = Math.max(0, Math.floor((expiryMs - Date.now()) / 1000));
        setTimeLeft(left);
      } catch {}
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiryMs]);

  // Sync expiry across tabs and keep timer accurate on visibility changes
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      try {
        if (!e.key) return;
        if (e.key === authExpiryKey && typeof e.newValue === 'string') {
          const t = Number(e.newValue);
          if (Number.isFinite(t)) {
            setExpiryMs(prev => {
              // Only extend or overwrite when it differs; prefer the latest value
              if (!prev || Math.abs(prev - t) > 500) return t;
              return prev;
            });
          }
        }
      } catch {}
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage);
      // On visibility gain, force a tick for immediate UI accuracy
      const onVis = () => {
        if (document.visibilityState === 'visible' && expiryMs) {
          try {
            const left = Math.max(0, Math.floor((expiryMs - Date.now()) / 1000));
            setTimeLeft(left);
          } catch {}
        }
      };
      document.addEventListener('visibilitychange', onVis);
      return () => {
        window.removeEventListener('storage', onStorage);
        document.removeEventListener('visibilitychange', onVis);
      };
    }
    return () => {};
  }, [authExpiryKey, expiryMs]);

  const formatTimer = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };
  const toFa = (val: string | number) => String(val).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)]);

  // Hide the button once countdown reaches zero
  if (hide || (typeof timeLeft === 'number' && timeLeft === 0)) {
    return null;
  }

  return (
    <button
      className="text-sm px-3 py-1 rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
      onClick={() => router.push(`/invite?authority=${encodeURIComponent(String(authority))}`)}
    >
      <div className="flex flex-col items-center leading-tight">
        <span>مبلغ پرداختیت رو پس بگیر!</span>
        {typeof timeLeft === 'number' ? (
          <span className="text-[10px] opacity-90 mt-0.5">⏰ {toFa(formatTimer(timeLeft))}</span>
        ) : (
          // If we don't have a ticking state yet but have expiryMs, show immediate computed time
          expiryMs ? (
            <span className="text-[10px] opacity-90 mt-0.5">⏰ {toFa(formatTimer(Math.max(0, Math.floor((expiryMs - Date.now()) / 1000))))}</span>
          ) : null
        )}
      </div>
    </button>
  );
}

function LazyTrackEmbed({
  gid,
  status,
  isLeader,
  onSelectDeliveryTime,
  orders: propOrders,
  leadershipById: propLeadershipById,
  groupsMeta
}: {
  gid: string;
  status: 'ongoing' | 'success' | 'failed';
  isLeader?: boolean;
  onSelectDeliveryTime: (groupId: string) => void;
  orders: UserOrder[];
  leadershipById: Record<string, GroupLeadershipData>; // Can be empty - leadership loaded lazily
  groupsMeta: any[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // const frameRef = useRef<HTMLIFrameElement | null>(null);
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [mountedOnce, setMountedOnce] = useState(false);
  // const [canLoad, setCanLoad] = useState(false);
  const [resultData, setResultData] = useState<any | null>(null);
  const [serverDelta, setServerDelta] = useState<number | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [submittingCard, setSubmittingCard] = useState(false);
  const { token, isAuthenticated, refreshCoins } = useAuth() as any;
  const [refundSubmitted, setRefundSubmitted] = useState(false);
  const [isRefundingWallet, setIsRefundingWallet] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  
  const [bankSuccess, setBankSuccess] = useState(false);
  const [refundMethod, setRefundMethod] = useState<"wallet" | "bank" | null>(null);
  const [isSecondary, setIsSecondary] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  // const dataCacheRef = useRef<Record<string, any>>({});
  // const [payloadReady, setPayloadReady] = useState(false);
  // Determine if this group is a secondary group (authoritative via /api/groups/{gid})
  const gm = groupsMeta && Array.isArray(groupsMeta) ? groupsMeta.find(g => String(g.id) === String(gid)) : null as any;
  useEffect(() => {
    let cancelled = false;
    const fallbackDetect = () => {
      try {
        const kind = String((gm as GroupMeta)?.kind || (gm as GroupMeta)?.group_type || (gm as GroupMeta)?.type || '').toLowerCase();
        if (kind.includes('secondary')) return true;
        if ((gm as GroupMeta)?.is_secondary === true) return true;
        return false;
      } catch { return false; }
    };
    // Set initial guess cheaply
    setIsSecondary(fallbackDetect());
    // Only validate via network when card is visible
    if (!visible) {
      return () => { cancelled = true; };
    }
    (async () => {
      try {
        const res = await fetch(`/api/groups/${encodeURIComponent(String(gid))}`);
        if (!res.ok) { setIsSecondary(fallbackDetect()); return; }
        const j = await res.json().catch(() => null as any);
        if (cancelled || !j) { setIsSecondary(fallbackDetect()); return; }
        const flag = (String(j?.groupType || '').toLowerCase() === 'secondary') || (j?.isSecondaryGroup === true);
        setIsSecondary(Boolean(flag));
      } catch {
        setIsSecondary(fallbackDetect());
      }
    })();
    return () => { cancelled = true; };
  }, [gid, gm, visible]);


  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            setMountedOnce(true);
            
            io.disconnect();
          }
        });
      },
      { root: null, rootMargin: '200px 0px', threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Removed iframe load queue

  // Removed bootstrap prefetch for iframe

  // Removed postMessage injection when payload becomes ready

  // When finalized to success, fetch detailed data to render inline result content
  useEffect(() => {
    let cancelled = false;
    if (status !== 'success') {
      setResultData(null);
      setServerDelta(null);
      return;
    }
    // Initialize refund submitted flag from storage
    try {
      const key = `gb-refund-submitted-${gid}`;
      const val = localStorage.getItem(key);
      setRefundSubmitted(!!val);
      try {
        const m = localStorage.getItem(`gb-refund-method-${gid}`);
        if (m === 'wallet' || m === 'bank') setRefundMethod(m as any);
      } catch {}
    } catch {}
    (async () => {
      try {
        const data = await fetchGroupBuyData(gid);
        if (!cancelled) setResultData(data);
      } catch {
        if (!cancelled) setResultData(null);
      }
    })();
    return () => { cancelled = true; };
  }, [status, gid]);

  // Fetch authoritative settlement status from backend (includes aggregation bonus)
  useEffect(() => {
    (async () => {
      try {
        if (status !== 'success') { setServerDelta(null); return; }
        const BACKEND_URL = getBackendUrl();
        const res = await fetch(`${BACKEND_URL}/api/group-orders/settlement-status/${gid}`, {
          headers: { 'Accept': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
          cache: 'no-store',
        });
        const js = await res.json().catch(() => null as any);
        if (!res.ok || !js) { setServerDelta(null); return; }
        if (js.refund_due && (js.refund_amount || 0) > 0) {
          setServerDelta(-Math.abs(Number(js.refund_amount)));
          return;
        }
        if (js.settlement_required && (js.settlement_amount || 0) > 0) {
          setServerDelta(Math.abs(Number(js.settlement_amount)));
          return;
        }
        setServerDelta(0);
      } catch {
        setServerDelta(null);
      }
    })();
  }, [status, gid, token]);

  // Listen to storage changes for refund submission to update UI
  useEffect(() => {
    let onCustomRef: ((e: Event) => void) | null = null;
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === `gb-refund-submitted-${gid}`) {
        try {
          const val = localStorage.getItem(e.key);
          setRefundSubmitted(!!val);
          try {
            const m = localStorage.getItem(`gb-refund-method-${gid}`);
            if (m === 'wallet' || m === 'bank') setRefundMethod(m as any);
          } catch {}
        } catch {}
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage);
      // Also listen for same-tab custom events
      onCustomRef = (e: Event) => {
        const ev = e as CustomEvent<{ groupId?: string }>;
        if (ev?.type === 'gb-refund-submitted') {
          try {
            const detailId = ev?.detail?.groupId ? String(ev.detail.groupId) : null;
            if (!detailId || detailId === String(gid)) {
              const key = `gb-refund-submitted-${gid}`;
              const val = localStorage.getItem(key);
              setRefundSubmitted(!!val || detailId === String(gid));
              try {
                const m = localStorage.getItem(`gb-refund-method-${gid}`);
                if (m === 'wallet' || m === 'bank') setRefundMethod(m as any);
              } catch {}
            }
          } catch {}
        }
      };
      window.addEventListener('gb-refund-submitted', onCustomRef as EventListener);
      // Also re-read on mount (in case another tab set it just before)
      try {
        const key = `gb-refund-submitted-${gid}`;
        const val = localStorage.getItem(key);
        setRefundSubmitted(!!val);
      } catch {}
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', onStorage);
        if (onCustomRef) {
          window.removeEventListener('gb-refund-submitted', onCustomRef as EventListener);
        }
      }
    };
  }, [gid]);

  

  // Removed settlement polling - settlement data is only fetched on mount and specific events

  // Load next-day delivery slots for settled finalized groups
  useEffect(() => {
    const run = async () => {
      try {
        if (status !== 'success') { return; }
        // Prefer backend settlement result when available
        if (typeof serverDelta === 'number') {
          if (serverDelta !== 0) { return; }
        } else {
          const s = settlementFromData();
          if (!s || typeof s.remainder !== 'number' || s.remainder !== 0) { return; }
        }
        // Removed: fetching of next-day delivery slots
      } catch {}
      finally {}
    };
    void run();
  }, [status, gid, serverDelta, resultData, token]);

  // Removed: delivery slot selection handler

  const formatPrice = (price: number) => {
    return Math.abs(price).toLocaleString('fa-IR');
  };

  const settlementFromData = () => {
    if (!resultData) return null as any;

    // Check if this group has refund_due_amount from group metadata
    const groupMeta = groupsMeta && Array.isArray(groupsMeta) ? groupsMeta.find(g => String(g.id) === String(gid)) : null;
    const refundDueAmount = toSafeNumber(groupMeta?.refund_due_amount, 0);
    const settlementAmount = toSafeNumber(groupMeta?.settlement_amount, 0);
    const settlementRequired = Boolean(groupMeta?.settlement_required);
    const backendOriginalPrice = toSafeNumber(groupMeta?.order_original_price, NaN);
    const backendCurrentPrice = toSafeNumber(groupMeta?.order_current_price, NaN);
    const backendShipping = toSafeNumber(groupMeta?.order_shipping_cost, NaN);
    const backendReward = toSafeNumber(groupMeta?.order_reward_credit, NaN);
    const backendAmountPaid = toSafeNumber(groupMeta?.leader_amount_paid, NaN);

    // Priority: use group metadata for secondary groups, then serverDelta, then client calculation
    let delta = 0;
    if (refundDueAmount > 0) {
      delta = -refundDueAmount; // Negative for refund
    } else if (settlementRequired && settlementAmount > 0) {
      delta = settlementAmount; // Positive for settlement
    } else {
      // Fallback to server delta or client calculation
      const initialPaid = toSafeNumber(resultData.initialPaid, 0);
      const finalLeaderPrice = toSafeNumber(resultData.finalLeaderPrice, 0);
      const clientDelta = finalLeaderPrice - initialPaid;
      delta = (serverDelta ?? clientDelta);
    }

    if (delta === 0) {
      return {
        title: 'تسویه انجام شد',
        message: 'تسویه انجام شد. پرداخت اضافه‌ای نیاز نیست.',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        remainder: 0,
      };
    }
    if (delta > 0) {
      return {
        title: 'باقی‌مانده پرداخت',
        message: `باقی‌مانده پرداخت: ${formatPrice(delta)} تومان`,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        remainder: delta,
      };
    }
    // delta < 0 means refund is due
    if (refundSubmitted) {
      // If refund method is wallet, do NOT show card queue message
      if (refundMethod === 'wallet') {
        return {
          title: 'واریز به کیف پول انجام شد',
          message: 'واریز به کیف پول با موفقیت انجام شد.',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          remainder: delta,
        };
      }
      return {
        title: 'پرداخت به کارت شما در صف است',
        message: 'اطلاعات کارت ثبت شد. مبلغ به کارت شما واریز و نتیجه اطلاع‌رسانی خواهد شد.',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        remainder: delta,
      };
    }
    return {
      title: 'مبلغ قابل بازگشت',
      message: `مبلغ قابل بازگشت: ${formatPrice(Math.abs(delta))} تومان`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      remainder: delta,
    };
  };


  // Removed localStorage dependency - rely on server data only
  const settlement = useMemo(() => settlementFromData(), [resultData, serverDelta, groupsMeta, gid, refundSubmitted, refundMethod]);

  const handlePayRemainder = () => {
    try {
      const s = settlementFromData();
      if (!s || s.remainder <= 0 || isPaying) return;

      (async () => {
        try {
          setIsPaying(true);
          const BACKEND_URL = getBackendUrl();

          // NEW: verify with server before creating payment
          const chk = await fetch(`${BACKEND_URL}/api/group-orders/settlement-status/${gid}`, {
            headers: { 'Accept': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
          });
          const chkData = await chk.json().catch(() => ({} as any));

          if (!chk.ok || chkData?.settlement_required === false || (chkData?.settlement_amount ?? 0) <= 0) {
            console.warn('No settlement required (server).');
            fireToast({ type: 'info', message: 'گروه شما تسویه/نهایی شده و پرداخت باقی‌مانده نیاز نیست.' });
            setIsPaying(false);
            return;
          }

          // Proceed to create settlement payment
          const res = await fetch(`${BACKEND_URL}/api/group-orders/create-settlement-payment-simple/${gid}`, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
          });
          const data = await res.json().catch(() => ({} as any));

          if (res.status === 401 || res.status === 403) {
            console.warn('Unauthorized settlement payment attempt');
            fireToast({ type: 'error', message: 'برای پرداخت تسویه، ابتدا وارد حساب خود شوید' });
            setIsPaying(false);
            return;
          }
          if (!res.ok || !data?.success) {
            const errorMsg = data?.detail || data?.error || 'خطای نامشخص';
            console.warn('Settlement payment creation failed:', errorMsg);
            fireToast({ type: 'error', message: `خطا در ایجاد پرداخت تسویه: ${errorMsg}` });
            setIsPaying(false);
            return;
          }

          const paymentUrl: string | undefined = data.payment_url;
          if (!paymentUrl) {
            console.warn('Invalid payment URL received');
            fireToast({ type: 'error', message: 'آدرس پرداخت نامعتبر است' });
            setIsPaying(false);
            return;
          }

          // Mark settlement flow so callback verifies and finalizes
          try {
            localStorage.setItem('settlement_payment', '1');
            localStorage.setItem('settlement_group_id', String(gid));
          } catch {}

          // Defer navigation to avoid React event-cycle surprises
          setTimeout(() => {
            try { window.location.assign(paymentUrl); } catch {}
          }, 0);
        } catch (err) {
          console.warn('Payment gateway connection error:', err);
          fireToast({ type: 'error', message: 'خطا در اتصال به درگاه پرداخت. لطفاً دوباره تلاش کنید.' });
          setIsPaying(false);
        }
      })().catch(() => {}); // swallow any stray promise rejections
    } catch (e) {
      console.warn('handlePayRemainder sync error:', e);
    }
  };

  const handleSubmitRefundCard = async () => {
    const s = settlementFromData();
    if (!s || !(s.remainder < 0)) return;
    const cleaned = cardNumber.replace(/[^0-9]/g, '');
    if (cleaned.length < 16) {
      console.warn('Invalid card number length:', cleaned.length);
      fireToast({ type: 'error', message: 'شماره کارت باید ۱۶ رقم باشد' });
      return;
    }
    try {
      setSubmittingCard(true);
      const BACKEND_URL = getBackendUrl();
      const res = await fetch(`${BACKEND_URL}/api/group-orders/submit-refund-card/${gid}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: new URLSearchParams({ card_number: cleaned }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        fireToast({ type: 'error', message: (data?.detail || data?.error || 'خطا در ثبت کارت') });
        setSubmittingCard(false);
        return;
      }
      // Show success inside bottom sheet instead of alert
      setBankSuccess(true);
    } catch {
      fireToast({ type: 'error', message: 'خطا در اتصال به سرور' });
    } finally {
      setSubmittingCard(false);
    }
  };


  const finalized = status === 'success' || status === 'failed';

  // حذف شرط عدم نمایش برای non-leader ها - همه گروه‌ها باید نمایش داده بشن
  // if (isLeader === false) {
  //   return null;
  // }

  return (
    <div ref={containerRef} className="bg-white rounded-2xl shadow overflow-hidden">
      
      <div className="px-4 pt-4 text-sm font-medium flex items-center">
        گروه {gid}
      </div>
      <div className="border-t">
        {finalized ? (
          status === 'success' ? (
            isLeader ? (
              // محتوای کامل برای leader ها
              resultData ? (
                <div className="p-4">
                  {/* Explanatory header to match modal */}
                  <div className="mb-3">
                    <div className="text-right">
                      <h2 className="text-base font-semibold text-gray-900">تبریک! گروه با موفقیت تشکیل شد</h2>
                      {!isSecondary && (
                        settlement?.remainder < 0 ? (
                          <p className="mt-1 text-xs text-gray-600 leading-6">
                            شما قبلا وجه برای گروه {`${(toSafeNumber(resultData.requiredMembers, 0) + 1).toLocaleString('fa-IR')}`} نفره
                            (<span className="font-medium">{`${toSafeNumber(resultData.initialPaid, 0).toLocaleString('fa-IR')}`} تومان</span>) را پرداخت کرده‌اید
                            اما گروه {`${(toSafeNumber(resultData.actualMembers, 0) + 1).toLocaleString('fa-IR')}`} نفره تشکیل شد. به خاطر جایزه تجمیع سفارش، مبلغ {`${Math.abs(toSafeNumber(settlement?.remainder, 0)).toLocaleString('fa-IR')}`} تومان به شما برگردانده می‌شود.
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-gray-600 leading-6">
                            شما قبلا وجه برای گروه {`${(toSafeNumber(resultData.requiredMembers, 0) + 1).toLocaleString('fa-IR')}`} نفره
                            (<span className="font-medium">{`${toSafeNumber(resultData.initialPaid, 0).toLocaleString('fa-IR')}`} تومان</span>) را پرداخت کرده‌اید
                            اما گروه {`${(toSafeNumber(resultData.actualMembers, 0) + 1).toLocaleString('fa-IR')}`} نفره تشکیل دادین.{settlement?.remainder > 0 ? ' برای ثبت نهایی سفارش لطفا مبلغ باقیمانده را پرداخت نمایید.' : ''}
                          </p>
                        )
                      )}
                      {isSecondary && settlement?.remainder < 0 && (
                        <p className="mt-2 text-sm text-blue-700">
                          باتوجه به عضویت {toSafeNumber(resultData.actualMembers, 0).toLocaleString('fa-IR')} نفر از دوستانتون در گروه شما، مبلغ {Math.abs(toSafeNumber(settlement?.remainder, 0)).toLocaleString('fa-IR')} تومان به حسابتون برگشت داده خواهد شد.
                        </p>
                      )}
                    </div>
                  </div>
                  {isLeader && gm?.refund_paid_at && toSafeNumber(gm?.refund_due_amount, 0) > 0 && (
                    <div className="mb-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                      مبلغ {Math.abs(toSafeNumber(gm.refund_due_amount, 0)).toLocaleString('fa-IR')} تومان به حسابتون واریز شد.
                    </div>
                  )}
                  {isSecondary ? (
                    <div className="space-y-3" dir="rtl">
                      {/* Static order summary (no dropdown) */}
                      <div className="border rounded-lg p-3">
                        <div className="text-sm font-semibold text-gray-900 mb-2">خلاصه سفارش</div>
                        <div className="text-xs text-gray-600 space-y-1">
                          {(() => {
                            const originalFromSummary = toSafeNumber(resultData.orderSummary?.originalPrice, 0);
                            const originalPrice = originalFromSummary || toSafeNumber(resultData.initialPaid, 0);
                            const currentPrice = toSafeNumber(resultData.orderSummary?.finalItemsPrice, 0);
                            const actualDiscount = Math.max(0, originalPrice - currentPrice);
                            const shippingCost = toSafeNumber(resultData.orderSummary?.shippingCost, 0);
                            const rewardCredit = toSafeNumber(resultData.orderSummary?.rewardCredit, 0);
                            const grandTotal = currentPrice + shippingCost - rewardCredit;
                            const amountPaid = toSafeNumber(resultData.orderSummary?.amountPaid, toSafeNumber(resultData.initialPaid, 0));
                            const remainderAmount = toSafeNumber(settlement?.remainder, 0);
                            return (
                              <div className="space-y-1">
                                <div className="flex justify-between"><span>قیمت اصلی کالاها</span><span>{originalPrice.toLocaleString('fa-IR')} تومان</span></div>
                                <div className="flex justify-between"><span className="text-gray-700">تخفیف خرید گروهی</span><span className="text-red-600">{actualDiscount > 0 ? '-' : ''}{Math.abs(actualDiscount).toLocaleString('fa-IR')} تومان</span></div>
                                <div className="flex justify-between"><span>قیمت نهایی کالا(ها)</span><span>{currentPrice.toLocaleString('fa-IR')} تومان</span></div>
                                <div className="flex justify-between"><span>هزینه ارسال</span><span className={shippingCost === 0 ? 'text-green-600' : ''}>{shippingCost === 0 ? 'رایگان' : `${shippingCost.toLocaleString('fa-IR')} تومان`}</span></div>
                                <div className="flex justify-between"><span>جایزه تجمیع سفارشات</span><span className="text-red-600">{rewardCredit > 0 ? '-' : ''}{Math.abs(rewardCredit).toLocaleString('fa-IR')} تومان</span></div>
                                <div className="flex justify-between font-medium text-gray-900 pt-1 border-t mt-2"><span>جمع کل</span><span>{grandTotal.toLocaleString('fa-IR')} تومان</span></div>
                                <div className="flex justify-between"><span>مبلغ پرداخت شده</span><span>{amountPaid.toLocaleString('fa-IR')} تومان</span></div>
                                <div className={`flex justify-between ${remainderAmount > 0 ? 'text-orange-600' : remainderAmount < 0 ? 'text-blue-600' : ''}`}>
                                  <span>{remainderAmount > 0 ? 'مبلغ باقیمانده' : remainderAmount < 0 ? 'مبلغ قابل بازگشت' : 'تسویه'}</span>
                                  <span>{Math.abs(remainderAmount).toLocaleString('fa-IR')} تومان</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Refund actions for secondary groups (refund due) */}
                      {settlement?.remainder < 0 && (
                        <div className="space-y-3" dir="rtl">
                      {refundSubmitted ? (
                        <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3">
                          {refundMethod === 'wallet' ? 'واریز به کیف پول با موفقیت انجام شد.' : 'اطلاعات کارت ثبت شد. مبلغ به کارت شما واریز خواهد شد.'}
                        </div>
                      ) : (
                          <div className="flex gap-3">
                            <button
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium py-2.5 px-4 rounded-lg"
                              disabled={isRefundingWallet}
                              onClick={async () => {
                                try {
                                  setIsRefundingWallet(true);
                                  const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8001").replace(/\/$/, "");
                                  const res = await fetch(`${BACKEND_URL}/api/group-orders/secondary/refund-to-wallet/${gid}`, {
                                    method: 'POST',
                                    headers: { 'Accept': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
                                  });
                                  const data = await res.json().catch(() => ({} as any));
                                  if (!res.ok) {
                                    alert(data?.detail || data?.error || 'خطا در واریز به کیف پول');
                                    setIsRefundingWallet(false);
                                    return;
                                  }
                                  try { refreshCoins && (await refreshCoins()); } catch {}
                                  try {
                                    localStorage.setItem(`gb-refund-submitted-${gid}`, String(Date.now()));
                                    localStorage.setItem(`gb-refund-method-${gid}`, 'wallet');
                                    setRefundSubmitted(true);
                                    setRefundMethod('wallet');
                                    window.dispatchEvent(new CustomEvent('gb-refund-submitted', { detail: { groupId: String(gid) } }));
                                  } catch {}
                                } catch {
                                  alert('خطا در اتصال به سرور');
                                } finally {
                                  setIsRefundingWallet(false);
                                }
                              }}
                            >
                              واریز به کیف پول
                            </button>
                            <button
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 px-4 rounded-lg"
                              onClick={() => setShowBankForm(true)}
                            >
                              واریز به حساب بانکی
                            </button>
                          </div>
                          )}
                        {showBankForm && (
                          <div>
                            {/* Bottom sheet overlay */}
                            <div className="fixed inset-0 bg-black/40 z-[1000]" onClick={() => { if (!submittingCard) { setShowBankForm(false); setBankSuccess(false); } }} />
                            <div className="fixed inset-x-0 bottom-0 z-[1001] bg-white rounded-t-2xl p-4 shadow-2xl">
                               <div className="h-1 w-10 bg-gray-300 rounded-full mx-auto mb-3" />
                               {!bankSuccess ? (
                                 <div>
                                   <div className="text-sm font-medium text-gray-900 mb-2 text-center">واریز به حساب بانکی</div>
                                   <label className="block text-sm font-medium text-gray-700 mb-2">شماره کارت برای واریز</label>
                                   <input
                                     type="text"
                                     inputMode="numeric"
                                     placeholder="---- ---- ---- ----"
                                     className="w-full border rounded-lg p-3 text-right"
                                     value={cardNumber}
                                     onChange={(e) => setCardNumber(e.target.value)}
                                   />
                                   <button
                                     onClick={async () => { await handleSubmitRefundCard(); }}
                                     disabled={submittingCard}
                                     className="mt-3 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 px-4 rounded-lg"
                                   >
                                     {submittingCard ? 'در حال ثبت...' : 'ثبت اطلاعات کارت'}
                                   </button>
                                   <button
                                     onClick={() => { if (!submittingCard) { setShowBankForm(false); setBankSuccess(false); } }}
                                     className="mt-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 px-4 rounded-lg"
                                   >
                                     انصراف
                                   </button>
                          <p className="mt-2 text-xs text-gray-500 text-center">پس از تکمیل گروه و بررسی توسط پشتیبانی، مبلغ {Math.abs(toSafeNumber(settlement?.remainder, 0)).toLocaleString('fa-IR')} تومان به کارت معرفی‌شده واریز می‌شود.</p>
                                 </div>
                               ) : (
                                 <div className="text-center py-6">
                                   <div className="text-3xl mb-2">✅</div>
                                   <div className="text-sm font-medium text-gray-900 mb-1">اطلاعات کارت ثبت شد</div>
                                   <div className="text-xs text-gray-600">مبلغ به کارت شما واریز و نتیجه اطلاع‌رسانی خواهد شد.</div>
                                   <button
                                     onClick={() => { setShowBankForm(false); setBankSuccess(false); try { localStorage.setItem(`gb-refund-submitted-${gid}`, String(Date.now())); localStorage.setItem(`gb-refund-method-${gid}`, 'bank'); setRefundSubmitted(true); setRefundMethod('bank'); window.dispatchEvent(new CustomEvent('gb-refund-submitted', { detail: { groupId: String(gid) } })); } catch {} }}
                                     className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-4 rounded-lg"
                                   >
                                     بستن
                                   </button>
                                 </div>
                               )}
                             </div>
                           </div>
                        )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <GroupBuyResultContent
                      settlementTitle={settlement?.title}
                      settlementMessage={settlement?.message}
                      settlementColorClass={settlement?.color}
                      settlementBgClass={settlement?.bgColor}
                      settlementBorderClass={settlement?.borderColor}
                      orderSummary={(() => {
                        // اصلاح خلاصه سفارش برای نمایش صحیح در تب گروه ها
                        const initialPaid = toSafeNumber(resultData.initialPaid, 0);
                        const originalFromSummary = toSafeNumber(resultData.orderSummary?.originalPrice, 0);
                        const originalPrice = originalFromSummary || initialPaid;
                        const currentPrice = toSafeNumber(resultData.orderSummary?.finalItemsPrice, 0);
                        const actualDiscount = Math.max(0, originalPrice - currentPrice);
                        return {
                          ...resultData.orderSummary,
                          originalPrice: originalPrice,
                          groupDiscount: actualDiscount,
                          finalItemsPrice: currentPrice,
                          grandTotal: currentPrice + (resultData.orderSummary?.shippingCost || 0) - (resultData.orderSummary?.rewardCredit || 0),
                        };
                      })()}
                      onPayRemainder={settlement && settlement.remainder > 0 ? handlePayRemainder : undefined}
                      remainderAmount={settlement?.remainder}
                    />
                  )}

                {/* Delivery Time Selection - hidden for secondary groups */}
                {!isSecondary && (
                  <div className="p-4 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-900">زمان تحویل</h3>
                      <button
                        onClick={() => onSelectDeliveryTime(gid)}
                        className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md transition-colors"
                      >
                        {(() => {
                          const leaderOrder = propOrders.find(order =>
                            order.group_order_id === parseInt(gid) &&
                            (isLeader === true || order.is_leader_order === true)
                          );
                          return leaderOrder?.delivery_slot ? 'تغییر زمان ارسال' : 'انتخاب زمان ارسال';
                        })()}
                      </button>
                    </div>

                    {(() => {
                      // Find the leader's order for this group to show current delivery slot
                      const leaderOrder = propOrders.find(order =>
                        order.group_order_id === parseInt(gid) &&
                        (isLeader === true || order.is_leader_order === true)
                      );
                      return leaderOrder?.delivery_slot ? (
                        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          زمان انتخاب شده: {formatDeliverySlot(leaderOrder.delivery_slot)}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">
                          هنوز زمان تحویل انتخاب نشده است
                        </div>
                      );
                    })()}
                  </div>
                )}

                {!isSecondary && settlement && settlement.remainder < 0 && !refundSubmitted && (
                  <div className="p-4 border-t border-gray-200" dir="rtl">
                    <label className="block text-sm font-medium text-gray-700 mb-2">شماره کارت برای واریز</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="---- ---- ---- ----"
                      className="w-full border rounded-lg p-3 text-right"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                    />
                    <button
                      onClick={handleSubmitRefundCard}
                      disabled={submittingCard}
                      className="mt-3 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                    >
                      {submittingCard ? 'در حال ثبت...' : 'ثبت اطلاعات کارت'}
                    </button>
                    <p className="mt-2 text-xs text-gray-500">پس از تکمیل گروه و بررسی توسط پشتیبانی، مبلغ {formatPrice(Math.abs(settlement?.remainder || 0))} تومان به کارت معرفی‌شده واریز می‌شود.</p>
                  </div>
                )}
                </div>
              ) : (
                <div className="p-4 text-sm text-gray-600">در حال آماده‌سازی نتیجه گروه...</div>
              )
            ) : (
              // محتوای ساده برای member ها
              <div className="p-4">
                <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                  این گروه با موفقیت تشکیل شد. سفارش‌ها در حال پردازش هستند.
                </div>
              </div>
            )
          ) : (
            <div className="p-4">
              <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3">این گروه ناموفق شد.</div>
              {isLeader && (() => {
                // Determine if leader had a real paid order (not FREE)
                try {
                  const leaderOrder = (propOrders || []).find(o => o.group_order_id === parseInt(gid) && o.is_leader_order === true);
                  const paid = !!(leaderOrder && leaderOrder.payment_ref_id && Number(leaderOrder.total_amount || 0) > 0);
                  if (!paid) return null;
                } catch { return null; }
                return (
                  <div className="mt-4 space-y-3" dir="rtl">
                    <div className="text-xs text-gray-600">بازگشت وجه برای گروه‌های عادی (ثانویه شامل نمی‌شود)</div>
                    <button
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium py-2.5 px-4 rounded-lg"
                      disabled={isRefundingWallet}
                      onClick={async () => {
                        try {
                          setIsRefundingWallet(true);
                          const BACKEND_URL = getBackendUrl();
                          const res = await fetch(`${BACKEND_URL}/api/group-orders/refund-to-wallet/${gid}`, {
                            method: 'POST',
                            headers: { 'Accept': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
                          });
                          const data = await res.json().catch(() => ({} as any));
                          if (!res.ok) {
                            fireToast({ type: 'error', message: (data?.detail || data?.error || 'خطا در بازگشت به کیف پول') });
                            setIsRefundingWallet(false);
                            return;
                          }
                          fireToast({ type: 'success', message: 'مبلغ به کیف پول شما واریز شد' });
                          try { refreshCoins && (await refreshCoins()); } catch {}
                          // Mark as submitted in localStorage for UI state
                          try {
                            localStorage.setItem(`gb-refund-submitted-${gid}`, String(Date.now()));
                            localStorage.setItem(`gb-refund-method-${gid}`, 'wallet');
                          } catch {}
                        } catch {
                          fireToast({ type: 'error', message: 'خطا در اتصال به سرور' });
                        } finally {
                          setIsRefundingWallet(false);
                        }
                      }}
                    >
                      بازگشت به کیف پول
                    </button>
                    {/* Bank card submission */}
                    {!refundSubmitted && (
                      <div className="border rounded-lg p-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">شماره کارت برای واریز</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="---- ---- ---- ----"
                          className="w-full border rounded-lg p-3 text-right"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                        />
                        <button
                          onClick={async () => { await handleSubmitRefundCard(); }}
                          disabled={submittingCard}
                          className="mt-3 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 px-4 rounded-lg"
                        >
                          {submittingCard ? 'در حال ثبت...' : 'ثبت اطلاعات کارت'}
                        </button>
                        <p className="mt-2 text-xs text-gray-500">پس از بررسی توسط پشتیبانی، مبلغ به کارت معرفی‌شده واریز می‌شود.</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )
        ) : (
          (visible || mountedOnce) ? (
            <div className="relative">
              <iframe
                src={`/track/${encodeURIComponent(gid)}?embed=1`}
                className="w-full"
                style={{ height: 700, border: 0 }}
                loading="lazy"
                title={`track-${gid}`}
                onLoad={() => { setIframeLoaded(true); }}
              />
              {/* Loading overlay to prevent flash of empty content */}
              {!iframeLoaded && (
                <div className="loading-overlay absolute inset-0 bg-white flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin mx-auto mb-2"></div>
                    <div className="text-sm text-gray-600">در حال بارگذاری...</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-[300px] bg-gray-100 animate-pulse flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-500 rounded-full animate-spin mx-auto mb-2"></div>
                <div className="text-sm text-gray-500">در حال آماده‌سازی...</div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}


