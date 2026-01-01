'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import '../invite/invite.css';
import { useAuth } from '@/contexts/AuthContext';
import { generateInviteLink, generateShareUrl, extractInviteCode, isTelegramMiniApp } from '@/utils/linkGenerator';
import { API_BASE_URL } from '@/utils/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTelegram, faWhatsapp, faInstagram } from '@fortawesome/free-brands-svg-icons';
import { faCommentSms, faCopy, faCheck, faShareNodes } from '@fortawesome/free-solid-svg-icons';

interface BasketItem {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  discountedUnitPrice: number;
  image?: string;
  friend_1_price?: number;
  friend_2_price?: number;
  friend_3_price?: number;
  solo_price?: number;
}

interface GroupData {
  id: string;
  status: string;
  expiresAt: string | null;
  expiresAtMs?: number;
  remainingSeconds?: number;
  participants: Array<{
    id: string;
    username: string;
    isLeader: boolean;
    paid?: boolean;
  }>;
  basket: BasketItem[];
  pricing: {
    originalTotal: number;
    currentTotal: number;
    expectedTotal: number;
  };
  invite: {
    shareUrl: string;
  };
  isSecondaryGroup: boolean;
  groupType: string;
}

function SecondaryInvitePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, isAuthenticated } = useAuth();
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [basketSheetOpen, setBasketSheetOpen] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expiryMs, setExpiryMs] = useState<number | null>(null);
  const [inviteDisabled, setInviteDisabled] = useState(false);
  const [productImages, setProductImages] = useState<Record<string, string>>({});

  // Fetch product images from API
  useEffect(() => {
    const fetchProductImages = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/products`, { cache: 'no-store' });
        const products = await response.json();
        if (Array.isArray(products)) {
          const imageMap: Record<string, string> = {};
          products.forEach((product: any) => {
            if (product.id && product.images && product.images.length > 0) {
              imageMap[String(product.id)] = product.images[0];
            }
          });
          setProductImages(imageMap);
        }
      } catch (err) {
        console.log('[SecondaryInvite] Failed to fetch product images:', err);
      }
    };
    fetchProductImages();
  }, []);

  // Helper function to get product image URL
  const getProductImageUrl = (item: BasketItem) => {
    // First check if image exists in item
    if (item.image && item.image.trim() !== '' && item.image !== 'null' && !item.image.includes('undefined')) {
      if (item.image.startsWith('/')) {
        return `${API_BASE_URL}${item.image}`;
      }
      if (item.image.startsWith('http')) {
        return item.image;
      }
    }
    // Try to get from productImages map
    if (item.productId && productImages[item.productId]) {
      return productImages[item.productId];
    }
    // Fallback to local placeholder or data URI
    return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect fill="#E5006A" width="300" height="300"/><text fill="#FFFFFF" font-family="Arial" font-size="24" x="50%" y="50%" text-anchor="middle" dy=".3em">${item.name.slice(0, 8)}</text></svg>`)}`;
  };

  // Convert numbers to Persian digits
  const toFa = (n: number | string) => n.toString().replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)]);

  // Fetch secondary group data
  useEffect(() => {
    const groupId = searchParams.get('group_id');
    
    if (!groupId) {
      setError('پارامتر group_id یافت نشد');
      setLoading(false);
      return;
    }

    const fetchGroupData = async (retryCount = 0) => {
      try {
        const response = await fetch(`${API_BASE_URL}/groups/${groupId}`, { cache: 'no-store' });
        const data = await response.json();

        if (data && data.id) {
          setGroupData(data);
          setLoading(false);
          
          // Show success banner for newly created groups
          const fromParam = searchParams.get('from');
          if (fromParam === 'created') {
            setShowSuccess(true);
            setTimeout(() => {
              setShowSuccess(false);
            }, 4000);
          }
          
          // Set expiry time
          if (data.expiresAtMs) {
            setExpiryMs(data.expiresAtMs);
          } else if (data.remainingSeconds != null) {
            setExpiryMs(Date.now() + data.remainingSeconds * 1000);
          } else if (data.expiresAt) {
            const parsed = Date.parse(data.expiresAt);
            if (!Number.isNaN(parsed)) {
              setExpiryMs(parsed);
            }
          }
          
          // Check if invite should be disabled
          const status = String(data.status || '').toLowerCase();
          if (status !== 'ongoing') {
            setInviteDisabled(true);
          }
        } else {
          if (retryCount < 3) {
            console.log(`[SecondaryInvite] Group not ready yet, retrying in ${1000 * (retryCount + 1)}ms (attempt ${retryCount + 1}/3)`);
            setTimeout(() => fetchGroupData(retryCount + 1), 1000 * (retryCount + 1));
            return;
          }
          setError(data.error || 'خطا در دریافت اطلاعات گروه');
          setLoading(false);
        }
      } catch (err) {
        if (retryCount < 1) {
          console.log('[SecondaryInvite] Network error, retrying once...');
          setTimeout(() => fetchGroupData(retryCount + 1), 1500);
          return;
        }
        setError('خطا در اتصال به سرور');
        setLoading(false);
      }
    };

    fetchGroupData();
  }, [searchParams]);

  // Countdown timer
  useEffect(() => {
    if (!expiryMs) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiryMs - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiryMs]);

  // Format timer display (24:00:00 format)
  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return toFa(
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    );
  };

  // Calculate progress for secondary groups
  const nonLeaderPaid = useMemo(() => {
    if (!groupData) return 0;
    return groupData.participants.filter(p => !p.isLeader && p.paid).length;
  }, [groupData]);

  const requiredMembers = 4; // Secondary groups need 4 members for free

  // Compute secondary group pricing
  const computeSecondaryTotals = (friendsJoined: number, basketValue: number) => {
    if (basketValue <= 0) return { solo: 0, current: 0 };
    const cappedFriends = Math.max(0, Math.min(friendsJoined, 3));
    const quarter = basketValue / 4;
    const current = friendsJoined >= 4 ? 0 : basketValue - cappedFriends * quarter;
    return { solo: basketValue, current: Math.max(0, current) };
  };

  const originalTotal = groupData?.pricing?.originalTotal || 0;
  
  // Calculate the amount user paid (sum of friend_1_price for all items in basket)
  const userPaidAmount = useMemo(() => {
    if (!groupData?.basket) return 0;
    return groupData.basket.reduce((sum, item) => {
      const price = item.friend_1_price || item.unitPrice || 0;
      return sum + (price * item.qty);
    }, 0);
  }, [groupData]);
  
  const currentTotal = useMemo(() => {
    if (!groupData) return 0;
    const { solo, current } = computeSecondaryTotals(nonLeaderPaid, originalTotal);
    return current;
  }, [groupData, nonLeaderPaid, originalTotal]);

  // Generate invite link for the secondary group
  const resolvedInviteLink = useMemo(() => {
    if (!groupData) return '';
    
    // First try the shareUrl from the API
    if (groupData.invite?.shareUrl) {
      const code = extractInviteCode(groupData.invite.shareUrl);
      if (code) return generateInviteLink(code);
      return groupData.invite.shareUrl;
    }
    
    // Fallback: generate link from group ID
    const inviteCode = `GB${groupData.id}`;
    return generateInviteLink(inviteCode);
  }, [groupData]);

  const shareMsg = 'بیا با هم سبد رو بخریم تا رایگان بگیریم!';
  // For Telegram: put message FIRST then link so message appears above link
  const encodedTextWithLink = encodeURIComponent(
    resolvedInviteLink ? `${shareMsg}\n${resolvedInviteLink}` : shareMsg
  );
  const encodedLanding = encodeURIComponent(resolvedInviteLink || '');

  const copyInviteLink = async () => {
    try {
      if (!resolvedInviteLink) return;
      // Copy both message and link (message above link)
      const textToCopy = `${shareMsg}\n${resolvedInviteLink}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const ta = document.createElement('textarea');
        ta.value = textToCopy;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) {
      setCopied(false);
    }
  };

  const closeSheets = () => {
    setBasketSheetOpen(false);
    setShareSheetOpen(false);
  };

  const handleShareClick = () => {
    if (inviteDisabled) return;
    setShareSheetOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-12 h-12 bg-gray-300 rounded-full mx-auto mb-4"></div>
          <p>در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">خطا در بارگذاری</h2>
          <p className="text-gray-600 text-sm mb-4">{error}</p>
          <button 
            onClick={() => router.push('/groups-orders')}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            بازگشت به سفارشات
          </button>
        </div>
      </div>
    );
  }

  if (!groupData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>گروه یافت نشد</p>
      </div>
    );
  }

  const totalItems = groupData.basket.reduce((sum, item) => sum + item.qty, 0);
  const groupStatus = String(groupData.status || '').toLowerCase();

  return (
    <>
      {/* Success banner for newly created secondary groups */}
      {showSuccess && (
        <div className="success-banner" role="status" aria-live="polite">
          <div className="success-content">
            <div className="success-title">گروه شما با موفقیت ایجاد شد ✅</div>
            <div className="success-details">
              <div>
                <span>حالا دوستانت رو دعوت کن تا پرداختت برگرده!</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className={`invite-page ${(basketSheetOpen || shareSheetOpen) ? 'sheet-open' : ''}`}
        onClick={(e) => {
          if ((basketSheetOpen || shareSheetOpen) && e.target === e.currentTarget) {
            closeSheets();
          }
        }}
      >
        {/* Header with Timer */}
        <header className="header">
          <button className="home-btn" onClick={() => router.push('/')}>
            <i className="fa-solid fa-house-chimney"></i>
          </button>

          <h2>
            حالا وقتشه دوستات رو دعوت کنی تا پرداختت
            <span className="free"> برگرده!</span>
          </h2>

          <div className="timer-wrapper">
            <span className="label">⏰ زمان باقیمانده:</span>
            <span className="timer">{formatTimer(timeLeft)}</span>
          </div>
        </header>

        {/* Basket Card */}
        <section className="basket-card">
          <button className="view-btn" onClick={() => setBasketSheetOpen(true)}>
            مشاهدهٔ کامل سبد ({toFa(totalItems)} کالا)
          </button>
          <div className="thumbs">
            {groupData.basket.slice(0, 5).map((item, index) => (
              <img 
                key={index} 
                src={getProductImageUrl(item)} 
                alt={item.name}
                onError={(e) => {
                  e.currentTarget.src = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect fill="#E5006A" width="300" height="300"/><text fill="#FFFFFF" font-family="Arial" font-size="24" x="50%" y="50%" text-anchor="middle" dy=".3em">${item.name.slice(0, 8)}</text></svg>`)}`;
                }}
              />
            ))}
          </div>
        </section>

        {/* Progress Card */}
        <section className="discount-card">
          <div className="text-right">
            <p>
              {nonLeaderPaid === 0
                ? 'تا زمان تموم نشده دوستات رو دعوت کن!'
                : nonLeaderPaid === 1
                  ? 'تا الان ۱ نفر از دوستانت عضو گروه شده است.'
                  : `تا الان ${toFa(nonLeaderPaid.toLocaleString())} نفر از دوستانت عضو گروه شده‌اند.`}
            </p>
            <p style={{ color: '#E5006A', fontWeight: 'bold', marginTop: '4px' }}>
              {toFa(Math.round(nonLeaderPaid * (userPaidAmount / 4)).toLocaleString())} تومن از سفارشت برمیگرده!
            </p>
            {(groupStatus === 'success' || groupStatus === 'failed') && (
              <div className={`text-sm mt-1 ${groupStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {groupStatus === 'success' ? 'این خرید گروهی به اتمام رسیده است.' : 'این خرید گروهی ناموفق بوده است.'}
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
            <span>{toFa(Math.max(0, requiredMembers - nonLeaderPaid).toLocaleString())} دوست دیگر تا برگشت کامل پرداختیت!</span>
          </div>
          <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ height: '8px', width: `${Math.min(100, ((nonLeaderPaid + 1) / (requiredMembers + 1)) * 100)}%`, background: 'var(--pink)', borderRadius: '6px', transition: 'width .3s' }} />
          </div>

          <div className="invite-actions">
            <button
              className={`invite-btn${inviteDisabled ? ' disabled' : ''}`}
              onClick={handleShareClick}
              disabled={inviteDisabled}
              aria-disabled={inviteDisabled}
              title="اشتراک‌گذاری لینک دعوت"
            >
              <FontAwesomeIcon icon={faShareNodes} style={{ marginLeft: '8px' }} />
              دعوت دوستان
            </button>
          </div>
        </section>

        {/* Description Card */}
        <section className="description-card">
          <h3>توضیحات</h3>
          <p>
            • با دعوت هر دوست، یک چهارم پرداختت برمی‌گرده!<br />
            • ۴ دوست = پرداختت کامل رایگان!<br />
            • هزینهٔ ارسال به عهدهٔ مشتری است.<br />
            • لغو سفارش پس از ۷ روز امکان‌پذیر نیست.<br />
            • مهلت دعوت دوستان ۲۴ ساعت است.
          </p>
        </section>
      </div>

      {/* Basket Sheet */}
      <aside 
        className={`sheet ${basketSheetOpen ? 'open' : ''}`} 
        onClick={(e) => e.target === e.currentTarget && closeSheets()}
      >
        <header>
          <h4>{toFa(totalItems)} کالا در سبد</h4>
          <button className="close" onClick={closeSheets}>&times;</button>
        </header>
        <ul className="basket-list">
          {groupData.basket.map((item, index) => (
            <li key={index} className="basket-item">
              <img 
                src={getProductImageUrl(item)} 
                alt={item.name}
                onError={(e) => {
                  e.currentTarget.src = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect fill="#E5006A" width="300" height="300"/><text fill="#FFFFFF" font-family="Arial" font-size="24" x="50%" y="50%" text-anchor="middle" dy=".3em">${item.name.slice(0, 8)}</text></svg>`)}`;
                }}
              />
              <div className="info">
                <div className="name">{item.name}</div>
                <div className="qty">تعداد: {toFa(item.qty)}</div>
              </div>
              <div className="price">
                {item.unitPrice > item.discountedUnitPrice && (
                  <s>{toFa(Math.round(item.unitPrice * item.qty).toLocaleString())}&nbsp;تومان</s>
                )}
                <span className="new">{toFa(Math.round(item.discountedUnitPrice * item.qty).toLocaleString())}&nbsp;تومان</span>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      {/* Share Sheet */}
      <aside
        className={`sheet ${shareSheetOpen ? 'open' : ''}`}
        onClick={(e) => e.target === e.currentTarget && closeSheets()}
      >
        <header>
          <div className="sheet-handle" />
          <button className="close" onClick={closeSheets}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <h4>دعوت از طریق:</h4>
        </header>

        <div className="share-apps">
          {/* Telegram */}
          <a
            className="telegram"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              try { setShareSheetOpen(false); } catch {}
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
              <FontAwesomeIcon icon={faTelegram} />
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
              try { setShareSheetOpen(false); } catch {}
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
              <FontAwesomeIcon icon={faWhatsapp} />
            </div>
            <span>واتساپ</span>
          </a>

          {/* Instagram - copy link to clipboard since Instagram doesn't support direct share URLs */}
          <a
            className="instagram"
            href="#"
            onClick={async (e) => {
              e.preventDefault();
              try { setShareSheetOpen(false); } catch {}
              // Instagram doesn't support share URLs, so copy text+link to clipboard
              const textToCopy = resolvedInviteLink ? `${shareMsg}\n${resolvedInviteLink}` : shareMsg;
              try {
                await navigator.clipboard.writeText(textToCopy);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {}
              // Open Instagram app/website
              window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
            }}
          >
            <div className="icon-wrapper">
              <FontAwesomeIcon icon={faInstagram} />
            </div>
            <span>اینستاگرام</span>
          </a>

          {/* SMS - use sms:&body= format for better compatibility across devices */}
          <a
            className="sms"
            href={`sms:&body=${encodedTextWithLink}`}
            onClick={(e) => {
              try { setShareSheetOpen(false); } catch {}
              // Try multiple SMS URI formats for cross-device compatibility
              e.preventDefault();
              // iOS format: sms:&body=
              // Android format: sms:?body=
              const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
              const smsUrl = isIOS 
                ? `sms:&body=${encodedTextWithLink}`
                : `sms:?body=${encodedTextWithLink}`;
              window.location.href = smsUrl;
            }}
          >
            <div className="icon-wrapper">
              <FontAwesomeIcon icon={faCommentSms} />
            </div>
            <span>پیامک</span>
          </a>

          {/* Copy Link */}
          <a
            className={`copy-link ${copied ? 'copied' : ''}`}
            href="#"
            onClick={async (e) => {
              e.preventDefault();
              await copyInviteLink();
            }}
          >
            <div className="icon-wrapper">
              <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
            </div>
            <span>{copied ? 'کپی شد!' : 'کپی لینک'}</span>
          </a>
        </div>

      </aside>

      {/* Styles for success banner */}
      <style jsx>{`
        .success-banner { position: fixed; bottom: 80px; right: 10px; left: 10px; z-index: 1000; }
        .success-content { background: #e6f7ec; border: 1px solid #95d5a0; color: #14532d; border-radius: 12px; padding: 12px 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.06); position: relative; }
        .success-title { font-weight: 800; margin-bottom: 6px; }
        .success-details { display: grid; grid-template-columns: 1fr; gap: 2px; font-size: 0.9rem; }
        .success-details span { color: #3f8360; margin-left: 6px; }
        @media (min-width: 480px){ .success-banner { left: auto; width: 420px; } }
      `}</style>
    </>
  );
}

export default function SecondaryInvitePage() {
  return (
    <>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-center">
            <div className="w-12 h-12 bg-gray-300 rounded-full mx-auto mb-4"></div>
            <p>در حال بارگذاری...</p>
          </div>
        </div>
      }>
        <SecondaryInvitePageContent />
      </Suspense>
    </>
  );
}

