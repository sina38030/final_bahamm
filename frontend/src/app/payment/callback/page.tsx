'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import TelegramReturn from '@/components/TelegramReturn';

function PaymentCallbackContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [isInvited, setIsInvited] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [lastAuthority, setLastAuthority] = useState<string | null>(null);
  const [secondaryGroup, setSecondaryGroup] = useState<any>(null);
  const [secLeft, setSecLeft] = useState<number | null>(null);
  const [preLeft, setPreLeft] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const authorityParam = searchParams.get('Authority') || searchParams.get('authority');
  const [expiryMs, setExpiryMs] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    // Handle both lower/upper-case params from gateway
    const authority = searchParams.get('Authority') || searchParams.get('authority');
    const status = searchParams.get('Status') || searchParams.get('status');
    const amount = searchParams.get('amount'); // Optional amount parameter
    
    console.log('[PaymentCallback] useEffect triggered with params:', { authority, status, amount });

    const processPayment = async () => {
      if (status === 'OK' && authority) {
        // CRITICAL FIX: Check if this authority has already been processed
        const processedKey = `processed_${authority}`;
        const alreadyProcessed = typeof window !== 'undefined' ? localStorage.getItem(processedKey) : null;
        
        if (alreadyProcessed) {
          console.log('[PaymentCallback] Authority already processed, redirecting to appropriate page');
          const processedData = JSON.parse(alreadyProcessed);
          
          if (processedData.isInvited && processedData.orderId) {
            // Redirect to success page instead of re-processing
            const target = `/payment/success/invitee?orderId=${processedData.orderId}${processedData.groupId ? `&groupId=${processedData.groupId}` : ''}`;
            console.log('[PaymentCallback] Redirecting to success page:', target);
            if (typeof window !== 'undefined') {
              window.location.replace(target);
            } else {
              router.replace(target);
            }
            return;
          } else {
            // For non-invited users: on reload or if success page was reached before, stay and show success
            try {
              const navs: any = (typeof performance !== 'undefined') ? performance.getEntriesByType('navigation') : null;
              const isReload = Array.isArray(navs) && navs[0] && navs[0].type === 'reload';
              // Fallback deprecated API
              // @ts-ignore
              const isReloadDeprecated = typeof performance !== 'undefined' && performance.navigation && performance.navigation.type === 1;
              const successReached = typeof window !== 'undefined' && localStorage.getItem('payment_success_reached') === 'true';
              if (isReload || isReloadDeprecated || successReached) {
                setStatus('success');
                setMessage('سفارش شما با موفقیت ثبت شد');
                try {
                  const res = await fetch(`/api/payment/order/${authority}`);
                  const data = await res.json();
                  if (data?.success && data.order) setOrder(data.order);
                } catch {}
                return;
              }
            } catch {}
            // Check if this is a leader (group mode) - they should go to invite page
            if (paymentRole === 'leader') {
              const inviteTarget = `/invite?authority=${encodeURIComponent(authority)}`;
              console.log('[PaymentCallback] Leader payment successful, redirecting to invite page:', inviteTarget);
              if (typeof window !== 'undefined') {
                window.location.replace(inviteTarget);
              } else {
                router.replace(inviteTarget);
              }
              return;
            }
            
            // For other non-invited users (solo), show success message
            console.log('[PaymentCallback] Non-leader payment successful, showing success message');
            setStatus('success');
            setMessage('پرداخت با موفقیت انجام شد');
            try {
              const res = await fetch(`/api/payment/order/${authority}`);
              const data = await res.json();
              if (data?.success && data.order) setOrder(data.order);
            } catch {}
            return;
          }
        }
        
        // Detect invited-user or settlement flows (flags set before redirecting to bank)
        const invitedFlag = typeof window !== 'undefined' ? localStorage.getItem('invited_payment') : null;
        const settlementFlag = typeof window !== 'undefined' ? localStorage.getItem('settlement_payment') : null;
        // Detect solo flow via cookie set at checkout
        const soloCookie = typeof document !== 'undefined' ? document.cookie.split('; ').find(c => c.startsWith('payment_role=')) : null;
        const paymentRole = soloCookie ? soloCookie.split('=')[1] : null;
        const isInvitedFlow = !!invitedFlag;
        const isSettlementFlow = !!settlementFlag;
        setIsInvited(isInvitedFlow);
        
        console.log('[PaymentCallback] Processing payment with flags:', {
          invitedFlag,
          settlementFlag,
          paymentRole,
          isInvitedFlow,
          isSettlementFlow,
          authority
        });

        if (isInvitedFlow) {
          // Show inline success for invited, then redirect to the new invitee success page
          setStatus('success');
          setMessage('پرداخت با موفقیت انجام شد');
          
          console.log('[PaymentCallback] Processing invited payment for authority:', authority);
          
          // Clear the invited_payment flag BEFORE redirect to prevent re-processing
          try { 
            localStorage.removeItem('invited_payment'); 
            console.log('[PaymentCallback] Cleared invited_payment flag');
          } catch {}

          // Verify and load order
          try {
            setVerifying(true);
            await fetch('/api/payment', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                authority,
                amount: amount ? parseInt(amount) : undefined,
              }),
            }).catch(() => {});
          } catch {}

          try {
            const res = await fetch(`/api/payment/order/${authority}`);
            const data = await res.json();
            if (data?.success && data.order?.id) {
              const orderId = data.order.id;
              const groupId = data.order.group_order_id || data.order.groupId || '';
              // Persist ship-to-leader state for this order if intent was set at checkout
              try {
                const intent = localStorage.getItem('ship_to_leader_intent');
                if (intent === '1') {
                  localStorage.setItem(`ship_to_leader_order_${orderId}`, '1');
                  // clear intent to avoid leaking to next orders
                  localStorage.removeItem('ship_to_leader_intent');
                }
              } catch {}
              
              // STORE processing result to prevent re-processing on refresh
              const processedKey = `processed_${authority}`;
              const processedData = {
                isInvited: true,
                orderId: orderId,
                groupId: groupId,
                timestamp: Date.now()
              };
              try {
                localStorage.setItem(processedKey, JSON.stringify(processedData));
                console.log('[PaymentCallback] Stored processing result for authority:', authority);
              } catch {}
              
              const target = `/payment/success/invitee?orderId=${orderId}${groupId ? `&groupId=${groupId}` : ''}`;
              
              console.log('[PaymentCallback] Redirecting invited user to:', target);
              
              // Use history.replaceState to completely replace current entry
              if (typeof window !== 'undefined') {
                // Clear any payment-related parameters from history
                window.history.replaceState(null, '', target);
                window.location.href = target;
              } else {
                router.replace(target);
              }
              return;
            }
          } catch {}
          setLastAuthority(authority);
          setVerifying(false);
          return;
        } else {
          // Leader or normal flow
          // If this was a leader settlement flow, redirect back to admin/invite with confirmation
          const isSettlement = isSettlementFlow;
          if (isSettlement) {
            setStatus('success');
            setMessage('پرداخت تسویه با موفقیت انجام شد. تسویه گروه شما کامل شده است.');
            try { localStorage.removeItem('settlement_payment'); } catch {}
            const gid = typeof window !== 'undefined' ? localStorage.getItem('settlement_group_id') : null;
            try { localStorage.removeItem('settlement_group_id'); } catch {}
            // Verify in the background
            try {
              void fetch('/api/payment', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ authority, amount: amount ? parseInt(amount) : undefined }),
              }).catch(() => {});
            } catch {}
            // Mark group as settled to hide from Active Groups tab and trigger refresh
            try {
              if (gid) {
                const key = 'gb-settled';
                const raw = localStorage.getItem(key);
                const arr = raw ? JSON.parse(raw) : [];
                const next = Array.isArray(arr) ? Array.from(new Set([...arr, String(gid)])) : [String(gid)];
                localStorage.setItem(key, JSON.stringify(next));
                // Also prune from my-active-groups to trigger storage listeners
                const agKey = 'gb-my-active-groups';
                const agRaw = localStorage.getItem(agKey);
                const agList = agRaw ? JSON.parse(agRaw) : [];
                if (Array.isArray(agList) && agList.includes(String(gid))) {
                  const pruned = agList.filter((x: string) => String(x) !== String(gid));
                  localStorage.setItem(agKey, JSON.stringify(pruned));
                } else {
                  // touch the key to fire a storage event
                  localStorage.setItem(agKey, JSON.stringify(agList));
                }
              }
            } catch {}
            // Redirect leader to Groups & Orders page, Orders tab
            try {
              router.replace('/groups-orders?tab=orders');
            } catch {
              router.push('/groups-orders?tab=orders');
            }
            return;
          }
          // If solo flow, verify and show inline success + track button
          if (paymentRole === 'solo') {
            try {
              setVerifying(true);
              // First attempt: verify without explicit amount (backend uses order total)
              await fetch('/api/payment', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ authority, amount: amount ? parseInt(amount) : undefined }),
              }).catch(() => {});
              // Check order
              let orderOk = false;
              try {
                const res = await fetch(`/api/payment/order/${authority}`);
                const data = await res.json();
                if (data?.success && data.order?.id) {
                  setOrder(data.order);
                  if (data.order.payment_ref_id) orderOk = true;
                }
                // If payment_ref_id missing, try verify with explicit amount from order total
                if (!orderOk && data?.order?.total_amount) {
                  const rial = parseInt(data.order.total_amount) * 10;
                  await fetch('/api/payment', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ authority, amount: rial }),
                  }).catch(() => {});
                  // Re-fetch
                  const res2 = await fetch(`/api/payment/order/${authority}`);
                  const data2 = await res2.json();
                  if (data2?.success && data2.order?.payment_ref_id) {
                    setOrder(data2.order);
                    orderOk = true;
                  }
                }
              } catch {}
            } catch {}
            setVerifying(false);
            setStatus('success');
            setMessage('سفارش شما با موفقیت ثبت شد');
            // Clear cookie
            try { document.cookie = 'payment_role=; Path=/; Max-Age=0; SameSite=Lax'; } catch {}
            return;
          }
          // Default (leader non-settlement): avoid redirect on reload; show inline success instead
          try {
            const navs: any = (typeof performance !== 'undefined') ? performance.getEntriesByType('navigation') : null;
            const isReload = Array.isArray(navs) && navs[0] && navs[0].type === 'reload';
            // Fallback deprecated API
            // @ts-ignore
            const isReloadDeprecated = typeof performance !== 'undefined' && performance.navigation && performance.navigation.type === 1;
            const successReached = typeof window !== 'undefined' && localStorage.getItem('payment_success_reached') === 'true';
            if (isReload || isReloadDeprecated || successReached) {
              setStatus('success');
              setMessage('سفارش شما با موفقیت ثبت شد');
              const processedKey = `processed_${authority}`;
              const processedData = { isInvited: false, timestamp: Date.now() };
              try { localStorage.setItem(processedKey, JSON.stringify(processedData)); } catch {}
              try {
                const res = await fetch(`/api/payment/order/${authority}`);
                const data = await res.json();
                if (data?.success && data.order) setOrder(data.order);
              } catch {}
              return;
            }
          } catch {}

          // Otherwise: verify payment FIRST, then redirect to invite page
          console.log('[PaymentCallback] Leader flow - verifying payment before redirect');
          try {
            setVerifying(true);
            // Verify payment
            await fetch('/api/payment', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                authority, 
                amount: amount ? parseInt(amount) : undefined 
              }),
            }).catch(() => {});
            
            // Wait a bit for backend to process
            await new Promise(resolve => setTimeout(resolve, 500));
            
            console.log('[PaymentCallback] Payment verified, redirecting to invite');
          } catch (e) {
            console.error('[PaymentCallback] Verification failed:', e);
          } finally {
            setVerifying(false);
          }
          
          const processedKey = `processed_${authority}`;
          const processedData = { isInvited: false, timestamp: Date.now() };
          try { localStorage.setItem(processedKey, JSON.stringify(processedData)); } catch {}
          
          // Check if this is a leader (group mode) - they should go to invite page
          if (paymentRole === 'leader') {
            const inviteTarget = `/invite?authority=${encodeURIComponent(authority)}`;
            console.log('[PaymentCallback] Leader payment verified, redirecting to invite page:', inviteTarget);
            try {
              if (typeof window !== 'undefined') {
                window.location.replace(inviteTarget);
              } else {
                router.replace(inviteTarget);
              }
            } catch {
              router.replace(inviteTarget);
            }
            return;
          }
          
          // For other non-leader users, show success message
          console.log('[PaymentCallback] Non-leader payment verified, showing success message');
          setStatus('success');
          setMessage('پرداخت با موفقیت انجام شد');
          try {
            const res = await fetch(`/api/payment/order/${authority}`);
            const data = await res.json();
            if (data?.success && data.order) setOrder(data.order);
          } catch {}
          return;
        }
      } else {
        // Payment failed or cancelled
        setStatus('failed');
        setMessage('پرداخت ناموفق یا لغو شده');
        
        // For failed payments, redirect to checkout instead of invite page
        setTimeout(() => {
          const target = `/checkout`;
          try {
            if (typeof window !== 'undefined') {
              window.location.assign(target);
            } else {
              router.push(target);
            }
          } catch {
            router.push(target);
          }
        }, 1200);
      }
    };

    processPayment();
  }, [searchParams, router]);

  // Restore created secondary group info (and countdown) on refresh
  useEffect(() => {
    if (!isInvited) return;
    const authority = searchParams.get('Authority') || searchParams.get('authority');
    if (!authority || secondaryGroup) return;
    try {
      const saved = localStorage.getItem(`secondary_group_${authority}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.expires_at) {
          setSecondaryGroup(parsed);
        }
      }
    } catch {}
  }, [isInvited, searchParams, secondaryGroup]);

  // Start/maintain a live countdown for the created secondary group
  useEffect(() => {
    let timer: any;
    if (secondaryGroup?.expires_at) {
      const tick = () => {
        try {
          const expMs = new Date(secondaryGroup.expires_at).getTime();
          const nowMs = Date.now();
          const secs = Math.max(0, Math.floor((expMs - nowMs) / 1000));
          setSecLeft(secs);
        } catch {
          setSecLeft(null);
        }
      };
      tick();
      timer = setInterval(tick, 1000);
    } else {
      setSecLeft(null);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [secondaryGroup]);

  const formatTimer = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };
  const toFa = (val: string | number) => String(val).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)]);
  const formatCurrency = (amount?: number | string) => {
    if (amount == null) return '-';
    const num = typeof amount === 'string' ? Number(amount) : amount;
    try { return `${toFa(Math.round(num).toLocaleString())} تومان`; } catch { return `${toFa(num)}`; }
  };

  // Pre-group 24h timer (starts from order.created_at)
  useEffect(() => {
    if (!order || secondaryGroup) return;
    let timer: any;
    try {
      const createdMs = order?.created_at ? Date.parse(order.created_at) : Date.now();
      const tick = () => {
        const nowMs = Date.now();
        const expMs = createdMs + 24 * 60 * 60 * 1000;
        const left = Math.max(0, Math.floor((expMs - nowMs) / 1000));
        setPreLeft(left);
      };
      tick();
      timer = setInterval(tick, 1000);
    } catch {}
    return () => { if (timer) clearInterval(timer); };
  }, [order, secondaryGroup]);

  // Load expiry for invited secondary flow to show countdown on refund button
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        if (!authorityParam) return;
        // Fetch order by authority to derive invite code
        const res = await fetch(`/api/payment/order/${authorityParam}`);
        const data = await res.json().catch(() => null as any);
        if (!data?.success || !data.order) return;
        const ord = data.order;
        const code = (ord?.group_buy?.invite_code) || (ord?.id ? `GB${ord.id}${String(authorityParam).slice(0, 8)}` : '');
        if (!code) return;
        const gRes = await fetch(`/api/groups/${encodeURIComponent(code)}`, { cache: 'no-store' });
        if (!gRes.ok) return;
        const g = await gRes.json().catch(() => null as any);
        if (abort || !g) return;
        // Normalize expiry similar to invite page
        if (g?.expiresAtMs != null) {
          const srv = Number(g.serverNowMs);
          const clientNow = Date.now();
          const skew = Number.isFinite(srv) && srv > 0 ? (clientNow - srv) : 0;
          const target = (Number(g.expiresAtMs) || 0) + skew;
          if (target > 0) setExpiryMs(target);
        } else if (g?.remainingSeconds != null) {
          const secs = Math.max(0, Number(g.remainingSeconds) || 0);
          setExpiryMs(Date.now() + secs * 1000);
        } else if (g?.expiresInSeconds != null) {
          const secs = Math.max(0, Number(g.expiresInSeconds) || 0);
          setExpiryMs(Date.now() + secs * 1000);
        } else if (g?.expiresAt) {
          const parsed = Date.parse(g.expiresAt);
          if (!Number.isNaN(parsed)) setExpiryMs(parsed);
        } else {
          // Fallback: 24h window
          const twentyFour = Date.now() + 24 * 60 * 60 * 1000;
          setExpiryMs(twentyFour);
        }
      } catch {}
    })();
    return () => { abort = true; };
  }, [authorityParam]);

  // Countdown tick for refund button
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

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-md mx-auto bg-white min-h-screen pb-24">
        {/* Loading */}
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center pt-24 px-4 text-center">
            <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-700 text-sm">{message || 'در حال پردازش پرداخت...'}</p>
            {verifying && <p className="text-gray-500 text-xs mt-1">لطفاً صبر کنید...</p>}
          </div>
        )}

        {/* Success */}
        {status === 'success' && (
          <div className="px-4 pt-8 space-y-6">
            {/* Hero */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-9 h-9 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-lg font-extrabold text-gray-900 mb-1">پرداخت موفق</h1>
              <p className="text-gray-600 text-sm">سفارش شما با موفقیت ثبت شد</p>
            </div>

        {/* Details (optional) */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <button onClick={() => setShowDetails(v => !v)} className="w-full px-4 py-3 flex items-center justify-between text-right hover:bg-gray-50">
                <span className="text-custom-pink text-sm font-medium">جزئیات پرداخت</span>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${showDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showDetails && (
                <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                  <div className="space-y-3 pt-3 text-sm">
                    <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-mono" dir="ltr">{order?.payment_ref_id ?? order?.payment?.bankRef ?? '-'}</span>
                      <span className="text-gray-600">کد پیگیری:</span>
                    </div>
                    <div className="flex justify-between items-center">
                  <span className="text-emerald-700 font-bold">{formatCurrency(order?.total_amount ?? order?.totalPaid ?? 0)}</span>
                      <span className="text-gray-600">مبلغ پرداخت:</span>
                    </div>
                
                  </div>
                </div>
              )}
            </div>

            {/* Guidance */}
            <div className="rounded-2xl p-4 text-center border border-gray-200">
              <h2 className="text-gray-800 font-bold text-base mb-1">پرداخت شما با موفقیت ثبت شد</h2>
              <div className="text-gray-600 text-sm">برای پیگیری وضعیت، به صفحه سفارش‌ها بروید.</div>
            </div>

            {/* Telegram Return - Deep Link to Mini App */}
            <TelegramReturn 
              orderId={order?.id}
              groupId={order?.group_order_id}
              showVpnWarning={true}
            />

            {/* CTAs */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/groups-orders" className="inline-flex items-center justify-center px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors">مشاهده سفارش‌ها</Link>
              {authorityParam ? (
                <button
                  onClick={() => router.push(`/invite?authority=${encodeURIComponent(authorityParam)}`)}
                  className="inline-flex items-center justify-center px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
                >
                  <div className="flex flex-col items-center leading-tight">
                    <span>مبلغ پرداختیت رو پس بگیر!</span>
                    {typeof timeLeft === 'number' && (
                      <span className="text-[11px] opacity-90 mt-0.5">⏰ {toFa(formatTimer(timeLeft))}</span>
                    )}
                  </div>
                </button>
              ) : (
                <button
                  disabled
                  className="inline-flex items-center justify-center px-4 py-3 rounded-xl border border-gray-200 text-gray-400 text-sm font-semibold cursor-not-allowed"
                >
                  در حال آماده‌سازی...
                </button>
              )}
            </div>
          </div>
        )}

        {/* Failed */}
        {status === 'failed' && (
          <div className="flex flex-col items-center justify-center pt-24 px-4 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-extrabold text-gray-900 mb-1">پرداخت ناموفق</h2>
            <p className="text-gray-600 text-sm mb-6">{message || 'پرداخت ناموفق یا لغو شده'}</p>
          </div>
        )}
      </div>

      
    </div>
  );
} 

export default function PaymentCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">در حال بارگذاری...</p>
        </div>
      </div>
    }>
      <PaymentCallbackContent />
    </Suspense>
  );
}