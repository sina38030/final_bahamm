# Mixed Content Error - Final Fix

**Date:** November 29, 2025  
**Issue:** Mixed Content Error blocking API requests on staging.bahamm.ir/admin-full

## Root Cause

The admin page was making HTTP requests to `http://188.121.103.118:8002` from an HTTPS page (`https://staging.bahamm.ir`), which browsers block for security.

**Why this happened:**
1. The `ADMIN_API_BASE_URL` was being computed at **module load time** (line 91)
2. During Server-Side Rendering (SSR), `window` is undefined
3. The function returned the fallback: `http://localhost:8001/api`
4. This wrong URL got cached and used on the client side

## The Fix

### Changed Files
- `frontend/src/app/admin-full/page.tsx`

### Changes Made

1. **Removed module-level initialization** (Line 91):
```typescript
// BEFORE (WRONG - runs during SSR):
const ADMIN_API_BASE_URL = (() => getAdminApiBaseUrl())();

// AFTER (CORRECT - empty until client-side):
let ADMIN_API_BASE_URL = "";
```

2. **Added client-side initialization** inside the component (Line 271):
```typescript
export default function AdminPage() {
  // Initialize API base URL on client side only
  if (typeof window !== 'undefined' && !ADMIN_API_BASE_URL) {
    ADMIN_API_BASE_URL = getAdminApiBaseUrl();
  }
  
  // ... rest of component
}
```

### How It Works Now

1. **Server-Side (SSR):** `ADMIN_API_BASE_URL` remains empty string (no computation)
2. **Client-Side:** When component mounts in browser:
   - Checks `window.location.hostname`
   - Detects `staging.bahamm.ir`
   - Sets `ADMIN_API_BASE_URL = "https://staging.bahamm.ir/api"`
3. **API Calls:** All fetch requests now use HTTPS nginx proxy

## Nginx Configuration

The nginx configuration was already fixed earlier to proxy `/api/` requests:

```nginx
# In /etc/nginx/sites-available/staging-bahamm-final

location /api/ {
    proxy_pass http://127.0.0.1:8002/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    # ... CORS headers ...
}
```

## URL Resolution Flow

### Staging Environment (staging.bahamm.ir)
1. Browser loads: `https://staging.bahamm.ir/admin-full`
2. Frontend detects hostname: `staging.bahamm.ir`
3. Sets API base: `https://staging.bahamm.ir/api`
4. Makes request: `https://staging.bahamm.ir/api/admin/dashboard`
5. Nginx proxies to: `http://127.0.0.1:8002/api/admin/dashboard`
6. Backend responds → Nginx returns to browser via HTTPS ✓

### Development Environment (localhost)
1. Browser loads: `http://localhost:3000/admin-full`
2. Frontend detects hostname: `localhost`
3. Sets API base: `http://localhost:8001/api`
4. Makes direct request to backend ✓

## Testing

To verify the fix works:

1. **Open browser console** at `https://staging.bahamm.ir/admin-full`
2. **Look for logs:**
   ```
   [Admin] Production URL (nginx proxy): https://staging.bahamm.ir
   [Admin] Final API Base URL: https://staging.bahamm.ir/api
   Fetching dashboard from: https://staging.bahamm.ir/api/admin/dashboard
   ```
3. **Check Network tab:** All requests should be HTTPS
4. **No errors:** "Mixed Content" error should be gone

## Key Lessons

1. ✅ **Never call browser APIs at module level** in Next.js
2. ✅ **Always check `typeof window !== 'undefined'`** before using window
3. ✅ **Initialize dynamic values inside components**, not at module scope
4. ✅ **Use nginx reverse proxy** for same-origin API calls
5. ✅ **HTTPS pages must make HTTPS requests** (or browsers block them)

## Files Modified

- `frontend/src/app/admin-full/page.tsx` - Fixed URL initialization timing
- `/etc/nginx/sites-available/staging-bahamm-final` - Already had API proxy configured

## Status

✅ **FIXED** - Admin dashboard now loads correctly without Mixed Content errors

