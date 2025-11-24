# 🚀 Manual ngrok Setup Guide

## Step 1: Open Two PowerShell/Command Prompt Windows

Press `Windows Key + R`, type `cmd` or `powershell`, press Enter

Do this **twice** to get 2 windows.

---

## Step 2: Start Frontend Tunnel (Window 1)

In the first window, type:

```bash
cd C:\Users\User\ngrok
ngrok http 3000
```

Press Enter.

**You'll see:**
```
Session Status                online
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:3000
```

**Copy the URL:** `https://abc123.ngrok-free.app`

---

## Step 3: Start Backend Tunnel (Window 2)

In the second window, type:

```bash
cd C:\Users\User\ngrok
ngrok http 8001
```

Press Enter.

**You'll see:**
```
Session Status                online
Forwarding                    https://xyz789.ngrok-free.app -> http://localhost:8001
```

**Copy the URL:** `https://xyz789.ngrok-free.app`

---

## Step 4: Update Frontend Configuration

Open PowerShell and run:

```powershell
cd C:\Projects\final_bahamm\frontend
notepad .env.local
```

**Replace with your backend ngrok URL:**

```env
NEXT_PUBLIC_API_BASE_URL=https://YOUR-BACKEND-URL.ngrok-free.app
BACKEND_URL=https://YOUR-BACKEND-URL.ngrok-free.app
API_BASE_URL=https://YOUR-BACKEND-URL.ngrok-free.app
SITE_URL=https://YOUR-FRONTEND-URL.ngrok-free.app
```

**Example:**
```env
NEXT_PUBLIC_API_BASE_URL=https://xyz789.ngrok-free.app
BACKEND_URL=https://xyz789.ngrok-free.app
API_BASE_URL=https://xyz789.ngrok-free.app
SITE_URL=https://abc123.ngrok-free.app
```

**Save and close** Notepad.

---

## Step 5: Update Backend CORS

Open PowerShell and run:

```powershell
cd C:\Projects\final_bahamm\backend
notepad main.py
```

**Find line ~98** (search for `api_app.add_middleware`):

Add your ngrok URLs to the list:

```python
api_app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://bahamm.ir",
        "http://bahamm.ir",
        "https://app.bahamm.ir",
        # Add your ngrok URLs here:
        "https://abc123.ngrok-free.app",  # Your frontend URL
        "https://xyz789.ngrok-free.app",  # Your backend URL
    ],
```

**Find line ~137** (search for `app.add_middleware`):

Add the same URLs again:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://bahamm.ir",
        "http://bahamm.ir",
        "https://app.bahamm.ir",
        # Add your ngrok URLs here:
        "https://abc123.ngrok-free.app",  # Your frontend URL
        "https://xyz789.ngrok-free.app",  # Your backend URL
    ],
```

**Save and close** Notepad (Ctrl+S, then Alt+F4).

---

## Step 6: Restart Backend Server

In PowerShell:

```powershell
# Stop running backend (if any)
Get-Process | Where-Object { (netstat -ano | findstr ":8001") -match $_.Id } | Stop-Process -Force

# Start backend
cd C:\Projects\final_bahamm\backend
uvicorn main:app --reload --port 8001
```

Keep this window open!

---

## Step 7: Restart Frontend Server

In another PowerShell window:

```powershell
# Stop running frontend (if any)
Get-Process | Where-Object { (netstat -ano | findstr ":3000") -match $_.Id } | Stop-Process -Force

# Delete cache
cd C:\Projects\final_bahamm\frontend
Remove-Item -Recurse -Force .next

# Start frontend
npm run dev
```

Keep this window open!

---

## Step 8: Configure Telegram Bot

1. Open Telegram app
2. Search for: `@BotFather`
3. Send: `/mybots`
4. Select: `Bahamm_bot`
5. Choose: **Bot Settings** → **Menu Button** → **Configure Menu Button**
6. Paste your **FRONTEND ngrok URL**: `https://abc123.ngrok-free.app`
7. Confirm

---

## Step 9: Test Your Mini App!

1. Open Telegram
2. Search for: `@Bahamm_bot`
3. Click the **☰ Menu button**
4. Your app opens! 🎉

---

## 🔍 Troubleshooting

### Problem: "ERR_NGROK_9040" - IP Blocked

Your IP is blocked by ngrok. Solutions:

**Option 1: Disconnect VPN**
- If using VPN, disconnect it
- Try ngrok again

**Option 2: Use Different Network**
- Switch to mobile hotspot
- Try from different WiFi

**Option 3: Use LocalTunnel Instead**

```powershell
# Install
npm install -g localtunnel

# Start frontend tunnel (Window 1)
lt --port 3000

# Start backend tunnel (Window 2)
lt --port 8001
```

Then follow the same steps above but use LocalTunnel URLs instead (they look like `https://random.loca.lt`).

---

## 📝 Quick Reference

### Your Current Setup:
- Backend port: **8001**
- Frontend port: **3000**
- Bot: **@Bahamm_bot**
- Token: `8413343514:AAFiyFNsJUSuEh0aLG9dZxSnSHwAyRPK09E`

### ngrok Location:
```
C:\Users\User\ngrok\ngrok.exe
```

### Files to Edit:
- Frontend config: `C:\Projects\final_bahamm\frontend\.env.local`
- Backend CORS: `C:\Projects\final_bahamm\backend\main.py` (lines ~98 and ~137)

---

## ⚠️ Important Notes

1. **ngrok URLs change** every time you restart ngrok (free tier)
2. When URLs change, you need to:
   - Update `.env.local`
   - Update `main.py` CORS (both places)
   - Restart both servers
   - Update Telegram bot URL

3. **Keep 4 windows open** while testing:
   - ngrok frontend tunnel
   - ngrok backend tunnel
   - Backend server (uvicorn)
   - Frontend server (npm run dev)

---

## 🎯 Summary

1. Start 2 ngrok tunnels → Get 2 URLs
2. Update `.env.local` with backend URL
3. Update `main.py` with both URLs (2 places)
4. Restart backend & frontend servers
5. Configure Telegram bot with frontend URL
6. Test in Telegram!

---

**Good luck!** 🚀




