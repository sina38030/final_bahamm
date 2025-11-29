# 🔒 HTTPS Staging URL Ready for Telegram Mini App!

**Date:** November 28, 2025  
**Status:** ✅ ACTIVE

---

## ✅ Your Secure HTTPS URL:

```
https://embassy-breath-latitude-sbjct.trycloudflare.com
```

**This URL:**
- ✅ Has HTTPS (required by Telegram)
- ✅ Points to your staging frontend (port 3000)
- ✅ Is configured in your backend CORS
- ✅ Is ready to use with Telegram Mini App

---

## 📱 Configure Telegram Bot (5 Minutes)

### **Step 1: Open BotFather**
1. Open Telegram
2. Search: `@BotFather`
3. Send: `/mybots`

### **Step 2: Select Your Bot**
- Click: `Bahamm_bot`

### **Step 3: Edit Menu Button URL**
1. Click: "Bot Settings"
2. Click: "Menu Button"
3. Click: "Edit menu button URL"
4. **Enter this URL:**
   ```
   https://embassy-breath-latitude-sbjct.trycloudflare.com
   ```
5. Click: "Confirm"

### **Step 4: Test It!**
1. Open `@Bahamm_bot` in Telegram
2. Click the **menu button** (≡ icon at bottom)
3. Your app should open with HTTPS! 🎉

---

## 🔧 What I Set Up:

### **1. Cloudflare Tunnel**
- ✅ Installed cloudflared on server
- ✅ Created secure tunnel from port 3000
- ✅ Generated HTTPS URL
- ✅ Tunnel is running in background

### **2. Backend Configuration**
- ✅ Added tunnel URL to CORS allowed origins
- ✅ Restarted backend with new configuration
- ✅ Backend accepts requests from HTTPS URL

### **3. Service Status**
- ✅ Frontend-staging: Running on port 3000
- ✅ Backend-staging: Running on port 8002
- ✅ Cloudflare Tunnel: Active (PID: 217938)
- ✅ HTTPS URL: Working

---

## 📊 Complete Configuration

### **URLs**

| Type | URL | Purpose |
|------|-----|---------|
| **HTTPS (Telegram)** | https://embassy-breath-latitude-sbjct.trycloudflare.com | For Telegram Mini App |
| **HTTP (Direct)** | http://185.231.181.208:3000 | Direct server access |
| **Backend** | http://185.231.181.208:8002 | API endpoint |

### **Services Running**

| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| frontend-staging | 3000 | ✅ Online | Next.js dev server |
| bahamm-backend-staging | 8002 | ✅ Online | FastAPI backend |
| cloudflared | - | ✅ Running | HTTPS tunnel |

---

## 🎯 Testing Checklist

After updating BotFather:

- [ ] Open @Bahamm_bot in Telegram
- [ ] Click menu button (≡)
- [ ] Verify HTTPS URL loads
- [ ] Check for padlock icon (secure connection)
- [ ] Test Telegram authentication
- [ ] Browse products
- [ ] Check search bar (updated placeholder)
- [ ] Verify no CORS errors
- [ ] Test a few features

---

## ⚠️ Important Notes

### **About Cloudflare Tunnel URLs**

**This URL is temporary** (it will change if the tunnel restarts)

**For Production:**
You should set up a permanent domain like:
- `https://app.bahamm.ir` (production)
- `https://staging.bahamm.ir` (staging)

**Why use this now?**
- ✅ Quick setup (no DNS configuration needed)
- ✅ Free HTTPS (no SSL certificate needed)
- ✅ Perfect for testing
- ✅ Works immediately

### **Keeping the Tunnel Running**

The tunnel is currently running as a background process.

**To check if it's running:**
```bash
ssh ubuntu@185.231.181.208 -i "C:\Users\User\.ssh\id_rsa"
ps aux | grep cloudflared
```

**If it stops, restart it:**
```bash
ssh ubuntu@185.231.181.208 -i "C:\Users\User\.ssh\id_rsa"
cd /srv/app
nohup cloudflared tunnel --url http://localhost:3000 > logs/cloudflared-staging.log 2>&1 &
```

**View the new URL:**
```bash
cat logs/cloudflared-staging.log | grep trycloudflare.com | head -1
```

---

## 🔄 What Happens Next?

### **If Tunnel Restarts**

The URL will change. When that happens:

1. **Get new URL:**
   ```bash
   ssh ubuntu@185.231.181.208 -i "C:\Users\User\.ssh\id_rsa"
   cat /srv/app/logs/cloudflared-staging.log | grep trycloudflare.com | tail -1
   ```

2. **Update backend CORS** (I can help with this)

3. **Update BotFather** with the new URL

### **For Permanent Solution**

Set up a custom domain:

**Option 1: Use bahamm.ir subdomain**
1. Add DNS record: `staging.bahamm.ir` → `185.231.181.208`
2. Get SSL certificate: `sudo certbot --nginx -d staging.bahamm.ir`
3. Use: `https://staging.bahamm.ir` in BotFather

**Option 2: Named Cloudflare Tunnel**
1. Create Cloudflare account
2. Set up named tunnel with custom domain
3. Tunnel won't change URLs

---

## 🛠️ Useful Commands

### **Check Tunnel Status**
```bash
ssh ubuntu@185.231.181.208 -i "C:\Users\User\.ssh\id_rsa"
ps aux | grep cloudflared | grep -v grep
```

### **View Tunnel Logs**
```bash
ssh ubuntu@185.231.181.208 -i "C:\Users\User\.ssh\id_rsa"
tail -50 /srv/app/logs/cloudflared-staging.log
```

### **Restart Tunnel**
```bash
ssh ubuntu@185.231.181.208 -i "C:\Users\User\.ssh\id_rsa"
pkill cloudflared
nohup cloudflared tunnel --url http://localhost:3000 > /srv/app/logs/cloudflared-staging.log 2>&1 &
sleep 5
cat /srv/app/logs/cloudflared-staging.log | grep trycloudflare.com
```

### **View All Services**
```bash
ssh ubuntu@185.231.181.208 -i "C:\Users\User\.ssh\id_rsa"
pm2 status
```

---

## 🐛 Troubleshooting

### **Problem: URL doesn't load**

**Check:**
1. Is frontend-staging running?
   ```bash
   pm2 status | grep frontend-staging
   ```

2. Is tunnel running?
   ```bash
   ps aux | grep cloudflared
   ```

3. Check tunnel logs:
   ```bash
   tail -50 /srv/app/logs/cloudflared-staging.log
   ```

### **Problem: CORS errors in Telegram**

**Solution:**
- Backend already configured with tunnel URL
- If you got a new tunnel URL after restart, let me know and I'll update it

### **Problem: Telegram auth fails**

**Check backend logs:**
```bash
ssh ubuntu@185.231.181.208 -i "C:\Users\User\.ssh\id_rsa"
pm2 logs bahamm-backend-staging --lines 50
```

### **Problem: Features don't work**

**Check browser console:**
- Open Telegram Desktop (or use Telegram Web)
- Open developer tools (F12)
- Check Console and Network tabs for errors

---

## 📞 Quick Support Commands

### **From Windows PowerShell:**

**Restart everything:**
```powershell
ssh ubuntu@185.231.181.208 -i "C:\Users\User\.ssh\id_rsa" "pm2 restart frontend-staging bahamm-backend-staging"
```

**Check what's running:**
```powershell
ssh ubuntu@185.231.181.208 -i "C:\Users\User\.ssh\id_rsa" "pm2 status && echo '' && ps aux | grep cloudflared | grep -v grep"
```

**View all logs:**
```powershell
ssh ubuntu@185.231.181.208 -i "C:\Users\User\.ssh\id_rsa" "pm2 logs --lines 20"
```

---

## ✨ Summary

**What's Ready:**
- ✅ HTTPS URL: `https://embassy-breath-latitude-sbjct.trycloudflare.com`
- ✅ Frontend: Port 3000, running
- ✅ Backend: Port 8002, running with CORS
- ✅ Tunnel: Active and forwarding traffic
- ✅ Telegram: Ready for mini app!

**What You Need to Do:**
1. Open Telegram → @BotFather
2. Update menu URL to: `https://embassy-breath-latitude-sbjct.trycloudflare.com`
3. Test by opening @Bahamm_bot and clicking menu button

**That's it!** 🎉

---

## 🎓 Additional Resources

- **Cloudflare Tunnel Docs:** https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- **Telegram Bot API:** https://core.telegram.org/bots/webapps
- **Your Bot:** https://t.me/Bahamm_bot

---

**Your HTTPS staging environment is ready for Telegram Mini App!** 🚀

**URL to use in BotFather:**
```
https://embassy-breath-latitude-sbjct.trycloudflare.com
```

