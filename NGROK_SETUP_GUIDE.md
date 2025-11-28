# Telegram Mini App - Local Testing with ngrok

## Step 1: ngrok Authentication Setup

ngrok requires a free account for usage. Follow these steps:

1. **Sign up for ngrok (FREE)**:
   - Go to https://ngrok.com/
   - Click "Sign up" and create a free account
   - You can sign up with Google, GitHub, or email

2. **Get your authtoken**:
   - After logging in, go to: https://dashboard.ngrok.com/get-started/your-authtoken
   - Copy your authtoken (it looks like: `2abc...xyz`)

3. **Configure ngrok with your authtoken**:
   ```bash
   # Open PowerShell or Command Prompt
   %USERPROFILE%\ngrok\ngrok.exe config add-authtoken YOUR_AUTH_TOKEN
   ```
   Replace `YOUR_AUTH_TOKEN` with your actual token from step 2

   **Example:**
   ```bash
   %USERPROFILE%\ngrok\ngrok.exe config add-authtoken 2abcDEF123xyz_456GHI789jkl
   ```

## Step 2: Start Your Development Servers

### Terminal 1 - Backend Server:
```bash
cd C:\Projects\final_bahamm\backend
uvicorn main:app --reload --port 8080
```

### Terminal 2 - Frontend Server:
```bash
cd C:\Projects\final_bahamm\frontend
npm run dev
```

## Step 3: Start ngrok Tunnels

Double-click the `setup-ngrok.bat` file or run it from command prompt:
```bash
cd C:\Projects\final_bahamm
setup-ngrok.bat
```

This will open **TWO separate windows**:
- **Window 1**: Frontend tunnel (port 3000)
- **Window 2**: Backend tunnel (port 8080)

## Step 4: Copy the ngrok URLs

From each ngrok window, look for the "Forwarding" line:

**Frontend Window (port 3000):**
```
Forwarding    https://abc123.ngrok-free.app -> http://localhost:3000
```
Copy: `https://abc123.ngrok-free.app`

**Backend Window (port 8080):**
```
Forwarding    https://xyz789.ngrok-free.app -> http://localhost:8080
```
Copy: `https://xyz789.ngrok-free.app`

## Step 5: Update Environment Variables

### Create `.env.local` in frontend folder:

Create file: `C:\Projects\final_bahamm\frontend\.env.local`

```env
NEXT_PUBLIC_API_URL=https://xyz789.ngrok-free.app/api
```

**Replace** `xyz789` with your actual backend ngrok URL!

## Step 6: Update Backend CORS

Edit: `C:\Projects\final_bahamm\backend\main.py`

Find the `allow_origins` list (around line 98 and 134) and add your ngrok URLs:

```python
allow_origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://bahamm.ir",
    "http://bahamm.ir",
    "https://app.bahamm.ir",
    # Add your ngrok URLs here:
    "https://abc123.ngrok-free.app",  # Frontend ngrok URL
    "https://xyz789.ngrok-free.app",  # Backend ngrok URL
],
```

**Replace** `abc123` and `xyz789` with your actual ngrok URLs!

**IMPORTANT**: Restart your backend server after making this change!

## Step 7: Configure Telegram Bot

You have two options:

### Option A: Using BotFather (Easiest)

1. Open Telegram and search for `@BotFather`
2. Send the command: `/mybots`
3. Select your bot: `Bahamm_bot`
4. Choose: **Bot Settings** → **Menu Button** → **Configure Menu Button**
5. Enter your **frontend ngrok URL**: `https://abc123.ngrok-free.app`
6. Done! The bot menu button will now open your local app

### Option B: Using Menu Button URL

1. Open Telegram and go to `@BotFather`
2. Send: `/setmenubutton`
3. Select your bot: `Bahamm_bot`
4. Enter the URL: `https://abc123.ngrok-free.app`
5. Enter a button text (optional): "Open App"

## Step 8: Test Your Mini App

1. Open Telegram (mobile or desktop)
2. Search for and open your bot: `@Bahamm_bot`
3. Click the **Menu button** (☰ icon at bottom-left of chat)
4. Your local development app should open inside Telegram!
5. All changes you make in your code will reflect in real-time

## Step 9: Debug with ngrok Inspector

ngrok provides a web interface for debugging:
- Open: http://localhost:4040
- You can see all HTTP requests and responses
- Very useful for debugging webhook calls from Telegram

## Important Notes

### ngrok Free Tier Limitations:
- URLs change every time you restart ngrok
- You'll need to update the Telegram bot configuration each time
- Consider getting ngrok's paid plan for persistent URLs if testing frequently

### When ngrok URLs Change:
Each time you restart ngrok, repeat:
1. Copy new URLs from ngrok windows
2. Update `.env.local` with new backend URL
3. Update `main.py` CORS with new URLs
4. Restart backend server
5. Update Telegram bot configuration with new frontend URL

### Troubleshooting:

**Problem**: "403 Forbidden" or "ngrok blocked" page
**Solution**: Add this to your ngrok config:
```bash
%USERPROFILE%\ngrok\ngrok.exe config add-ngrok-skip-browser-warning true
```

**Problem**: Can't connect to ngrok API
**Solution**: Make sure you've added your authtoken (see Step 1)

**Problem**: Telegram shows blank page
**Solution**: 
- Check that frontend server is running on port 3000
- Verify the ngrok frontend tunnel is active
- Check browser console for errors in Telegram's web view

**Problem**: Backend API calls fail
**Solution**:
- Check that backend server is running on port 8080
- Verify `.env.local` has correct backend ngrok URL
- Check CORS settings in `main.py`
- Look at ngrok inspector (http://localhost:4040) for request details

## Your Current Bot Configuration:
- Bot Token: `8413343514:AAFiyFNsJUSuEh0aLG9dZxSnSHwAyRPK09E`
- Bot Username: `@Bahamm_bot`
- Mini App Name: `bahamm`

## Quick Reference Commands:

```bash
# Configure ngrok auth (one time only)
%USERPROFILE%\ngrok\ngrok.exe config add-authtoken YOUR_TOKEN

# Start backend
cd C:\Projects\final_bahamm\backend
uvicorn main:app --reload --port 8080

# Start frontend  
cd C:\Projects\final_bahamm\frontend
npm run dev

# Start ngrok tunnels
cd C:\Projects\final_bahamm
setup-ngrok.bat

# View ngrok inspector
start http://localhost:4040
```

## Happy Testing! 🚀

Your Telegram Mini App is now ready for local development and testing!









