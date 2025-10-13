# Fix: Telegram Mini App Authentication Error

## Problem
Error: "ورود از طریق تلگرام ناموفق بود.لطفا از شماره تلفن استفاده کنید"

**Root Cause**: `TELEGRAM_BOT_TOKEN` is not configured in the backend.

## Solution Steps

### Step 1: Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` command
3. Follow the prompts:
   - **Bot Name**: Choose a name (e.g., "باهم فروشگاه")
   - **Bot Username**: Choose a username ending in "bot" (e.g., "bahamm_shop_bot")
4. **Save the bot token** that BotFather gives you (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Step 2: Configure the Bot for Mini App

1. Send `/mybots` to BotFather
2. Select your bot
3. Choose **"Bot Settings"** → **"Menu Button"**
4. Choose **"Configure Menu Button"**
5. Send your web app URL:
   - **Local Development**: `http://localhost:3000`
   - **Production**: `https://yourdomain.com`
6. Send button text: `🛍 فروشگاه باهم`

### Step 3: Add Bot Token to Backend

#### Option A: Direct Config (Quick Test)

Edit `backend/app/config.py` line 26:

```python
TELEGRAM_BOT_TOKEN: str = "123456789:ABCdefGHIjklMNOpqrsTUVwxyz"  # Replace with your actual token
```

#### Option B: Environment Variable (Recommended)

Create a `.env` file in the project root:

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
```

### Step 4: Restart Backend

After adding the token, restart your backend server:

```bash
# Windows
start_backend.bat

# Or manually
cd backend
python start_server.py
```

### Step 5: Test in Telegram

1. Open your bot in Telegram
2. Tap the **Menu** button at the bottom
3. Select your web app
4. Should now auto-login successfully ✅

## Verification

To verify the token is set correctly, check the backend logs:

```bash
# Look for this log entry when authentication happens:
[auth.routes] Telegram user authenticated: telegram_id=...
```

## Alternative: Disable Telegram Auto-Login (Temporary)

If you don't want to use Telegram authentication yet, you can disable the auto-login attempt in the frontend:

Edit `frontend/src/components/auth/PhoneAuthModal.tsx` line 23-49:

```typescript
// Comment out the Telegram auto-login check
useEffect(() => {
  // if (isOpen && typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
  //   setIsTelegramApp(true);
  //   ... rest of code
  // }
}, [isOpen]);
```

This will make the app always show the phone number login form, even in Telegram.

## Security Notes

⚠️ **Important**: 
- Never commit your bot token to git
- Add `.env` to `.gitignore`
- Use environment variables in production
- Keep your bot token secret

## Testing Without Telegram

To test phone authentication without Telegram:
1. Open the app in a regular browser (not Telegram)
2. Enter your phone number
3. Enter the verification code sent via SMS
4. Login successfully

## Need Help?

If you still get errors:
1. Check `backend/logs/app.log` for error messages
2. Verify bot token is correct (no extra spaces)
3. Make sure backend restarted after adding token
4. Check browser console for frontend errors
5. Verify you're accessing via the correct URL configured in BotFather

## Quick Troubleshooting

| Error | Solution |
|-------|----------|
| "Telegram authentication not configured" | Bot token not set - follow Step 3 |
| "Invalid Telegram authentication data" | Wrong bot token or Mini App URL mismatch |
| Still shows phone login in Telegram | Backend not restarted or token invalid |
| Authentication works but immediately logs out | Check `/users/me` endpoint and JWT token |

---

**Created**: 2025-10-13  
**Issue**: Telegram bot token missing  
**Status**: Configuration required

