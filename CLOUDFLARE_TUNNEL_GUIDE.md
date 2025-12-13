# 🚀 Telegram Mini App - Cloudflare Tunnel Setup

## ✅ What's Already Done

- ✅ Cloudflare Tunnel downloaded and installed
- ✅ Two tunnel windows are now OPEN (check your taskbar!)
- ✅ Helper scripts created

## 📋 What You Need to Do Now (2 Minutes)

### Step 1: Get Your Tunnel URLs

**Look at the two PowerShell windows that just opened:**

**Window 1 - "Frontend Tunnel (3000)"**
- Look for a line that says: `https://something-random-words.trycloudflare.com`
- Copy this entire URL
- This is your **FRONTEND URL**

**Window 2 - "Backend Tunnel (8001)"**
- Look for a line that says: `https://other-random-words.trycloudflare.com`
- Copy this entire URL
- This is your **BACKEND URL**

**Example of what you'll see:**
```
INF |  https://abc-def-123.trycloudflare.com
```

---

### Step 2: Configure Your App Automatically

Once you have both URLs, run this command (replace with your actual URLs):

```bash
cd C:\Projects\final_bahamm
configure-app.bat "https://YOUR-FRONTEND-URL.trycloudflare.com" "https://YOUR-BACKEND-URL.trycloudflare.com"
```

**Real example:**
```bash
configure-app.bat "https://abc-def-123.trycloudflare.com" "https://xyz-789-456.trycloudflare.com"
```

This will automatically create your `frontend\.env.local` file!

---

### Step 3: Update Backend CORS (Manual - 2 Minutes)

Open `backend\main.py` and add your URLs to **BOTH** `allow_origins` lists:

**Find line ~98:**
```python
api_app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        # ... existing URLs ...
        "https://YOUR-FRONTEND-URL.trycloudflare.com",  # Add this
        "https://YOUR-BACKEND-URL.trycloudflare.com",   # Add this
    ],
```

**Find line ~134 and do the same:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        # ... existing URLs ...
        "https://YOUR-FRONTEND-URL.trycloudflare.com",  # Add this
        "https://YOUR-BACKEND-URL.trycloudflare.com",   # Add this
    ],
```

---

### Step 4: Start Your Development Servers

**Terminal 1 - Backend:**
```bash
cd C:\Projects\final_bahamm\backend
uvicorn main:app --reload --port 8001
```

**Terminal 2 - Frontend:**
```bash
cd C:\Projects\final_bahamm\frontend
npm run dev
```

---

### Step 5: Configure Telegram Bot

1. Open Telegram
2. Search for: `@BotFather`
3. Send: `/mybots`
4. Select: `Bahamm_bot`
5. Choose: **Bot Settings** → **Menu Button** → **Configure Menu Button**
6. Paste your **FRONTEND URL** (the one from the 3000 tunnel)
7. Done!

---

### Step 6: Test! 🎉

1. Open Telegram
2. Search for: `@Bahamm_bot`
3. Click the Menu button (☰)
4. Your local app should open inside Telegram!

---

## 🔄 Every Time You Restart

Cloudflare Tunnel URLs change each time you restart (like ngrok free tier).

**Quick restart process:**

1. **Start tunnels:**
   ```bash
   start-cloudflare-tunnels.bat
   ```

2. **Get new URLs from the windows**

3. **Reconfigure:**
   ```bash
   configure-app.bat "NEW-FRONTEND-URL" "NEW-BACKEND-URL"
   ```

4. **Update `backend\main.py` CORS** with new URLs

5. **Restart backend server**

6. **Update Telegram bot** in BotFather

---

## 📁 Helper Scripts Reference

| Script | Purpose |
|--------|---------|
| `start-cloudflare-tunnels.bat` | Start both tunnels |
| `configure-app.bat` | Auto-configure with URLs |
| `CLOUDFLARE_TUNNEL_GUIDE.md` | This guide |

---

## ⚡ Advantages of Cloudflare Tunnel

Compared to ngrok:
- ✅ **No IP restrictions** (works with VPNs)
- ✅ **No account required** for basic use
- ✅ **No auth token needed**
- ✅ **Faster**
- ✅ **More reliable**
- ✅ **Free forever**

---

## 🐛 Troubleshooting

**Problem:** Can't find the PowerShell windows  
**Solution:** Check your taskbar - they should be there. Or run `start-cloudflare-tunnels.bat` again

**Problem:** URLs keep changing  
**Solution:** This is normal with free tier. Consider Cloudflare paid plan ($5/mo) for persistent URLs

**Problem:** "Connection refused" errors  
**Solution:** Make sure both dev servers (frontend and backend) are running

**Problem:** Backend API calls fail
**Solution:**
1. Check that `frontend\.env.local` has correct backend URL
2. Verify CORS in `backend\main.py` includes both tunnel URLs
3. Restart backend server
4. Check that backend tunnel (port 8001) is active

---

## 🎯 Current Status

✅ Cloudflare Tunnel installed  
✅ Both tunnels are running (check PowerShell windows!)  
⏳ Waiting for you to get the URLs  
⏳ Then configure and test!  

---

## 📝 Your Bot Details

- Username: `@Bahamm_bot`
- Token: `<YOUR_TELEGRAM_BOT_TOKEN>`
- Mini App Name: `bahamm`

---

## 🆘 Need Help?

If you need me to update the CORS configuration for you:

1. Tell me the two URLs from your PowerShell windows
2. I'll update all the files automatically
3. You just need to restart the servers and configure Telegram

---

**Next Step:** Look at the two PowerShell windows and copy the Cloudflare URLs!



