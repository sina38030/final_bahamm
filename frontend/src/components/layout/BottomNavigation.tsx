'use client';

import { FaHome, FaComments, FaUser, FaUsers } from 'react-icons/fa';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/utils/apiClient';
import { useCart } from '@/contexts/CartContext';

export default function BottomNavigation() {
    const pathname = usePathname();
    const { isAuthenticated } = useAuth();
    const { totalItems } = useCart();
    const [groupsOrdersCount, setGroupsOrdersCount] = useState(0);
    const [chatUnreadCount, setChatUnreadCount] = useState(0);
    const [hidden] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const groupCtrlRef = useRef<AbortController | null>(null);
    const chatCtrlRef = useRef<AbortController | null>(null);
    const isInteractingRef = useRef(false);
    const isClient = typeof window !== 'undefined';

    // Defer visibility decision until after all hooks are called to avoid hook order mismatches

    // Compute NEW items (since last seen) for groups/orders using snapshot in localStorage
    const computeGroupsOrdersCount = useCallback(async () => {
        try {
            if (typeof document !== 'undefined' && document.hidden) { return; }
            const hasToken = isClient && !!localStorage.getItem('auth_token');
            if (!isAuthenticated && !hasToken) { setGroupsOrdersCount(0); return; }
            if (groupCtrlRef.current) { try { groupCtrlRef.current.abort(); } catch {} }
            const ctrl = new AbortController();
            groupCtrlRef.current = ctrl;
            const res = await apiClient.get('/group-orders/my-groups-and-orders', { signal: ctrl.signal });
            if (!res.ok) { setGroupsOrdersCount(0); return; }
            const data = await res.json();
            const groups = Array.isArray(data?.groups) ? data.groups : [];
            const orders = Array.isArray(data?.orders) ? data.orders : [];

            // Active orders similar to groups-orders page
            const finalStatuses = ['تحویل داده شده', 'تکمیل شده', 'completed', 'لغو شده', 'cancelled'];
            const activeOrders = orders.filter((o: any) => {
                if (o?.is_settlement_payment === true) return false;
                if (o?.is_leader_order === true) {
                    return o?.group_status === 'success' && o?.settlement_status === 'settled';
                }
                const status = String(o?.status || '').toLowerCase();
                return !finalStatuses.includes(o?.status) && !finalStatuses.includes(status);
            });

            const currentGroupIds: string[] = groups.map((g: any) => String(g?.id));
            const currentActiveOrderIds: number[] = activeOrders.map((o: any) => Number(o?.id));

            // Read last seen snapshots. If none, treat as already seen (0 badge) to avoid noise.
            const safeParseArray = <T,>(raw: string | null): T[] => {
                try {
                    const parsed = JSON.parse(raw || '[]');
                    return Array.isArray(parsed) ? parsed : [];
                } catch {
                    return [];
                }
            };
            const seenGroupIds: string[] = isClient ? safeParseArray<string>(localStorage.getItem('seen_group_ids')) : [];
            const seenActiveOrderIds: number[] = isClient ? safeParseArray<number>(localStorage.getItem('seen_active_order_ids')) : [];

            const newGroups = seenGroupIds.length
                ? currentGroupIds.filter((id) => !seenGroupIds.includes(id))
                : [];
            const newOrders = seenActiveOrderIds.length
                ? currentActiveOrderIds.filter((id) => !seenActiveOrderIds.includes(id))
                : [];

            setGroupsOrdersCount(newGroups.length + newOrders.length);
        } catch (e) {
            setGroupsOrdersCount(0);
        } finally {
            if (groupCtrlRef.current && groupCtrlRef.current.signal.aborted) {
                // noop
            }
            groupCtrlRef.current = null;
        }
    }, [isAuthenticated, isClient]);

    // Mark groups/orders as seen (called when user visits groups-orders tab)
    const markGroupsOrdersSeen = useCallback(async () => {
        try {
            const hasToken = isClient && !!localStorage.getItem('auth_token');
            if (!isAuthenticated && !hasToken) { return; }
            const res = await apiClient.get('/group-orders/my-groups-and-orders');
            if (!res.ok) { return; }
            const data = await res.json();
            const groups = Array.isArray(data?.groups) ? data.groups : [];
            const orders = Array.isArray(data?.orders) ? data.orders : [];

            const finalStatuses = ['تحویل داده شده', 'تکمیل شده', 'completed', 'لغو شده', 'cancelled'];
            const activeOrders = orders.filter((o: any) => {
                if (o?.is_settlement_payment === true) return false;
                if (o?.is_leader_order === true) {
                    return o?.group_status === 'success' && o?.settlement_status === 'settled';
                }
                const status = String(o?.status || '').toLowerCase();
                return !finalStatuses.includes(o?.status) && !finalStatuses.includes(status);
            });

            const currentGroupIds: string[] = groups.map((g: any) => String(g.id));
            const currentActiveOrderIds: number[] = activeOrders.map((o: any) => Number(o.id));

            if (isClient) {
                localStorage.setItem('seen_group_ids', JSON.stringify(currentGroupIds));
                localStorage.setItem('seen_active_order_ids', JSON.stringify(currentActiveOrderIds));
            }
            setGroupsOrdersCount(0);
        } catch {
            // ignore
        }
    }, [isAuthenticated, isClient]);

    // Compute unread chat count based on last-seen snapshot
    const computeChatUnread = useCallback(async () => {
        try {
            if (typeof document !== 'undefined' && document.hidden) { return; }
            const hasToken = isClient && !!localStorage.getItem('auth_token');
            if (!isAuthenticated && !hasToken) { setChatUnreadCount(0); return; }
            if (chatCtrlRef.current) { try { chatCtrlRef.current.abort(); } catch {} }
            const ctrl = new AbortController();
            chatCtrlRef.current = ctrl;
            const res = await apiClient.get('/chat/admin/messages', { signal: ctrl.signal });
            if (!res.ok) { setChatUnreadCount(0); return; }
            const list: any[] = await res.json();
            const adminMessages = (list || []).filter((m: any) => m?.sender === 'admin');

            const latestAdminId = adminMessages.reduce((max: number, m: any) => {
                const idNum = Number(m?.id ?? 0);
                return idNum > max ? idNum : max;
            }, 0);

            const lastSeenId = Number((isClient && localStorage.getItem('chat_last_seen_admin_id')) || 0);

            if (!lastSeenId) {
                // First-time: initialize snapshot to current latest so no legacy badge shows
                if (isClient) localStorage.setItem('chat_last_seen_admin_id', String(latestAdminId || 0));
                setChatUnreadCount(0);
                return;
            }

            const unseenNew = adminMessages.filter((m: any) => Number(m?.id ?? 0) > lastSeenId).length;
            setChatUnreadCount(unseenNew);
        } catch (e) {
            setChatUnreadCount(0);
        } finally {
            if (chatCtrlRef.current && chatCtrlRef.current.signal.aborted) {
                // noop
            }
            chatCtrlRef.current = null;
        }
    }, [isAuthenticated, isClient]);

    // Mark chat messages as seen by updating last-seen snapshot
    const markChatSeen = useCallback(async () => {
        try {
            const hasToken = isClient && !!localStorage.getItem('auth_token');
            if (!isAuthenticated && !hasToken) { return; }
            const res = await apiClient.get('/chat/admin/messages');
            if (!res.ok) { return; }
            const list: any[] = await res.json();
            const adminMessages = (list || []).filter((m: any) => m?.sender === 'admin');
            const latestAdminId = adminMessages.reduce((max: number, m: any) => {
                const idNum = Number(m?.id ?? 0);
                return idNum > max ? idNum : max;
            }, 0);
            if (isClient) {
                localStorage.setItem('chat_last_seen_admin_id', String(latestAdminId || 0));
            }
            setChatUnreadCount(0);
        } catch {
            // ignore
        }
    }, [isAuthenticated, isClient]);

    // Helper to schedule light work during idle time
    const scheduleIdle = useCallback((fn: () => void) => {
        if (typeof window !== 'undefined' && (window as any).requestIdleCallback) {
            (window as any).requestIdleCallback(fn, { timeout: 600 });
        } else {
            setTimeout(fn, 120);
        }
    }, []);

    // Poll with guards and avoid stacking timers across route changes
    useEffect(() => {
        const tick = () => {
            if (typeof document !== 'undefined' && document.hidden) return;
            if (isInteractingRef.current) return;
            scheduleIdle(() => { void computeGroupsOrdersCount(); });
            scheduleIdle(() => { void computeChatUnread(); });
        };

        // initial compute (idle)
        tick();

        // single interval, slower to reduce load
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(() => {
            tick();
        }, 60000);

        const onVisibility = () => { if (!document.hidden) tick(); };
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', onVisibility);
        }
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', onVisibility);
            }
        };
    }, [computeGroupsOrdersCount, computeChatUnread, scheduleIdle]);

    // Avoid heavy recompute on every route change; only clear badges on target tabs below
    // If immediate refresh is needed in future, consider a short debounced trigger.

    // Clear counts when visiting respective pages
    useEffect(() => {
        if (pathname === '/chat') {
            // Update last-seen snapshot so badge won't reappear for the same messages
            markChatSeen();
        }
        if (pathname.startsWith('/groups-orders')) {
            // Mark current groups/orders as seen so badge clears when user opens the tab
            markGroupsOrdersSeen();
        }
    }, [pathname, markChatSeen, markGroupsOrdersSeen]);

    // Silence noisy path logs in production
    if (process.env.NODE_ENV === 'development') {
        console.log('Current pathname:', pathname);
    }

    // Always keep bottom navigation visible; disable hide-on-scroll behavior
    // Previously, the nav hid on downward scroll when on home with items in cart

    const renderBadge = (count: number) => {
        if (!count) return null;
        const cap = count > 99 ? '99+' : String(count);
        return (
            <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] leading-[18px] text-center">
                {cap}
            </span>
        );
    };

    const shouldHide = (
        pathname.startsWith('/product/') ||
        pathname.startsWith('/checkout') ||
        pathname.startsWith('/success') ||
        pathname.startsWith('/landingM') ||
        pathname.startsWith('/auth/login') ||
        pathname.startsWith('/auth/otp') ||
        pathname.startsWith('/three-lead-checkout') ||
        pathname.startsWith('/two-lead-checkout') ||
        pathname.startsWith('/orderinfo') ||
        pathname.startsWith('/tracking') ||
        pathname.startsWith('/track') ||
        pathname === '/cart'
    );

    if (shouldHide) {
        return null;
    }

    const onNavInteract = () => {
        isInteractingRef.current = true;
        try { if (groupCtrlRef.current) groupCtrlRef.current.abort(); } catch {}
        try { if (chatCtrlRef.current) chatCtrlRef.current.abort(); } catch {}
        setTimeout(() => { isInteractingRef.current = false; }, 1500);
    };

    return (
        <div className={`fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around items-center h-16 z-40 transition-transform transform duration-200 will-change-transform ${hidden ? 'translate-y-full' : 'translate-y-0'}`}>
            <Link href="/" className="flex flex-col items-center gap-2 relative" onClick={onNavInteract}>
                <FaHome size={20} className={pathname === '/' ? 'text-[#E31C5F]' : 'text-gray-500'} />
                <span className={pathname === '/' ? 'text-xs text-[#E31C5F]' : 'text-xs text-gray-500'}>خانه</span>
            </Link>
            <Link href="/groups-orders" className="flex flex-col items-center gap-2 relative" onClick={onNavInteract}>
                <div className="relative">
                    <FaUsers size={20} className={pathname.startsWith('/groups-orders') ? 'text-[#E31C5F]' : 'text-gray-500'} />
                    {renderBadge(groupsOrdersCount)}
                </div>
                <span className={pathname.startsWith('/groups-orders') ? 'text-xs text-[#E31C5F]' : 'text-xs text-gray-500'}>گروه و سفارش‌ها</span>
            </Link>
            <Link href="/chat" className="flex flex-col items-center gap-2 relative" onClick={onNavInteract}>
                <div className="relative">
                    <FaComments size={20} className={pathname === '/chat' ? 'text-[#E31C5F]' : 'text-gray-500'} />
                    {renderBadge(chatUnreadCount)}
                </div>
                <span className={pathname === '/chat' ? 'text-xs text-[#E31C5F]' : 'text-xs text-gray-500'}>گفتگو</span>
            </Link>
            <Link href="/profile" className="flex flex-col items-center gap-2 relative" onClick={onNavInteract}>
                <FaUser size={20} className={pathname.startsWith('/profile') ? 'text-[#E31C5F]' : 'text-gray-500'} />
                <span className={pathname.startsWith('/profile') ? 'text-xs text-[#E31C5F]' : 'text-xs text-gray-500'}>حساب کاربری</span>
            </Link>
        </div>
    );
} 