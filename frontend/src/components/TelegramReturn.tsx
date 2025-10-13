'use client';

import { useEffect, useState } from 'react';

interface TelegramReturnProps {
  orderId?: number | string;
  groupId?: number | string;
  showVpnWarning?: boolean;
}

export default function TelegramReturn({ 
  orderId, 
  groupId,
  showVpnWarning = true
}: TelegramReturnProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [vpnWarning, setVpnWarning] = useState(showVpnWarning);
  
  // تشخیص اینکه آیا کاربر از تلگرام اومده
  const isTelegramUser = typeof window !== 'undefined' && 
    (window.Telegram?.WebApp?.initData || 
     document.referrer.includes('telegram'));

  // ساخت Deep Link
  const createDeepLink = () => {
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'bahamm_shop_bot';
    const appName = process.env.NEXT_PUBLIC_TELEGRAM_MINIAPP_NAME || 'shop';
    
    // پارامترهای اضافی
    let startParam = '';
    if (orderId) startParam += `order_${orderId}`;
    if (groupId) startParam += groupId ? `_group_${groupId}` : '';
    
    // لینک‌های مختلف برای fallback
    const links = {
      // بهترین: مستقیم به mini app
      miniApp: `https://t.me/${botUsername}/${appName}${startParam ? `?startapp=${startParam}` : ''}`,
      
      // دوم: لینک bot با start parameter
      bot: `https://t.me/${botUsername}${startParam ? `?start=${startParam}` : ''}`,
      
      // سوم: telegram web (برای desktop)
      web: `https://web.telegram.org/k/#@${botUsername}`,
      
      // چهارم: تلگرام protocol (برای موبایل)
      tgProtocol: `tg://resolve?domain=${botUsername}${startParam ? `&start=${startParam}` : ''}`
    };
    
    return links;
  };

  // تابع بازگشت به تلگرام
  const returnToTelegram = () => {
    setIsRedirecting(true);
    setVpnWarning(false);
    
    const links = createDeepLink();
    
    // روش ۱: اگر داخل Telegram WebApp هستیم
    if (window.Telegram?.WebApp) {
      try {
        // بستن WebApp و بازگشت به تلگرام
        window.Telegram.WebApp.close();
        return;
      } catch (e) {
        console.log('WebApp.close() failed, trying alternatives');
      }
    }
    
    // روش ۲: تلاش برای باز کردن mini app
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // موبایل: سعی می‌کنیم با protocol تلگرام باز کنیم
      window.location.href = links.tgProtocol;
      
      // بعد از 1.5 ثانیه، اگر باز نشد، mini app لینک رو امتحان کن
      setTimeout(() => {
        window.location.href = links.miniApp;
      }, 1500);
      
      // بعد از 3 ثانیه، اگر باز هم باز نشد، bot لینک رو باز کن
      setTimeout(() => {
        window.location.href = links.bot;
      }, 3000);
    } else {
      // دسکتاپ: مستقیم به mini app یا web telegram
      try {
        // سعی می‌کنیم پنجره جدید باز کنیم
        const opened = window.open(links.miniApp, '_blank');
        
        // اگر پنجره باز نشد (popup blocker)، redirect کن
        if (!opened || opened.closed || typeof opened.closed == 'undefined') {
          window.location.href = links.miniApp;
        }
      } catch (e) {
        // اگر خطا داد، مستقیم redirect کن
        window.location.href = links.miniApp;
      }
    }
  };

  // اگر کاربر از تلگرام نیومده، هیچی نشون نده
  if (!isTelegramUser) {
    return null;
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* هشدار VPN */}
      {vpnWarning && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4 animate-pulse">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold text-yellow-800 mb-1">
                قبل از بازگشت به تلگرام
              </p>
              <p className="text-sm text-yellow-700">
                لطفاً ابتدا <strong>فیلترشکن (VPN)</strong> خود را روشن کنید، 
                سپس روی دکمه زیر کلیک کنید.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* دکمه بازگشت */}
      <button
        onClick={returnToTelegram}
        disabled={isRedirecting}
        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 
                   disabled:from-gray-400 disabled:to-gray-500 
                   text-white font-bold py-4 px-6 rounded-lg 
                   transition-all duration-300 shadow-lg hover:shadow-xl
                   flex items-center justify-center gap-3 text-lg"
      >
        {isRedirecting ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle 
                className="opacity-25" 
                cx="12" cy="12" r="10" 
                stroke="currentColor" 
                strokeWidth="4"
                fill="none"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            در حال انتقال...
          </>
        ) : (
          <>
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
            </svg>
            🔙 بازگشت به تلگرام
          </>
        )}
      </button>

      {/* اطلاعات سفارش */}
      {orderId && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
          <p className="flex justify-between items-center">
            <span>شماره سفارش:</span>
            <strong className="font-mono text-base text-gray-800">#{orderId}</strong>
          </p>
          {groupId && (
            <p className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
              <span>شماره گروه:</span>
              <strong className="font-mono text-base text-gray-800">#{groupId}</strong>
            </p>
          )}
        </div>
      )}

      {/* راهنمای اضافی */}
      <div className="mt-4 text-center text-xs text-gray-500">
        <p>💡 در صورت بروز مشکل، مجدداً تلگرام را باز کرده و وارد ربات شوید</p>
      </div>
    </div>
  );
}

