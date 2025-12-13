# ✅ Telegram Mini App Testing Checklist

## □ Step 1: ngrok Authentication (ONE TIME ONLY)

**What:** Get free ngrok account and auth token  
**Time:** 2 minutes  
**Actions:**
1. [ ] Go to https://ngrok.com/ and sign up
2. [ ] Visit https://dashboard.ngrok.com/get-started/your-authtoken
3. [ ] Copy your auth token
4. [ ] Run this command (replace YOUR_TOKEN):
```cmd
%USERPROFILE%\ngrok\ngrok.exe config add-authtoken YOUR_TOKEN
```

**Example:**
```cmd
%USERPROFILE%\ngrok\ngrok.exe config add-authtoken 2abcDEF123xyz
```

**✓ Done when:** You see "Authtoken saved"

---

## □ Step 2: Start Development Servers

**What:** Run backend and frontend locally  
**Time:** 1 minute

**Terminal 1 - Backend:**
```bash
cd C:\Projects\final_bahamm\backend
uvicorn main:app --reload --port 8080
```
**✓ Done when:** You see "Uvicorn running on http://127.0.0.1:8080"

**Terminal 2 - Frontend:**
```bash
cd C:\Projects\final_bahamm\frontend
npm run dev
```
**✓ Done when:** You see "ready started server on 0.0.0.0:3000"

---

## □ Step 3: Start ngrok Tunnels

**What:** Create public HTTPS URLs for your local servers  
**Time:** 30 seconds

**Action:**
```bash
# Double-click this file:
C:\Projects\final_bahamm\setup-ngrok.bat
```

**Or run:**
```bash
cd C:\Projects\final_bahamm
setup-ngrok.bat
```

**✓ Done when:** You see TWO windows with ngrok dashboards

---

## □ Step 4: Get ngrok URLs

**What:** Copy the public URLs ngrok created  
**Time:** 30 seconds

**Option A - Automatic (Easiest):**
```bash
# Double-click this file:
C:\Projects\final_bahamm\get-ngrok-urls.bat
```
This will show all URLs nicely formatted and copy frontend URL to clipboard!

**Option B - Manual:**
Look at each ngrok window for the "Forwarding" line:
- **Frontend (port 3000):** `https://abc123.ngrok-free.app`
- **Backend (port 8080):** `https://xyz789.ngrok-free.app`

**✓ Done when:** You have both URLs copied

---

## □ Step 5: Update Frontend Environment

**What:** Tell frontend where the backend is  
**Time:** 1 minute

**Actions:**
1. [ ] Copy file: `frontend\.env.local.template` → `frontend\.env.local`
2. [ ] Edit `frontend\.env.local`
3. [ ] Replace `YOUR-BACKEND-NGROK-URL` with your backend ngrok URL
4. [ ] Save the file

**Example `.env.local`:**
```env
NEXT_PUBLIC_API_URL=https://xyz789.ngrok-free.app/api
```

**✓ Done when:** File saved with correct backend URL

---

## □ Step 6: Update Backend CORS

**What:** Allow frontend to call backend  
**Time:** 2 minutes

**Actions:**
1. [ ] Open: `backend\main.py`
2. [ ] Find line ~98: `api_app.add_middleware(CORSMiddleware, allow_origins=[`
3. [ ] Add both ngrok URLs to the list
4. [ ] Find line ~134: `app.add_middleware(CORSMiddleware, allow_origins=[`
5. [ ] Add both ngrok URLs to the list again
6. [ ] Save the file

**Add these lines to BOTH places:**
```python
"https://abc123.ngrok-free.app",  # Frontend ngrok
"https://xyz789.ngrok-free.app",  # Backend ngrok
```

**✓ Done when:** Both URLs added to BOTH CORS sections

**See detailed instructions in:** `backend\cors_update_instructions.txt`

---

## □ Step 7: Restart Servers

**What:** Apply the changes  
**Time:** 30 seconds

**Actions:**
1. [ ] **Terminal 1 (Backend):** Press `Ctrl+C`, then run again:
```bash
uvicorn main:app --reload --port 8080
```

2. [ ] **Terminal 2 (Frontend):** Press `Ctrl+C`, then run again:
```bash
npm run dev
```

**✓ Done when:** Both servers running again

---

## □ Step 8: Configure Telegram Bot

**What:** Point your Telegram bot to ngrok URL  
**Time:** 2 minutes

**Actions:**
1. [ ] Open Telegram app
2. [ ] Search for: `@BotFather`
3. [ ] Send command: `/mybots`
4. [ ] Select: `Bahamm_bot`
5. [ ] Choose: **Bot Settings**
6. [ ] Choose: **Menu Button**
7. [ ] Choose: **Configure Menu Button**
8. [ ] Paste your **frontend ngrok URL**: `https://abc123.ngrok-free.app`
9. [ ] Confirm

**✓ Done when:** BotFather confirms "Menu button URL has been updated"

---

## □ Step 9: TEST! 🎉

**What:** Use your mini app in Telegram  
**Time:** 1 minute

**Actions:**
1. [ ] Open Telegram (mobile or desktop)
2. [ ] Search for: `@Bahamm_bot`
3. [ ] Click the **Menu button** (☰ icon at bottom-left)
4. [ ] Your local app should open!

**✓ Done when:** You see your app running inside Telegram!

---

## 🔍 Debugging Tools

If something doesn't work:

**ngrok Inspector:**
```
Open: http://localhost:4040
```
See all HTTP requests between Telegram and your servers

**Frontend directly:**
```
Open: http://localhost:3000
```
Test frontend without Telegram

**Backend API docs:**
```
Open: http://localhost:8080/docs
```
Test backend endpoints directly

---

## 📝 Quick Reference

**Your Bot Details:**
- Username: `@Bahamm_bot`
- Bot Token: `<YOUR_TELEGRAM_BOT_TOKEN>`
- Mini App Name: `bahamm`

**Key Files:**
- Frontend env: `frontend\.env.local`
- Backend CORS: `backend\main.py` (lines 98 & 134)
- Bot config: Telegram → `@BotFather` → `/mybots`

**Helper Scripts:**
- `setup-ngrok.bat` - Start ngrok tunnels
- `get-ngrok-urls.bat` - Get tunnel URLs (with clipboard copy!)

---

## ⚠️ Important Notes

### When ngrok URLs Change (each restart):
- [ ] Get new URLs (run `get-ngrok-urls.bat`)
- [ ] Update `frontend\.env.local`
- [ ] Update `backend\main.py` CORS (both places)
- [ ] Restart both servers
- [ ] Update Telegram bot URL in BotFather

### ngrok Free Tier:
- ✓ FREE forever
- ✓ HTTPS automatically
- ✗ URLs change on restart
- ✗ Limited to 1 account per IP (usually fine)
- Consider paid plan ($8/mo) for persistent URLs if testing frequently

---

## 🆘 Common Issues

**Issue:** "ngrok not recognized" error  
**Fix:** ngrok is installed at `%USERPROFILE%\ngrok\ngrok.exe`

**Issue:** "You need to sign up" message in Telegram  
**Fix:** Add auth token (Step 1)

**Issue:** Blank page in Telegram  
**Fix:** Check frontend server is running, verify ngrok frontend tunnel

**Issue:** API calls fail (network errors)  
**Fix:** 
- Verify `.env.local` has correct backend URL
- Check CORS in `main.py` includes ngrok URLs
- Restart backend server
- Check ngrok inspector: http://localhost:4040

**Issue:** "403 Forbidden" from ngrok  
**Fix:** Add to each ngrok URL in browser: `?ngrok-skip-browser-warning=true`  
Or update your ngrok config

---

## 🎓 Full Documentation

For detailed explanations and advanced topics:
- **Complete Guide:** `NGROK_SETUP_GUIDE.md`
- **Quick Start:** `START_HERE.md`
- **CORS Instructions:** `backend\cors_update_instructions.txt`

---

**Ready? Start with Step 1! ✨**









