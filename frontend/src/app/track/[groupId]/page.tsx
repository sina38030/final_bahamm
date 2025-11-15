"use client";
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useParams, useSearchParams } from "next/navigation";
import { useGroupBuyResult } from "@/components/providers/GroupBuyResultProvider";
import { generateInviteLink, generateShareUrl, extractInviteCode } from "@/utils/linkGenerator";
// Removed auth requirement for public access

type GroupStatus = "ongoing" | "success" | "failed";
interface Participant {
  id: string;
  username?: string | null;
  isLeader: boolean;
  // optional fields from backend (if available)
  phone?: string | null;
  telegramId?: string | null;
  hasUser?: boolean;
  paid?: boolean;
}
interface GroupTrack {
  id: string;
  leader: { id: string; username: string };
  expiresAt: string | null;
  createdAt: string | null;
  status: GroupStatus;
  minJoinersForSuccess: number; // target joiners (excluding leader)
  participants: Array<Participant>;
  basket: Array<{
    productId: string;
    name: string;
    qty: number;
    unitPrice: number;
    discountedUnitPrice: number;
    image?: string;
  }>;
  pricing: { originalTotal: number; currentTotal: number };
  invite: { shareUrl: string };
  // NEW: Secondary group fields
  isSecondaryGroup?: boolean;
  groupType?: 'secondary' | 'regular';
  kind?: string;
  group?: { kind?: string };
}

export default function TrackPage() {
  const [data, setData] = useState<GroupTrack | null>(null);
  const [timeLeftSec, setTimeLeftSec] = useState<number>(0);
  const [countdownReady, setCountdownReady] = useState<boolean>(false);
  const [showBasket, setShowBasket] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [skipFetch, setSkipFetch] = useState<boolean>(false);

  // Route params early, used by effects below
  const routeParams = useParams<{ groupId: string }>();
  const groupId = routeParams?.groupId as string | undefined;
  const searchParams = useSearchParams();

  // Notify parent (if embedded) when any sheet/modal opens/closes so it can raise z-index over bottom nav
  useEffect(() => {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'embed-modal', open: showBasket || showShare }, window.location.origin);
      }
    } catch {}
  }, [showBasket, showShare]);

  // When embedded inside an iframe, continuously report content height to parent for auto-resize
  useEffect(() => {
    try {
      if (!(window.parent && window.parent !== window)) return;

      const computeEmbedHeight = (): number => {
        const doc = document.documentElement;
        const body = document.body;
        const candidates = [
          doc.scrollHeight,
          doc.offsetHeight,
          doc.clientHeight,
          body ? body.scrollHeight : 0,
          body ? body.offsetHeight : 0,
          body ? body.clientHeight : 0,
          window.innerHeight,
        ].filter((n) => Number.isFinite(n)) as number[];
        const max = candidates.length > 0 ? Math.max(...candidates) : 700;
        // Clamp to a sensible range to avoid runaway values
        return Math.max(300, Math.min(4000, max));
      };

      const sendHeight = () => {
        try {
          const height = computeEmbedHeight();
          window.parent.postMessage({ type: 'embed-height', groupId: String(groupId || ''), height }, window.location.origin);
        } catch {}
      };

      // Initial send on mount
      sendHeight();

      // Observe layout/size changes
      let resizeObserver: ResizeObserver | null = null;
      try {
        resizeObserver = new ResizeObserver(() => { sendHeight(); });
        if (document.body) resizeObserver.observe(document.body);
      } catch {
        resizeObserver = null;
      }

      const onResize = () => sendHeight();
      window.addEventListener('resize', onResize);

      // Also poll briefly to catch async content after first load
      const pollId = window.setInterval(sendHeight, 800);

      return () => {
        try { if (resizeObserver) resizeObserver.disconnect(); } catch {}
        window.removeEventListener('resize', onResize);
        window.clearInterval(pollId);
      };
    } catch {}
  // Recompute when key states that affect layout change
  }, [groupId, data, showBasket, showShare, countdownReady, timeLeftSec]);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string>("");
  const { showModalForGroup } = useGroupBuyResult();
  const { user } = useAuth();
  // Removed complex server time sync - using simple local time countdown
  // Public page: read-only for invitees, leader-only controls should be hidden
  const PUBLIC_API = process.env.NEXT_PUBLIC_ADMIN_API_URL || "http://127.0.0.1:8001/api";

  const fetchWithTimeout = async (url: string, ms: number, options?: RequestInit) => {
    const c = new AbortController();
    const id = setTimeout(() => c.abort(), ms);
    try {
      const res = await fetch(url, { cache: "no-store", signal: c.signal, ...(options || {}) });
      return res;
    } finally {
      clearTimeout(id);
    }
  };

  // Check for external flag from search params
  useEffect(() => {
    try {
      const ext = (searchParams?.get('external') || '').toString();
      const isExt = ext === '1' || ext.toLowerCase() === 'true';
      if (isExt) setSkipFetch(true);
    } catch {}
  }, [searchParams]);

  const parseServerDateToMs = (value?: string | null): number | null => {
    if (!value) return null;
    // Try native parse first
    const direct = Date.parse(value);
    if (!Number.isNaN(direct)) return direct;
    
    // Normalize format (replace space with T)
    const normalized = value.replace(' ', 'T');
    
    // If the string doesn't have timezone info, assume it's Tehran time (UTC+3:30)
    if (!/Z|[+-]\d{2}:?\d{2}$/.test(normalized)) {
      // Add Tehran timezone offset (+03:30) to treat it as Tehran time
      const tehranTime = Date.parse(normalized + '+03:30');
      if (!Number.isNaN(tehranTime)) return tehranTime;
    }
    
    // Try parsing as local time
    const local = Date.parse(normalized);
    if (!Number.isNaN(local)) return local;
    
    // Last resort: try as UTC
    const utc = Date.parse(normalized + 'Z');
    if (!Number.isNaN(utc)) return utc;
    
    return null;
  };

  // tick per second for countdown (pure decrement)
  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeftSec(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    try {
      if (!groupId) return;
      // Primary: via Next.js API (3.5s hard timeout at client); public access
      const res = await fetchWithTimeout(`/api/groups/${groupId}`, 4500);
      if (!res.ok) throw new Error(await res.text());
      const j: GroupTrack = await res.json();
      setData(j);
      try {
        const gidStr = String(j.id || groupId || '').trim();
        const infoRaw = localStorage.getItem('groupOrderInfo');
        const byInfo = (() => {
          try { const i = infoRaw ? JSON.parse(infoRaw) : null; return i?.invite_code && String(i.invite_code).trim() === gidStr; } catch { return false; }
        })();
        const byPending = (() => {
          try { const p = localStorage.getItem('gb-pending'); const arr = p ? JSON.parse(p) : []; return Array.isArray(arr) && arr.includes(gidStr); } catch { return false; }
        })();
        const byLeader = (() => {
          try { return Array.isArray((j as any)?.participants) && (j as any).participants.some((p: any) => p?.isLeader === true); } catch { return false; }
        })();
        const isMine = byInfo || byPending || byLeader;
        if (isMine) {
          const key = 'gb-my-active-groups';
          const raw = localStorage.getItem(key);
          const list = raw ? JSON.parse(raw) : [];
          const next = Array.isArray(list) ? Array.from(new Set([...list, gidStr])) : [gidStr];
          localStorage.setItem(key, JSON.stringify(next));
        }
      } catch {}
      // Derive remaining seconds from server and store stably
      let nextRemaining: number | null = null;
      const anyJ: any = j as any;
      if (anyJ?.remainingSeconds != null) {
        nextRemaining = Math.max(0, Number(anyJ.remainingSeconds) || 0);
      } else if (anyJ?.expiresAtMs != null && anyJ?.serverNowMs != null) {
        const exp = Number(anyJ.expiresAtMs) || 0;
        const srv = Number(anyJ.serverNowMs) || 0;
        if (exp > 0 && srv > 0) nextRemaining = Math.max(0, Math.floor((exp - srv) / 1000));
      } else if (anyJ?.startedAtMs != null) {
        const start = Number(anyJ.startedAtMs) || 0;
        if (start > 0) nextRemaining = Math.max(0, Math.floor(((start + 24 * 3600 * 1000) - Date.now()) / 1000));
      }
      if (nextRemaining != null) {
        setTimeLeftSec(nextRemaining);
        setCountdownReady(true);
      }
    } catch (e) {
      // Try a resilient fallback via frontapi proxy (same payload shape)
      try {
        if (!groupId) throw e;
        const res2 = await fetchWithTimeout(`/frontapi/groups/${groupId}`, 4500);
        if (!res2.ok) throw new Error(await res2.text());
        const j2: GroupTrack = await res2.json();
        setData(j2);
        // Derive remaining seconds from server and store stably
        let nextRemaining2: number | null = null;
        const anyJ2: any = j2 as any;
        if (anyJ2?.remainingSeconds != null) {
          nextRemaining2 = Math.max(0, Number(anyJ2.remainingSeconds) || 0);
        } else if (anyJ2?.expiresAtMs != null && anyJ2?.serverNowMs != null) {
          const exp = Number(anyJ2.expiresAtMs) || 0;
          const srv = Number(anyJ2.serverNowMs) || 0;
          if (exp > 0 && srv > 0) nextRemaining2 = Math.max(0, Math.floor((exp - srv) / 1000));
        } else if (anyJ2?.startedAtMs != null) {
          const start = Number(anyJ2.startedAtMs) || 0;
          if (start > 0) nextRemaining2 = Math.max(0, Math.floor(((start + 24 * 3600 * 1000) - Date.now()) / 1000));
        }
        if (nextRemaining2 != null) {
          setTimeLeftSec(nextRemaining2);
          setCountdownReady(true);
        }
        return;
      } catch (e2) {
        console.error('[Track] API error (both routes failed):', e, e2);
        setToast("خطا در دریافت اطلاعات گروه");
        if (!data && groupId) {
          setData({
            id: String(groupId),
            leader: { id: "", username: "@leader" },
            expiresAt: null,
            createdAt: null,
            status: "failed",
            minJoinersForSuccess: 3,
            participants: [],
            basket: [],
            pricing: { originalTotal: 0, currentTotal: 0 },
            invite: { shareUrl: "" },
            isSecondaryGroup: false,
            groupType: 'regular' as 'secondary' | 'regular',
            kind: '',
            group: { kind: '' },
          });
        }
      }
    }
  };

  // initial + polling with adaptive interval based on group status
  useEffect(() => {
    if (!groupId) return;
    void load();
    
    // Use longer intervals for completed/failed groups to reduce server load
    const interval = data?.status === 'success' || data?.status === 'failed' ? 30000 : 15000;
    const iv = setInterval(load, interval);
    return () => clearInterval(iv);
  }, [groupId, data?.status]);

  const remaining = timeLeftSec;

  // Share link/message resolution (match Invite page behavior)
  const shareMsg = "بیا با هم سبد رو بخریم تا رایگان بگیریم!";
  const resolvedInviteLink = useMemo(() => {
    try {
      const raw = data?.invite?.shareUrl || "";
      if (!raw) return "";
      
      // Extract invite code from the URL
      const inviteCode = extractInviteCode(raw);
      if (inviteCode) {
        // Generate environment-aware link (Telegram mini app vs website)
        return generateInviteLink(inviteCode);
      }
      
      // Fallback: resolve the raw URL as before
      const envBase = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || "").replace(/\/$/, "");
      const origin = envBase || (typeof window !== "undefined" ? window.location.origin : "");
      if (/^https?:\/\//i.test(raw)) return raw;
      if (raw.startsWith("/")) return `${origin}${raw}`;
      return `${origin}/${raw.replace(/^\/+/, "")}`;
    } catch {
      return "";
    }
  }, [data?.invite?.shareUrl]);
  const encodedLanding = encodeURIComponent(resolvedInviteLink || "");
  const shareText = `${shareMsg} ${resolvedInviteLink || ""}`.trim();
  const encodedMsg = encodeURIComponent(shareText);

  const copyInviteLink = async () => {
    try {
      if (!resolvedInviteLink) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(resolvedInviteLink);
      } else {
        const ta = document.createElement("textarea");
        ta.value = resolvedInviteLink;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setToast("لینک کپی شد");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
      setToast("کپی لینک ناموفق بود");
    }
  };

  const hh = String(Math.floor(remaining / 3600)).padStart(2, "0");
  const mm = String(Math.floor((remaining % 3600) / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  const nonLeaderPaid = useMemo(() => {
    if (!data) return 0;
    const participants = Array.isArray(data.participants) ? data.participants : [];

    const hasJoined = (p: Participant) => {
      if (p.paid) return true;
      if (p.hasUser) return true;
      const username = (p.username || "").trim();
      if (username && username !== "@member") return true;
      const phone = (p.phone || "").trim();
      if (phone) return true;
      const telegramId = (p.telegramId || "").trim();
      if (telegramId) return true;
      return false;
    };

    return participants.reduce((acc, p) => {
      if (p.isLeader) return acc;
      return acc + (hasJoined(p) ? 1 : 0);
    }, 0);
  }, [data]);

  // button enablement for "اعلام تکمیل گروه"
  const canComplete =
    !!data && data.status === "ongoing" && remaining > 0 && nonLeaderPaid >= 1;

  // share disabled when expired or not ongoing
  const inviteDisabled =
    !data || data.status !== "ongoing" || remaining === 0;

  // Show progress relative to the "free" threshold
  const isSecondaryGroup = useMemo(() => {
    if (!data) return false;
    return Boolean(
      data.isSecondaryGroup === true ||
      String(data.groupType || '').toLowerCase() === 'secondary' ||
      String(data.kind || data.group?.kind || '').toLowerCase() === 'secondary'
    );
  }, [data]);

  const required = isSecondaryGroup ? 4 : 3; // secondary: 4 members max, regular: 3 for free
  const progressPct = Math.min(100, (nonLeaderPaid / required) * 100);

  // Compute secondary group totals (matching invite page logic)
  const computeSecondaryTotals = (friendsJoined: number, basketValue: number) => {
    if (basketValue <= 0) return { solo: 0, current: 0 };
    const cappedFriends = Math.max(0, Math.min(friendsJoined, 3));
    const quarter = basketValue / 4;
    const current = friendsJoined >= 4 ? 0 : basketValue - cappedFriends * quarter;
    return { solo: basketValue, current: Math.max(0, current) };
  };

  // Calculate current pricing: TRUST the API pricing for regular groups,
  // and only fall back when pricing is missing. This avoids double-calculation bugs.
  const currentPricing = useMemo(() => {
    if (!data) return { originalTotal: 0, currentTotal: 0 };

    const apiPricing = (data as any)?.pricing || {};

    // Base totals from API (what /api/groups/[groupId] already calculated)
    let originalTotal = Number(
      apiPricing.originalTotal ??
      (data as any)?.orderSummary?.originalPrice ??
      (data as any)?.initialPayment ??
      0
    );
    let currentTotal = Number(
      apiPricing.currentTotal ??
      (data as any)?.orderSummary?.finalItemsPrice ??
      apiPricing.expectedTotal ??
      originalTotal ??
      0
    );

    // Secondary groups: keep using dedicated helper so the explanatory text matches
    if (isSecondaryGroup) {
      const base = originalTotal > 0 ? originalTotal : Number((data as any)?.initialPayment ?? 0);
      const secondaryTotals = computeSecondaryTotals(nonLeaderPaid, Number(base || 0));
      return {
        originalTotal: Number(secondaryTotals.solo || 0),
        currentTotal: Number(secondaryTotals.current || 0),
      };
    }

    // Regular groups: enforce business rule → 3+ paid friends = free for leader
    // This is the CORE business logic and must override any API data
    if (!isSecondaryGroup && nonLeaderPaid >= 3) {
      currentTotal = 0;
    }

    return {
      originalTotal: Number(originalTotal || 0),
      currentTotal: Number(currentTotal || 0),
    };
  }, [data, isSecondaryGroup, nonLeaderPaid]);

  const buttonDisabledReason = !data
    ? ""
    : nonLeaderPaid < 1
    ? "برای اعلام تکمیل، حداقل یک عضو باید بپیوندد."
    : data.status !== "ongoing"
    ? "این گروه دیگر در جریان نیست."
    : remaining === 0
    ? "مهلت گروه به پایان رسیده است."
    : "";

  const handleComplete = async () => {
    try {
      if (!groupId) return;
      if (nonLeaderPaid < 1) {
        console.log(`[TRACK] Not enough paid followers: ${nonLeaderPaid}`);
        setToast("برای اعلام تکمیل، حداقل یک عضو باید بپیوندد.");
        return;
      }
      if (!confirm("آیا از تکمیل گروه اطمینان دارید؟")) return;

      console.log(`[TRACK] Calling finalize API for group ${groupId}`);
      // Finalize via API proxy
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      console.log(`[TRACK] API response status: ${res.status}`);
      
      if (!res.ok) {
        let friendly = "خطا در تکمیل گروه";
        try {
          const text = await res.text();
          // Try JSON first to extract backend-provided message
          try {
            const j = JSON.parse(text);
            const msg = j?.error || j?.detail || j?.message;
            if (msg && typeof msg === "string") friendly = msg;
          } catch {
            // Not JSON → show plain text if present
            if (text && text.trim().length > 0) friendly = text.trim();
          }
        } catch {}
        setToast(friendly);
        return;
      }
      
      const result = await res.json();
      console.log(`[TRACK] API success:`, result);
      
      setToast("گروه با موفقیت تکمیل شد.");
      // Signal home page to show result modal on next visits (persist across sessions)
      try {
        sessionStorage.setItem('gb-show-on-home', String(groupId));
        const key = 'gb-pending';
        const raw = localStorage.getItem(key);
        const list = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(list) || !list.includes(String(groupId))) {
          const next = Array.isArray(list) ? [...list, String(groupId)] : [String(groupId)];
          localStorage.setItem(key, JSON.stringify(next));
        }
        // Mark finalized for listeners in other tabs
        try { localStorage.setItem('gb-finalized', String(groupId)); } catch {}
        // Notify same-tab listeners
        try { window.dispatchEvent(new CustomEvent('gb-finalized', { detail: { groupId: String(groupId) } })); } catch {}
        // Notify parent page if inside iframe (Groups tab embeds Track)
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'gb-finalized', groupId: String(groupId) }, window.location.origin);
          }
        } catch {}
      } catch {}
      await load(); // re-fetch to get status=success
    } catch (e) {
      console.error(`[TRACK] Finalize error:`, e);
      setToast("خطا در تکمیل گروه");
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast("لینک کپی شد");
    } catch {
      setToast("کپی لینک ناموفق بود");
    }
  };

  // Determine if current user is the leader (robust: by id and phone fallback)
  const isLeader = useMemo(() => {
    try {
      if (!data) return false;
      const authUserId = user?.id != null ? String(user.id) : '';
      const leaderId = data?.leader?.id ? String(data.leader.id) : '';
      if (authUserId && leaderId && authUserId === leaderId) return true;

      const normalizePhone = (p?: string | null) => (p ? String(p).replace(/[^0-9]/g, '').slice(-10) : '');
      const userPhone = normalizePhone(user?.phone_number || '');
      const leaderPhoneFromParticipants = (() => {
        try {
          const arr = Array.isArray((data as any)?.participants) ? (data as any).participants : [];
          const lead = arr.find((m: any) => m && (m.isLeader === true || m.is_leader === true));
          return normalizePhone(lead?.phone);
        } catch { return ''; }
      })();
      if (userPhone && leaderPhoneFromParticipants && userPhone === leaderPhoneFromParticipants) return true;
      return false;
    } catch {
      return false;
    }
  }, [data, user?.id, user?.phone_number]);

  if (!data)
    return (
      <div dir="rtl" className="p-4">
        در حال بارگذاری...
      </div>
    );

  const expired = countdownReady && remaining === 0;
  const expiredSuccess = expired && nonLeaderPaid >= 1;
  const statusBanner =
    data.status === "success" || expiredSuccess
      ? { text: "گروه تشکیل شد. سفارش‌ها در حال پردازش هستند.", color: "bg-green-50 text-green-700 border-green-200" }
      : (expired && nonLeaderPaid === 0) || data.status === "failed"
      ? { text: "این گروه ناموفق شد.", color: "bg-gray-50 text-gray-700 border-gray-200" }
      : null;

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 p-4 space-y-4">

      {statusBanner && (
        <div
          className={`border ${statusBanner.color} text-sm px-3 py-2 rounded-lg`}
        >
          {statusBanner.text}
        </div>
      )}

      {/* Header timer + complete button */}
      <div className="flex items-center justify-between">
        <div className="font-bold">
          زمان باقیمانده برای تشکیل گروه: {hh}:{mm}:{ss}
        </div>
        {isLeader && (
          <button
            className={`text-sm px-3 py-1 rounded-full transition ${
              canComplete
                ? "bg-custom-pink text-white hover:bg-custom-pink"
                : "bg-gray-200 text-gray-600 cursor-not-allowed"
            }`}
            aria-disabled={!canComplete}
            disabled={!canComplete}
            onClick={() => canComplete && handleComplete()}
            title={!canComplete ? buttonDisabledReason : ""}
          >
            اعلام تکمیل گروه
          </button>
        )}
      </div>

      {/* Basket card */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="text-xs text-gray-500 text-right mb-2">
          <button
            type="button"
            className="underline"
            onClick={() => setShowBasket(true)}
          >
            مشاهده کامل سبد
          </button>
        </div>
        <div className="flex gap-3">
          {(data.basket || [])
            .slice(0, 4)
            .map((b, i) => (
              <button
                key={i}
                type="button"
                className="w-14 h-14 bg-gray-100 rounded-xl relative overflow-hidden"
                onClick={() => setShowBasket(true)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {b.image ? (
                  <img
                    src={b.image}
                    alt={b.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const fb = `https://picsum.photos/seed/${encodeURIComponent(b.productId || String(i))}/56/56`;
                      if (e.currentTarget.src !== fb) e.currentTarget.src = fb;
                    }}
                  />
                ) : (
                  <img
                    src={`https://picsum.photos/seed/${encodeURIComponent(b.productId || String(i))}/56/56`}
                    alt={b.name}
                    className="w-full h-full object-cover"
                  />
                )}
                <span className="absolute -top-2 -right-2 bg-custom-pink text-white text-[10px] rounded-full px-1">
                  {b.qty}
                </span>
              </button>
            ))}
          {(data.basket || []).length > 4 && (
            <button
              type="button"
              className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center text-xs"
              onClick={() => setShowBasket(true)}
            >
              +{(data.basket || []).length - 4}
            </button>
          )}
        </div>
      </div>

      {/* Invite / progress */}
      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <div className="text-right">
           {!data ? (
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            </div>
          ) : nonLeaderPaid === 1 ? (
            <p>تا الان ۱ نفر از دوستانت عضو گروه شده است.</p>
          ) : (
            <p>
              تا الان {nonLeaderPaid.toLocaleString('fa-IR')} نفر از دوستانت عضو گروه شده است.
            </p>
          )}
          {!data ? (
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-4/5"></div>
            </div>
          ) : isSecondaryGroup ? (
            <p>
              هر دوستی که دعوت می‌کنی یک چهارم هزینه‌ی اولیه ({currentPricing.originalTotal.toLocaleString("fa-IR")} تومان) را برمی‌گرداند؛ الان سهم تو {currentPricing.currentTotal === 0 ? 'رایگان' : `${currentPricing.currentTotal.toLocaleString("fa-IR")} تومان`} است.
            </p>
          ) : (
            <p>
              قیمت از {currentPricing.originalTotal.toLocaleString("fa-IR")} تومان به {currentPricing.currentTotal === 0 ? 'رایگان' : `${currentPricing.currentTotal.toLocaleString("fa-IR")} تومان`} کاهش یافت!
            </p>
          )}
          {data.status === "success" && (
            <div className="text-green-600 text-sm mt-1">
              این خرید گروهی به اتمام رسیده است.
            </div>
          )}
        </div>
        <div>
          <div className="flex justify-between text-[11px] text-gray-500 mb-1">
            {/* Optional helper text — you can compute remaining needed people */}
            <span>
              {Math.max(0, required - nonLeaderPaid)} دوست دیگر تا تکمیل
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded">
            <div
              className="h-2 bg-custom-pink rounded transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        {isLeader && (
          <button
            className={`w-full py-3 rounded-xl transition ${
              inviteDisabled
                ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                : "bg-custom-pink text-white hover:bg-custom-pink"
            }`}
            aria-disabled={inviteDisabled}
            onClick={() => !inviteDisabled && setShowShare(true)}
          >
            دعوت دوستان
          </button>
        )}
      </div>

      {/* Members card */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="font-semibold mb-3">لیست اعضای گروه</div>
        <div className="space-y-2">
          {!data ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse flex items-center space-x-2 space-x-reverse">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-20 mb-1"></div>
                    <div className="h-2 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="w-12 h-5 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : (data.participants || []).length === 0 ? (
            <div className="text-sm text-gray-500">
              هنوز کسی دعوت را نپذیرفته است.
            </div>
          ) : (
            (data.participants || []).map((m) => {
            const displayName =
              (m.phone || "").trim() ||
              (m.username || "").trim() ||
              (m.telegramId || "").trim() ||
              "کاربر ناشناس";
            return (
              <div key={m.id} className="flex items-center justify-between">
                <div className="text-sm">{displayName}</div>
                {m.isLeader && (
                  <span className="text-[11px] text-gray-500">لیدر</span>
                )}
              </div>
            );
          })
          )}
        </div>
      </div>

      {/* Basket modal */}
      {showBasket && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center"
          style={{ zIndex: 9999 }}
          onClick={() => setShowBasket(false)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] overflow-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-right text-sm text-gray-500 mb-3">
              جزئیات سبد
            </div>
            <div className="space-y-3">
              {(data.basket || []).map((it, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {it.image ? (
                      <img
                        src={it.image}
                        alt={it.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const fb = `https://picsum.photos/seed/${encodeURIComponent(it.productId || String(idx))}/48/48`;
                          if (e.currentTarget.src !== fb) e.currentTarget.src = fb;
                        }}
                      />
                    ) : (
                      <img
                        src={`https://picsum.photos/seed/${encodeURIComponent(it.productId || String(idx))}/48/48`}
                        alt={it.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 text-sm">
                    <div className="flex justify-between items-start w-full">
                      <span>
                        {it.name} × {it.qty}
                      </span>
                      {(() => {
                        const original = Number((it as any).unitPrice || 0) * Number(it.qty || 0);
                        let current = 0;

                        if (isSecondaryGroup) {
                          const itemBasketValue = original;
                          const itemSecondaryTotals = computeSecondaryTotals(nonLeaderPaid, itemBasketValue);
                          current = itemSecondaryTotals.current;
                        } else {
                          current = Number((it as any).discountedUnitPrice || 0) * Number(it.qty || 0);
                        }

                        return (
                          <div className="text-right">
                            <div className={original !== current ? 'line-through text-gray-400' : ''}>
                              {original.toLocaleString('fa-IR')} تومان
                            </div>
                            {original !== current && (
                              <div className="text-[11px] text-gray-700">
                                {current === 0 ? 'رایگان' : `${current.toLocaleString('fa-IR')} تومان`}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t pt-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span>قیمت کل</span>
                <span>
                  {currentPricing.originalTotal.toLocaleString("fa-IR")} تومان
                </span>
              </div>
              <div className="flex justify-between">
                <span>قیمت پس از تخفیف</span>
                <span>
                  {currentPricing.currentTotal.toLocaleString("fa-IR")} تومان
                </span>
              </div>
            </div>
            <div className="mt-4">
              <button
                className="w-full py-2 rounded-xl bg-gray-200"
                onClick={() => setShowBasket(false)}
              >
                بستن
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Share sheet (aligned with Invite page behavior) */}
      {showShare && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/40 flex items-end"
          style={{ zIndex: 9999 }}
          onClick={() => setShowShare(false)}
        >
          <div
            className="bg-white rounded-t-2xl w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Direct invite link with copy + open */}
            <div className="mb-4">
              <div className="text-right font-medium mb-2">لینک دعوت</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={resolvedInviteLink || ""}
                  onFocus={(e) => (e.currentTarget as HTMLInputElement).select()}
                  className="flex-1 border rounded px-2 py-2 text-sm"
                />
                <button
                  onClick={copyInviteLink}
                  className="px-3 py-2 rounded bg-gray-100 text-sm"
                >
                  کپی
                </button>
              </div>
              {resolvedInviteLink && (
                <a
                  className="text-custom-pink text-sm underline mt-2 inline-block"
                  href={resolvedInviteLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowShare(false)}
                >
                  باز کردن لینک دعوت
                </a>
              )}
              {copied && (
                <div className="text-green-600 text-xs mt-1">لینک کپی شد ✅</div>
              )}
            </div>

            {/* Share apps: Telegram, WhatsApp, Instagram (with deep-link fallbacks) */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <a
                href={`https://t.me/share/url?url=${encodedLanding}&text=${encodedMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  try { setShowShare(false); } catch {}
                  e.preventDefault();
                  const appUrl = `tg://msg?text=${encodeURIComponent(shareText)}`;
                  let deepLinkTried = false;
                  try {
                    (window as any).location.href = appUrl;
                    deepLinkTried = true;
                  } catch {}
                  setTimeout(() => {
                    try {
                      window.open(`https://t.me/share/url?url=${encodedLanding}&text=${encodedMsg}`, '_blank', 'noopener,noreferrer');
                    } catch {
                      (window as any).location.href = `https://t.me/share/url?url=${encodedLanding}&text=${encodedMsg}`;
                    }
                  }, deepLinkTried ? 500 : 300);
                }}
                className="flex flex-col items-center"
              >
                <span>تلگرام</span>
              </a>
              <a
                href={`https://wa.me/?text=${encodedMsg}%20${encodedLanding}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  try { setShowShare(false); } catch {}
                  const appUrl = `whatsapp://send?text=${encodedMsg}%20${encodedLanding}`;
                  try { (window as any).location.href = appUrl; } catch {}
                  setTimeout(() => {
                    try { window.open(`https://wa.me/?text=${encodedMsg}%20${encodedLanding}`, '_blank', 'noopener,noreferrer'); } catch {
                      (window as any).location.href = `https://wa.me/?text=${encodedMsg}%20${encodedLanding}`;
                    }
                  }, 400);
                }}
                className="flex flex-col items-center"
              >
                <span>واتساپ</span>
              </a>
              <a
                href={`https://www.instagram.com/?url=${encodedLanding}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => { try { setShowShare(false); } catch {} }}
                className="flex flex-col items-center"
              >
                <span>اینستاگرام</span>
              </a>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
