# Telegram API Proxy Setup for Iranian Servers

## ✅ STATUS: CONFIGURED AND WORKING

**Worker URL:** `https://telegram-api-proxy.sina38030.workers.dev`
**Configured:** December 7, 2025

## Problem (SOLVED)
The server at 185.231.181.208 cannot reach `api.telegram.org` due to regional blocking.
Other services (GitHub, Google) work fine.

## Solution: Cloudflare Worker Proxy

### Step 1: Create Cloudflare Account
1. Go to https://dash.cloudflare.com/
2. Sign up or log in

### Step 2: Create Worker
1. Go to "Workers & Pages" → "Create Worker"
2. Name it something like `telegram-api-proxy`
3. Paste this code:

```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Replace the host with Telegram API
  url.host = 'api.telegram.org'
  url.protocol = 'https:'
  
  // Forward the request to Telegram
  const modifiedRequest = new Request(url.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.body,
  })
  
  return fetch(modifiedRequest)
}
```

4. Save and deploy
5. Note your worker URL (e.g., `https://telegram-api-proxy.your-account.workers.dev`)

### Step 3: Configure Backend

**Option A: Environment Variable**
Set in your `.env` file or PM2 ecosystem config:
```
TELEGRAM_API_PROXY=https://telegram-api-proxy.your-account.workers.dev
```

**Option B: Update telegram.py directly**
Change the `base_url` in `/srv/app/backend/app/services/telegram.py`:
```python
# Instead of:
self.base_url = f"https://api.telegram.org/bot{self.bot_token}"

# Use your worker URL:
self.base_url = f"https://telegram-api-proxy.your-account.workers.dev/bot{self.bot_token}"
```

### Step 4: Restart Backend
```bash
pm2 restart backend
```

### Step 5: Test
```bash
cd /srv/app/backend
.venv/bin/python3 -c "
import requests
r = requests.get('https://YOUR-WORKER.workers.dev/bot<YOUR_TELEGRAM_BOT_TOKEN>/getMe', timeout=10)
print(r.json())
"
```

## Alternative: Direct URL Replacement

If you don't want to use a proxy environment variable, you can modify telegram.py to use the worker URL directly:

```python
# In /srv/app/backend/app/services/telegram.py
# Change line 14 from:
self.base_url = f"https://api.telegram.org/bot{self.bot_token}"

# To:
TELEGRAM_WORKER_URL = "https://telegram-api-proxy.your-account.workers.dev"
self.base_url = f"{TELEGRAM_WORKER_URL}/bot{self.bot_token}"
```

## Security Notes

1. The Cloudflare Worker is free for up to 100,000 requests/day
2. Your bot token is passed through the worker - use your own worker, not a third-party one
3. For added security, you can add authentication to the worker

## Troubleshooting

If notifications still fail:
1. Check worker logs in Cloudflare dashboard
2. Verify worker URL is accessible from server:
   ```bash
   curl -I https://your-worker.workers.dev/
   ```
3. Check backend logs:
   ```bash
   pm2 logs backend --lines 50 | grep -i telegram
   ```

