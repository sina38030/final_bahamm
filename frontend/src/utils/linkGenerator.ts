/**
 * Link Generator Utility
 * Generates appropriate links based on environment (Telegram Mini App vs Website)
 */

/**
 * Detects if user is in Telegram Mini App
 */
export function isTelegramMiniApp(): boolean {
  if (typeof window === 'undefined') return false;
  
  // 1. Check for Telegram WebApp object
  const tg = (window as any).Telegram?.WebApp;
  if (tg && tg.initData && tg.initData.length > 0) {
    return true;
  }

  // 2. Check for Telegram-specific hash parameters (often present in Mini Apps)
  if (typeof window !== 'undefined' && window.location.hash.includes('tgWebAppData')) {
    return true;
  }

  // 3. Check for platform - if it's not unknown, it's likely initialized
  if (tg && tg.platform && tg.platform !== 'unknown') {
    return true;
  }

  return false;
}

/**
 * Gets the appropriate base URL for sharing based on environment
 */
export function getShareBaseUrl(): string {
  if (isTelegramMiniApp()) {
    // Return Telegram mini app link format
    return 't.me/Bahamm_bot/bahamm';
  }
  // Return regular website URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://bahamm.ir';
  return siteUrl.replace(/\/$/, '');
}

/**
 * Generates invite/share link based on current environment
 * @param inviteCode - The invite code for the group
 * @param path - Optional path (default: 'landingM')
 */
export function generateInviteLink(inviteCode: string, path: string = 'landingM'): string {
  if (!inviteCode) return '';
  
  if (isTelegramMiniApp()) {
    // Telegram mini app format: t.me/botname/appname?startapp=CODE
    // Note: startapp parameter will be available in initDataUnsafe.start_param
    return `https://t.me/Bahamm_bot/bahamm?startapp=${inviteCode}`;
  }
  
  // Regular website format
  const baseUrl = getShareBaseUrl();
  return `${baseUrl}/${path}?invite=${inviteCode}`;
}

/**
 * Generates share URL for social media based on platform
 * @param platform - The social media platform
 * @param link - The link to share
 * @param message - Optional message to include
 */
export function generateShareUrl(
  platform: 'telegram' | 'whatsapp' | 'instagram',
  link: string,
  message?: string
): string {
  const encodedLink = encodeURIComponent(link);
  const encodedMessage = message ? encodeURIComponent(message) : '';
  
  switch (platform) {
    case 'telegram':
      if (message) {
        return `https://t.me/share/url?url=${encodedLink}&text=${encodedMessage}`;
      }
      return `https://t.me/share/url?url=${encodedLink}`;
    
    case 'whatsapp':
      if (message) {
        return `https://wa.me/?text=${encodedMessage}%20${encodedLink}`;
      }
      return `https://wa.me/?text=${encodedLink}`;
    
    case 'instagram':
      return `https://www.instagram.com/?url=${encodedLink}`;
    
    default:
      return link;
  }
}

/**
 * Gets environment info for display purposes
 */
export function getEnvironmentInfo() {
  if (isTelegramMiniApp()) {
    return {
      icon: '📱',
      text: 'تلگرام مینی‌اپ',
      linkFormat: 't.me/Bahamm_bot/bahamm?startapp=...',
      isTelegram: true
    };
  }
  return {
    icon: '🌐',
    text: 'وب‌سایت',
    linkFormat: 'bahamm.ir/landingM?invite=...',
    isTelegram: false
  };
}

/**
 * Extracts invite code from a URL string
 * @param url - URL that may contain an invite code
 */
export function extractInviteCode(url: string): string | null {
  if (!url) return null;
  
  // Check for ?invite= parameter
  const inviteMatch = url.match(/[?&]invite=([^&]+)/);
  if (inviteMatch) return inviteMatch[1];
  
  // Check for ?startapp= parameter (Telegram format)
  const startappMatch = url.match(/[?&]startapp=([^&]+)/);
  if (startappMatch) return startappMatch[1];
  
  return null;
}
