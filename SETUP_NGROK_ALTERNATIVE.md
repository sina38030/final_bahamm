# 🔧 Setting Up ngrok (Despite IP Block)

## ⚠️ Important: Your IP is Blocked by ngrok

Your IP address `83.123.171.6` is blocked by ngrok (Error: ERR_NGROK_9040).

**This usually happens if you're:**
- Using a VPN
- Using a proxy
- On a datacenter/hosting IP
- In a restricted region

---

## 🚀 Solutions to Try:

### Solution 1: Disconnect VPN (If Using One)

If you're using a VPN, disconnect it:

1. Disconnect your VPN
2. Check your new IP: https://whatismyipaddress.com
3. Try ngrok again

### Solution 2: Use Different Network

- Switch to mobile hotspot
- Use different WiFi network
- Try from a different location

### Solution 3: Contact ngrok Support

Visit: https://ngrok.com/docs/errors/err_ngrok_9040  
Email: support@ngrok.com

Explain you need it for local Telegram bot development.

### Solution 4: Use ngrok Alternative

Instead of ngrok, you can use:
- **LocalTunnel** (easier, no account needed)
- **serveo.net** (SSH-based, no install)
- **Tailscale Funnel** (secure, free)

---

## 📋 If You Can Bypass the IP Block:

### Step 1: Start ngrok Tunnels

**Open PowerShell and run:**

```powershell
# Start frontend tunnel (Terminal 1)
cd C:\Users\User\ngrok
.\ngrok.exe http 3000

# Start backend tunnel (Terminal 2 - open another window)
cd C:\Users\User\ngrok
.\ngrok.exe http 8080
```

### Step 2: Copy the URLs

From each ngrok window, find the "Forwarding" line:

```
Forwarding   https://abc123.ngrok-free.app -> http://localhost:3000
Forwarding   https://xyz789.ngrok-free.app -> http://localhost:8080
```

Copy both HTTPS URLs.

### Step 3: Update Frontend Config

```powershell
cd C:\Projects\final_bahamm\frontend

# Create new .env.local
@"
NEXT_PUBLIC_API_BASE_URL=https://YOUR-BACKEND-NGROK-URL.ngrok-free.app
BACKEND_URL=https://YOUR-BACKEND-NGROK-URL.ngrok-free.app
API_BASE_URL=https://YOUR-BACKEND-NGROK-URL.ngrok-free.app
SITE_URL=https://YOUR-FRONTEND-NGROK-URL.ngrok-free.app
"@ | Out-File -FilePath ".env.local" -Encoding UTF8 -Force
```

Replace the URLs with your actual ngrok URLs!

### Step 4: Update Backend CORS

Edit `backend\main.py`:

Add your ngrok URLs to both CORS sections (lines ~107 and ~146):

```python
allow_origins=[
    # ... existing URLs ...
    "https://YOUR-FRONTEND-URL.ngrok-free.app",
    "https://YOUR-BACKEND-URL.ngrok-free.app",
],
```

### Step 5: Restart Servers

```powershell
# Stop and restart backend
cd C:\Projects\final_bahamm\backend
uvicorn main:app --reload --port 8080

# Stop and restart frontend (delete cache first)
cd C:\Projects\final_bahamm\frontend
Remove-Item -Recurse -Force .next
npm run dev
```

### Step 6: Configure Telegram Bot

1. Open Telegram → @BotFather
2. `/mybots` → `Bahamm_bot` → Bot Settings → Menu Button
3. Enter your **frontend ngrok URL**

---

## 🎯 Recommended: Use LocalTunnel Instead

Since ngrok blocks your IP, try **LocalTunnel** (easier, no IP restrictions):

### Install LocalTunnel:

```powershell
npm install -g localtunnel
```

### Start Tunnels:

```powershell
# Terminal 1 - Frontend
lt --port 3000 --subdomain bahamm-front

# Terminal 2 - Backend
lt --port 8080 --subdomain bahamm-back
```

You'll get URLs like:
- `https://bahamm-front.loca.lt`
- `https://bahamm-back.loca.lt`

**First time:** Click through the warning page in browser.

Then use these URLs in your `.env.local` and `main.py` CORS!

---

## 🔧 Quick LocalTunnel Setup

Let me set this up for you since ngrok is blocked...




