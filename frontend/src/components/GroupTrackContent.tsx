"use client";
import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";

type GroupStatus = "ongoing" | "success" | "failed";

interface Participant {
  id: string;
  username?: string | null;
  phone?: string | null;
  telegramId?: string | null;
  isLeader: boolean;
  hasUser?: boolean;
  paid?: boolean;
}

interface GroupTrackData {
  id: string;
  leader: { id: string; username: string };
  expiresAt: string | null;
  createdAt: string | null;
  status: GroupStatus;
  minJoinersForSuccess: number;
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
  isSecondaryGroup?: boolean;
  groupType?: 'secondary' | 'regular';
  kind?: string;
  group?: { kind?: string };
}

interface GroupTrackContentProps {
  data: GroupTrackData | null;
  timeLeftSec: number;
  countdownReady: boolean;
  isLeader: boolean;
  onComplete?: () => Promise<void>;
  onCopyInvite?: () => Promise<void>;
  resolvedInviteLink?: string;
  shareText?: string;
  canComplete?: boolean;
  inviteDisabled?: boolean;
}

export default function GroupTrackContent({
  data,
  timeLeftSec,
  countdownReady,
  isLeader,
  onComplete,
  onCopyInvite,
  resolvedInviteLink = "",
  shareText = "",
  canComplete = false,
  inviteDisabled = false,
}: GroupTrackContentProps) {
  const [showBasket, setShowBasket] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string>("");

  const remaining = timeLeftSec;
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

  const isSecondaryGroup = useMemo(() => {
    if (!data) return false;
    return Boolean(
      data.isSecondaryGroup === true ||
      String(data.groupType || '').toLowerCase() === 'secondary' ||
      String(data.kind || data.group?.kind || '').toLowerCase() === 'secondary'
    );
  }, [data]);

  const required = isSecondaryGroup ? 4 : 3;
  const progressPct = Math.min(100, (nonLeaderPaid / required) * 100);

  const computeSecondaryTotals = (friendsJoined: number, basketValue: number) => {
    if (basketValue <= 0) return { solo: 0, current: 0 };
    const cappedFriends = Math.max(0, Math.min(friendsJoined, 3));
    const quarter = basketValue / 4;
    const current = friendsJoined >= 4 ? 0 : basketValue - cappedFriends * quarter;
    return { solo: basketValue, current: Math.max(0, current) };
  };

  const currentPricing = useMemo(() => {
    if (!data) return { originalTotal: 0, currentTotal: 0 };

    // DIRECT use of API pricing data - trust it completely
    const apiPricing = (data as any)?.pricing;
    if (apiPricing && typeof apiPricing.originalTotal === 'number' && typeof apiPricing.currentTotal === 'number') {
      console.log(`[GroupTrackContent] Using API pricing directly:`, apiPricing);
      return {
        originalTotal: apiPricing.originalTotal,
        currentTotal: apiPricing.currentTotal
      };
    }

    // Fallback: compute from basket only if API didn't provide pricing
    const basket = Array.isArray((data as any)?.basket) ? (data as any).basket : [];
    const basketOriginal = basket.reduce((sum: number, it: any) => sum + Number(it?.unitPrice || 0) * Number(it?.qty || 0), 0);
    const basketCurrentRegular = basket.reduce((sum: number, it: any) => sum + Number((it?.discountedUnitPrice ?? it?.unitPrice) || 0) * Number(it?.qty || 0), 0);

    if (isSecondaryGroup) {
      const base = basketOriginal;
      const secondaryTotals = computeSecondaryTotals(nonLeaderPaid, Number(base || 0));
      return {
        originalTotal: Number(secondaryTotals.solo || 0),
        currentTotal: Number(secondaryTotals.current || 0)
      };
    }

    let outOriginal = basketOriginal;
    let outCurrent = basketCurrentRegular > 0 ? basketCurrentRegular : basketOriginal;

    // Regular groups become free for the leader as soon as 3 paid friends join
    if (!isSecondaryGroup && nonLeaderPaid >= 3) {
      outCurrent = 0;
    }

    console.log(`[GroupTrackContent] Computed from basket:`, { outOriginal, outCurrent, nonLeaderPaid });
    return {
      originalTotal: Number(outOriginal || 0),
      currentTotal: Number(outCurrent || 0)
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
      if (onCopyInvite) await onCopyInvite();
    } catch {
      setCopied(false);
      setToast("کپی لینک ناموفق بود");
    }
  };

  if (!data) {
    return (
      <div dir="rtl" className="p-4">
        در حال بارگذاری...
      </div>
    );
  }

  const expired = countdownReady && remaining === 0;
  const expiredSuccess = expired && nonLeaderPaid >= 1;
  const statusBanner =
    data.status === "success" || expiredSuccess
      ? { text: "گروه تشکیل شد. سفارش‌ها در حال پردازش هستند.", color: "bg-green-50 text-green-700 border-green-200" }
      : (expired && nonLeaderPaid === 0) || data.status === "failed"
      ? { text: "این گروه ناموفق شد.", color: "bg-gray-50 text-gray-700 border-gray-200" }
      : null;

  // Web-site sharing: For all apps, put message FIRST then link so message appears above link.
  const shareMsg = "بیا با هم سبد رو بخریم تا رایگان بگیریم!";
  const encodedTextWithLink = encodeURIComponent(
    resolvedInviteLink ? `${shareMsg}\n${resolvedInviteLink}` : shareMsg
  );
  const encodedLanding = encodeURIComponent(resolvedInviteLink || "");

  return (
    <div dir="rtl" className="bg-gray-50 p-4 space-y-4">
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
        {isLeader && onComplete && (
          <button
            className={`text-sm px-3 py-1 rounded-full transition ${
              canComplete
                ? "bg-custom-pink text-white hover:bg-custom-pink"
                : "bg-gray-200 text-gray-600 cursor-not-allowed"
            }`}
            aria-disabled={!canComplete}
            disabled={!canComplete}
            onClick={() => canComplete && onComplete()}
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
              قیمت از {currentPricing.originalTotal.toLocaleString("fa-IR")} تومان به {currentPricing.currentTotal === 0 ? 'رایگان' : `${currentPricing.currentTotal.toLocaleString("fa-IR")} تومان`} کاهش یافته!
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
            (data.participants || []).map((m, idx) => {
              // Use username as primary display name (Telegram username/ID or fallback)
              // Fallback to phone if username is just '@member' or empty
              const displayName = (m.username && m.username !== '@member' && m.username.trim() !== '')
                ? m.username
                : (m.phone || "").trim() || "کاربر ناشناس";
              return (
                <div key={m.id || `participant-${idx}`} className="flex items-center justify-between">
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

      {/* Share sheet (matching Invite page exactly) */}
      {showShare && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
            style={{ zIndex: 9998 }}
            onClick={() => setShowShare(false)}
          />
          {/* Bottom Sheet */}
          <div
            className="fixed inset-x-0 bottom-0 bg-white rounded-t-[32px] shadow-[0_-12px_50px_rgba(0,0,0,0.15)] max-h-[85vh] overflow-y-auto animate-slide-up"
            style={{ zIndex: 9999 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-9 h-1 bg-gray-300 rounded-full" />
            
            {/* Header */}
            <div className="flex justify-center items-center pt-5 pb-3 relative">
              <button 
                className="absolute right-4 top-3 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                onClick={() => setShowShare(false)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <h4 className="text-base font-bold text-gray-900 mt-1">دعوت دوستان</h4>
            </div>

            {/* Share Apps Grid */}
            <div className="flex justify-center gap-5 px-4 py-6">
              {/* Telegram */}
              <a
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
                className="flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-transform hover:-translate-y-1 active:scale-95"
              >
                <div className="w-[60px] h-[60px] rounded-2xl bg-gradient-to-br from-[#2AABEE] to-[#229ED9] flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-500" />
                  <svg className="w-[26px] h-[26px] text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.67-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.25.38-.51 1.07-.78 4.19-1.82 6.99-3.03 8.39-3.61 4-1.68 4.83-1.97 5.37-1.98.12 0 .39.03.56.17.15.12.19.28.21.45-.01.06.01.24 0 .38z"/></svg>
                </div>
                <span className="text-[11px] font-bold text-gray-700">تلگرام</span>
              </a>

              {/* WhatsApp */}
              <a
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
                className="flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-transform hover:-translate-y-1 active:scale-95"
              >
                <div className="w-[60px] h-[60px] rounded-2xl bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-500" />
                  <svg className="w-[26px] h-[26px] text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </div>
                <span className="text-[11px] font-bold text-gray-700">واتساپ</span>
              </a>

              {/* Instagram */}
              <a
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
                className="flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-transform hover:-translate-y-1 active:scale-95"
              >
                <div className="w-[60px] h-[60px] rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all overflow-hidden relative" style={{ background: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)' }}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-500" />
                  <svg className="w-[26px] h-[26px] text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </div>
                <span className="text-[11px] font-bold text-gray-700">اینستاگرام</span>
              </a>

              {/* SMS */}
              <a
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
                className="flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-transform hover:-translate-y-1 active:scale-95"
              >
                <div className="w-[60px] h-[60px] rounded-2xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-500" />
                  <svg className="w-[26px] h-[26px] text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
                </div>
                <span className="text-[11px] font-bold text-gray-700">پیامک</span>
              </a>
            </div>
          </div>

          {/* Animation style */}
          <style>{`
            @keyframes slide-up {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
            .animate-slide-up {
              animation: slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
          `}</style>
        </>,
        document.body
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2 rounded-lg shadow-md text-sm bg-gray-800 text-white">
          {toast}
        </div>
      )}
    </div>
  );
}

