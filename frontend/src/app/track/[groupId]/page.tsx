"use client";
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useParams, useSearchParams } from "next/navigation";
import { useGroupBuyResult } from "@/components/providers/GroupBuyResultProvider";
import { generateInviteLink, generateShareUrl, extractInviteCode } from "@/utils/linkGenerator";
import { API_BASE_URL } from "@/utils/api";
import { safeStorage, safeSessionStorage } from "@/utils/safeStorage";
import { finalizeGroupBuy } from "@/utils/groupFinalize";
import "../track.css";
// Track page - Beautiful modern design v4 - force full rebuild

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
  const PUBLIC_API = API_BASE_URL;

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
        const infoRaw = safeStorage.getItem('groupOrderInfo');
        const byInfo = (() => {
          try { const i = infoRaw ? JSON.parse(infoRaw) : null; return i?.invite_code && String(i.invite_code).trim() === gidStr; } catch { return false; }
        })();
        const byPending = (() => {
          try { const p = safeStorage.getItem('gb-pending'); const arr = p ? JSON.parse(p) : []; return Array.isArray(arr) && arr.includes(gidStr); } catch { return false; }
        })();
        const byLeader = (() => {
          try { return Array.isArray((j as any)?.participants) && (j as any).participants.some((p: any) => p?.isLeader === true); } catch { return false; }
        })();
        const isMine = byInfo || byPending || byLeader;
        if (isMine) {
          const key = 'gb-my-active-groups';
          const raw = safeStorage.getItem(key);
          const list = raw ? JSON.parse(raw) : [];
          const next = Array.isArray(list) ? Array.from(new Set([...list, gidStr])) : [gidStr];
          safeStorage.setItem(key, JSON.stringify(next));
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
  
  // Web-site sharing: For all apps, put message FIRST then link so message appears above link.
  const encodedTextWithLink = encodeURIComponent(
    resolvedInviteLink ? `${shareMsg}\n${resolvedInviteLink}` : shareMsg
  );
  const encodedLanding = encodeURIComponent(resolvedInviteLink || "");

  const copyInviteLink = async () => {
    try {
      if (!resolvedInviteLink) return;
      // Copy both message and link (message above link) - matching invite page
      const textToCopy = `${shareMsg}\n${resolvedInviteLink}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const ta = document.createElement("textarea");
        ta.value = textToCopy;
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
  // Allow button to be enabled if countdown hasn't been initialized yet OR if there's time remaining
  const canComplete =
    !!data && data.status === "ongoing" && (!countdownReady || remaining > 0) && nonLeaderPaid >= 1;

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
      // IMPORTANT:
      // In production, nginx routes `/api/*` to the backend (not Next.js route handlers).
      // Backend `/api/groups/{id}` is GET-only, so POST returns 405.
      // We call backend finalize endpoint directly via API_BASE_URL to avoid 405.
      const res = await finalizeGroupBuy(groupId);
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
        safeSessionStorage.setItem('gb-show-on-home', String(groupId));
        const key = 'gb-pending';
        const raw = safeStorage.getItem(key);
        const list = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(list) || !list.includes(String(groupId))) {
          const next = Array.isArray(list) ? [...list, String(groupId)] : [String(groupId)];
          safeStorage.setItem(key, JSON.stringify(next));
        }
        // Mark finalized for listeners in other tabs
        safeStorage.setItem('gb-finalized', String(groupId));
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
      <div dir="rtl" className="track-page">
        <div className="timer-header" style={{ marginTop: 0 }}>
          <div className="timer-content">
            <div className="timer-label">در حال بارگذاری...</div>
            <div className="skeleton" style={{ width: 120, height: 28 }}></div>
          </div>
        </div>
        <div className="basket-card">
          <div className="basket-thumbs">
            {[1, 2, 3].map((i) => (
              <div key={i} className="basket-thumb skeleton"></div>
            ))}
          </div>
        </div>
        <div className="progress-card">
          <div className="skeleton" style={{ width: '80%', height: 20, marginBottom: 12 }}></div>
          <div className="skeleton" style={{ width: '60%', height: 16 }}></div>
        </div>
      </div>
    );

  const expired = countdownReady && remaining === 0;
  const expiredSuccess = expired && nonLeaderPaid >= 1;
  const statusBanner =
    data.status === "success" || expiredSuccess
      ? { text: "گروه تشکیل شد. سفارش‌ها در حال پردازش هستند.", type: "success", icon: "✓" }
      : (expired && nonLeaderPaid === 0) || data.status === "failed"
      ? { text: "این گروه ناموفق شد.", type: "failed", icon: "✕" }
      : null;

  return (
    <div dir="rtl" className={`track-page ${(showBasket || showShare) ? 'sheet-open' : ''}`}>

      {statusBanner && (
        <div className={`status-banner ${statusBanner.type}`}>
          <div className="icon">{statusBanner.icon}</div>
          <span>{statusBanner.text}</span>
        </div>
      )}

      {/* Header timer + complete button */}
      <div className="timer-header">
        <div className="timer-content">
          <div className="timer-label">زمان باقیمانده برای تشکیل گروه</div>
          <div className={`timer-value ${expired ? 'expired' : ''}`}>{hh}:{mm}:{ss}</div>
        </div>
        {isLeader && (
          <button
            className={`complete-btn ${canComplete ? 'active' : 'disabled'}`}
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
      <div className="basket-card">
        <div className="basket-header">
          <span className="basket-title">سبد خرید</span>
          <button
            type="button"
            className="view-basket-btn"
            onClick={() => setShowBasket(true)}
          >
            <span>مشاهده جزئیات</span>
            <span>←</span>
          </button>
        </div>
        <div className="basket-thumbs">
          {(data.basket || [])
            .slice(0, 4)
            .map((b, i) => (
              <button
                key={i}
                type="button"
                className="basket-thumb"
                onClick={() => setShowBasket(true)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {b.image ? (
                  <img
                    src={b.image}
                    alt={b.name}
                    onError={(e) => {
                      const fb = `https://picsum.photos/seed/${encodeURIComponent(b.productId || String(i))}/72/72`;
                      if (e.currentTarget.src !== fb) e.currentTarget.src = fb;
                    }}
                  />
                ) : (
                  <img
                    src={`https://picsum.photos/seed/${encodeURIComponent(b.productId || String(i))}/72/72`}
                    alt={b.name}
                  />
                )}
                <span className="qty-badge">{b.qty}</span>
              </button>
            ))}
          {(data.basket || []).length > 4 && (
            <button
              type="button"
              className="basket-more"
              onClick={() => setShowBasket(true)}
            >
              +{(data.basket || []).length - 4}
            </button>
          )}
        </div>
      </div>

      {/* Progress card */}
      <div className="progress-card">
        <div className="progress-info">
          {nonLeaderPaid === 1 ? (
            <p>تا الان <span className="highlight">۱ نفر</span> از دوستانت عضو گروه شده است.</p>
          ) : (
            <p>
              تا الان <span className="highlight">{nonLeaderPaid.toLocaleString('fa-IR')} نفر</span> از دوستانت عضو گروه شده است.
            </p>
          )}
          {isSecondaryGroup ? (
            <p>
              هر دوستی که دعوت می‌کنی یک چهارم هزینه‌ی اولیه را برمی‌گرداند
            </p>
          ) : null}
          <div className="price-change">
            <span className="original-price">{currentPricing.originalTotal.toLocaleString("fa-IR")} تومان</span>
            <span className="arrow">←</span>
            {currentPricing.currentTotal === 0 ? (
              <span className="free-badge">رایگان!</span>
            ) : (
              <span className="current-price">{currentPricing.currentTotal.toLocaleString("fa-IR")} تومان</span>
            )}
          </div>
          {data.status === "success" && (
            <div className="success-msg">
              <span>✓</span>
              این خرید گروهی به اتمام رسیده است.
            </div>
          )}
        </div>
        <div className="progress-bar-wrapper">
          <div className="progress-label">
            <span>{Math.max(0, required - nonLeaderPaid)} دوست دیگر تا تکمیل</span>
            <span>{nonLeaderPaid} از {required}</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        {isLeader && (
          <button
            className={`invite-btn ${inviteDisabled ? 'disabled' : ''}`}
            aria-disabled={inviteDisabled}
            onClick={() => !inviteDisabled && setShowShare(true)}
          >
            🎉 دعوت دوستان
          </button>
        )}
      </div>

      {/* Members card */}
      <div className="members-card">
        <div className="members-header">
          <div className="members-icon">👥</div>
          <span className="members-title">اعضای گروه</span>
          <span className="members-count">{(data.participants || []).length} نفر</span>
        </div>
        <div className="members-list">
          {(data.participants || []).length === 0 ? (
            <div className="empty-members">
              <div className="icon">🔗</div>
              <p>هنوز کسی دعوت را نپذیرفته است.</p>
              <p>لینک دعوت را با دوستانت به اشتراک بگذار!</p>
            </div>
          ) : (
            (data.participants || []).map((m, idx) => {
            const displayName =
              (m.username && m.username !== '@member' && m.username.trim() !== '')
                ? m.username
                : (m.phone || "").trim() ||
                  (m.telegramId || "").trim() ||
                  "کاربر ناشناس";
            const initials = displayName.charAt(0).toUpperCase();
            return (
              <div key={m.id || `member-${idx}`} className="member-item">
                <div className={`member-avatar ${m.isLeader ? 'leader' : ''}`}>
                  {m.isLeader ? '👑' : initials}
                </div>
                <div className="member-info">
                  <div className="member-name">{displayName}</div>
                </div>
                {m.isLeader ? (
                  <span className="member-badge leader">لیدر</span>
                ) : (
                  <span className="member-badge joined">عضو شده</span>
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
          className="modal-overlay"
          onClick={() => setShowBasket(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-handle"></div>
            <div className="modal-header">
              <h4 className="modal-title">🛒 جزئیات سبد خرید</h4>
              <button className="modal-close" onClick={() => setShowBasket(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="basket-list">
                {(data.basket || []).map((it, idx) => (
                  <div key={idx} className="basket-item">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {it.image ? (
                      <img
                        src={it.image}
                        alt={it.name}
                        className="basket-item-img"
                        onError={(e) => {
                          const fb = `https://picsum.photos/seed/${encodeURIComponent(it.productId || String(idx))}/64/64`;
                          if (e.currentTarget.src !== fb) e.currentTarget.src = fb;
                        }}
                      />
                    ) : (
                      <img
                        src={`https://picsum.photos/seed/${encodeURIComponent(it.productId || String(idx))}/64/64`}
                        alt={it.name}
                        className="basket-item-img"
                      />
                    )}
                    <div className="basket-item-info">
                      <div className="basket-item-name">{it.name}</div>
                      <span className="basket-item-qty">تعداد: {it.qty}</span>
                    </div>
                    <div className="basket-item-price">
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
                          <>
                            {original !== current && (
                              <span className="original">{original.toLocaleString('fa-IR')} تومان</span>
                            )}
                            <span className="current">
                              {current === 0 ? 'رایگان' : `${current.toLocaleString('fa-IR')} تومان`}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
              <div className="basket-total">
                <div className="basket-total-row">
                  <span>قیمت اولیه</span>
                  <span>{currentPricing.originalTotal.toLocaleString("fa-IR")} تومان</span>
                </div>
                <div className="basket-total-row final">
                  <span>قیمت نهایی شما</span>
                  <span className="value">
                    {currentPricing.currentTotal === 0 ? 'رایگان! 🎉' : `${currentPricing.currentTotal.toLocaleString("fa-IR")} تومان`}
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="close-modal-btn"
                onClick={() => setShowBasket(false)}
              >
                بستن
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Share Sheet (matching Invite page structure exactly) */}
      <aside
        className={`sheet ${showShare ? 'open' : ''}`}
        onClick={(e) => e.target === e.currentTarget && setShowShare(false)}
      >
        <header>
          <div className="sheet-handle" />
          <button className="close" onClick={() => setShowShare(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <h4>دعوت دوستان</h4>
        </header>

        <div className="share-apps">
          {/* Telegram */}
          <a
            className="telegram"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              try { setShowShare(false); } catch {}
              // Telegram: use tg://msg?text=... with "message\nlink" so message appears ABOVE link
              const deepLink = `tg://msg?text=${encodedTextWithLink}`;
              window.location.href = deepLink;
              // Fallback to web share after short delay
              setTimeout(() => {
                const webUrl = `https://t.me/share/url?text=${encodedTextWithLink}`;
                try {
                  window.open(webUrl, '_blank', 'noopener,noreferrer');
                } catch {
                  window.location.href = webUrl;
                }
              }, 350);
            }}
          >
            <div className="icon-wrapper">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.67-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.25.38-.51 1.07-.78 4.19-1.82 6.99-3.03 8.39-3.61 4-1.68 4.83-1.97 5.37-1.98.12 0 .39.03.56.17.15.12.19.28.21.45-.01.06.01.24 0 .38z"/></svg>
            </div>
            <span>تلگرام</span>
          </a>

          {/* WhatsApp */}
          <a
            className="whatsapp"
            href={`https://wa.me/?text=${encodedTextWithLink}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              try { setShowShare(false); } catch {}
              const appUrl = `whatsapp://send?text=${encodedTextWithLink}`;
              try { (window as any).location.href = appUrl; } catch {}
              setTimeout(() => {
                try { window.open(`https://wa.me/?text=${encodedTextWithLink}`, '_blank', 'noopener,noreferrer'); } catch {
                  (window as any).location.href = `https://wa.me/?text=${encodedTextWithLink}`;
                }
              }, 400);
            }}
          >
            <div className="icon-wrapper">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </div>
            <span>واتساپ</span>
          </a>

          {/* Instagram - copy link to clipboard since Instagram doesn't support direct share URLs */}
          <a
            className="instagram"
            href="#"
            onClick={async (e) => {
              e.preventDefault();
              try { setShowShare(false); } catch {}
              // Instagram doesn't support share URLs, so copy text+link to clipboard
              const textToCopy = resolvedInviteLink ? `${shareMsg}\n${resolvedInviteLink}` : shareMsg;
              try {
                await navigator.clipboard.writeText(textToCopy);
                setCopied(true);
                setToast("لینک کپی شد");
                setTimeout(() => setCopied(false), 1500);
              } catch {}
              // Open Instagram app/website
              window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
            }}
          >
            <div className="icon-wrapper">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </div>
            <span>اینستاگرام</span>
          </a>

          {/* SMS - use proper format for cross-device compatibility */}
          <a
            className="sms"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              try { setShowShare(false); } catch {}
              // iOS format: sms:&body=  |  Android format: sms:?body=
              const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
              const smsUrl = isIOS 
                ? `sms:&body=${encodedTextWithLink}`
                : `sms:?body=${encodedTextWithLink}`;
              window.location.href = smsUrl;
            }}
          >
            <div className="icon-wrapper">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
            </div>
            <span>پیامک</span>
          </a>
        </div>
      </aside>

      {/* Toast notification */}
      {toast && (
        <div className="toast">{toast}</div>
      )}
    </div>
  );
}
