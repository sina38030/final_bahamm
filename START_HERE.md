# 🚀 Quick Start: Test Telegram Mini App Locally

## ⚡ Fast Setup (5 Minutes)

### 1. Get ngrok Auth Token (One-time, 2 minutes)
```bash
# Visit: https://ngrok.com/ and sign up (FREE)
# Go to: https://dashboard.ngrok.com/get-started/your-authtoken
# Copy your token and run:
%USERPROFILE%\ngrok\ngrok.exe config add-authtoken YOUR_TOKEN_HERE
```

### 2. Start Your Servers (2 terminals)

**Terminal 1 - Backend:**
```bash
cd C:\Projects\final_bahamm\backend
uvicorn main:app --reload --port 8080
```

**Terminal 2 - Frontend:**
```bash
cd C:\Projects\final_bahamm\frontend
npm run dev
```

### 3. Start ngrok
```bash
# Double-click this file:
C:\Projects\final_bahamm\setup-ngrok.bat
```

Two windows will open showing your ngrok URLs.

### 4. Configure Your App

**Copy URLs from ngrok windows:**
- Frontend: `https://abc123.ngrok-free.app` (from port 3000 window)
- Backend: `https://xyz789.ngrok-free.app` (from port 8080 window)

**Create `.env.local` in frontend folder:**
```bash
# Copy the template:
copy frontend\.env.local.template frontend\.env.local

# Edit frontend\.env.local and replace:
NEXT_PUBLIC_API_URL=https://YOUR-BACKEND-URL.ngrok-free.app/api
```

**Update CORS in backend:**
```bash
# Edit: backend\main.py
# Follow instructions in: backend\cors_update_instructions.txt
# Add your ngrok URLs to the allow_origins list (2 places)
```

**Restart both servers** after updating!

### 5. Configure Telegram Bot

Open Telegram → Search `@BotFather`
```
/mybots
→ Select: Bahamm_bot
→ Bot Settings
→ Menu Button
→ Configure Menu Button
→ Enter: https://YOUR-FRONTEND-URL.ngrok-free.app
```

### 6. Test! 🎉

1. Open Telegram
2. Search for: `@Bahamm_bot`
3. Click the Menu button (☰)
4. Your local app opens!

## 📚 Need More Help?

Read the full guide: `NGROK_SETUP_GUIDE.md`

## 🔍 Debug Tools

- ngrok Inspector: http://localhost:4040
- Frontend: http://localhost:3000
- Backend: http://localhost:8080/docs (FastAPI docs)

## ⚠️ Remember

ngrok free tier URLs change each restart. When you restart ngrok:
1. Get new URLs
2. Update `.env.local`
3. Update `main.py` CORS
4. Restart servers
5. Update Telegram bot URL

---

**Your Bot Info:**
- Username: `@Bahamm_bot`
- Token: `8413343514:AAFiyFNsJUSuEh0aLG9dZxSnSHwAyRPK09E`




