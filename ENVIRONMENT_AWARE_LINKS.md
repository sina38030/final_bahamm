# Environment-Aware Link Generation System

## Overview

The application now automatically detects whether users are accessing it through the **Telegram Mini App** or the regular **website (bahamm.ir)** and generates appropriate share/invite links for each environment.

## How It Works

### 1. Link Format by Environment

**In Telegram Mini App:**
- Invite links: `https://t.me/Bahamm_bot/bahamm?startapp=GB12345ABC`
- Keeps users within the Telegram ecosystem
- Uses the `startapp` parameter for deep linking

**On Website (bahamm.ir):**
- Invite links: `https://bahamm.ir/landingM?invite=GB12345ABC`
- Standard web URLs for users without Telegram
- Uses the `invite` query parameter

### 2. Implementation Files

#### Core Utility (`frontend/src/utils/linkGenerator.ts`)

The main utility file with the following functions:

- **`isTelegramMiniApp()`**: Detects if user is in Telegram WebApp
- **`getShareBaseUrl()`**: Returns appropriate base URL for the environment
- **`generateInviteLink(inviteCode, path?)`**: Creates environment-specific invite links
- **`generateShareUrl(platform, link, message?)`**: Generates platform-specific share URLs
- **`getEnvironmentInfo()`**: Returns display info about current environment
- **`extractInviteCode(url)`**: Extracts invite code from any URL format

#### Updated Components

1. **Invite Page** (`frontend/src/app/invite/page.tsx`)
   - Uses `generateInviteLink()` to create invite links
   - Share buttons now use environment-aware links
   - Automatically regenerates links based on user's environment

2. **Track Page** (`frontend/src/app/track/[groupId]/page.tsx`)
   - Updates share URLs to be environment-aware
   - Extracts and regenerates invite codes on the fly

3. **Landing Page** (`frontend/src/app/landingM/ClientLanding.tsx`)
   - Share button generates appropriate links
   - Detects invite codes and regenerates them

4. **AuthContext** (`frontend/src/contexts/AuthContext.tsx`)
   - Handles `startapp` parameter from Telegram deep links
   - Automatically redirects to `/landingM?invite=CODE` when invite code is detected
   - Supports payment callbacks and order deep links

5. **Product Modal Share Sheet** (`frontend/src/components/ProductModal/sheets/ShareSheet.tsx`)
   - Uses utility functions for consistent behavior
   - Environment-aware link generation

## User Flow Examples

### Scenario 1: Telegram User Shares to Telegram Friend

1. User A opens mini app in Telegram
2. Creates a group order
3. Clicks share → Gets link: `t.me/Bahamm_bot/bahamm?startapp=GB123ABC`
4. Shares to Friend B in Telegram
5. Friend B clicks link → Opens in Telegram mini app with invite code
6. AuthContext detects `startapp` parameter → Redirects to `/landingM?invite=GB123ABC`

### Scenario 2: Website User Shares to WhatsApp

1. User A opens bahamm.ir in browser
2. Creates a group order
3. Clicks share → Gets link: `bahamm.ir/landingM?invite=GB123ABC`
4. Shares to Friend B via WhatsApp
5. Friend B clicks link → Opens in browser
6. Lands directly on `/landingM?invite=GB123ABC`

### Scenario 3: Cross-Platform Sharing

1. Telegram user shares a link
2. Link format: `t.me/Bahamm_bot/bahamm?startapp=GB123ABC`
3. Web user clicks the link → Opens Telegram or redirects to web version
4. System handles both formats seamlessly

## Technical Details

### Detection Method

```typescript
function isTelegramMiniApp(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.Telegram?.WebApp?.initData);
}
```

### Link Generation Logic

```typescript
function generateInviteLink(inviteCode: string, path: string = 'landingM'): string {
  if (!inviteCode) return '';
  
  if (isTelegramMiniApp()) {
    // Telegram mini app format
    return `https://t.me/Bahamm_bot/bahamm?startapp=${inviteCode}`;
  }
  
  // Regular website format
  const baseUrl = getShareBaseUrl();
  return `${baseUrl}/${path}?invite=${inviteCode}`;
}
```

### Deep Link Handling

In `AuthContext.tsx`, when a user opens the Telegram mini app with a `startapp` parameter:

```typescript
const startParam = window.Telegram.WebApp.initDataUnsafe?.start_param;

if (startParam && !paymentMatch) {
  console.log('[AuthContext] Invite code detected:', startParam);
  router.push(`/landingM?invite=${startParam}`);
}
```

## Benefits

✅ **Seamless UX**: Users stay in their preferred platform
✅ **Better Conversion**: Native app experience in Telegram
✅ **Flexible**: Works across Telegram mini app and web
✅ **Trackable**: Different link formats enable platform-specific analytics
✅ **Maintainable**: Centralized logic in utility functions
✅ **No Breaking Changes**: Existing links continue to work

## Testing Recommendations

1. **Telegram Mini App**:
   - Open bot: `t.me/Bahamm_bot`
   - Create group order
   - Verify share link has format: `t.me/Bahamm_bot/bahamm?startapp=...`
   - Share to another Telegram user
   - Verify recipient opens in mini app with invite code

2. **Website**:
   - Open: `bahamm.ir`
   - Create group order
   - Verify share link has format: `bahamm.ir/landingM?invite=...`
   - Share via WhatsApp or copy link
   - Verify recipient lands on correct page

3. **Cross-Platform**:
   - Test Telegram link opening in browser (should redirect appropriately)
   - Test website link opening in Telegram (should work)

## Configuration

Bot username is configured in: `backend/app/config.py`
```python
TELEGRAM_BOT_USERNAME: str = "Bahamm_bot"
```

Website URL is configured via environment variables:
```
NEXT_PUBLIC_SITE_URL=https://bahamm.ir
```

## Future Enhancements

- Add analytics tracking per link type
- Add A/B testing for different share messages
- Add QR code generation for in-person sharing
- Add Instagram story sharing support
- Track conversion rates by platform

