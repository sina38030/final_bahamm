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

  const encodedLanding = encodeURIComponent(resolvedInviteLink || "");
  const encodedMsg = encodeURIComponent(shareText);

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

      {/* Share sheet */}
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

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2 rounded-lg shadow-md text-sm bg-gray-800 text-white">
          {toast}
        </div>
      )}
    </div>
  );
}

