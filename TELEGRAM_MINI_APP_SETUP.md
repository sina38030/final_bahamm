# Telegram Mini App Authentication Setup Guide

This guide explains how to configure and test the Telegram Mini App authentication feature.

## Overview

The application now supports two authentication methods:
1. **Phone Number Verification** - Traditional SMS-based login (for web browsers)
2. **Telegram Mini App Authentication** - Automatic login when accessed from within Telegram

## Prerequisites

- A Telegram Bot (create one via [@BotFather](https://t.me/BotFather))
- Bot Token from BotFather

## Setup Steps

### 1. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` command
3. Follow the prompts to create your bot:
   - Choose a name (e.g., "باهم فروشگاه")
   - Choose a username (e.g., "bahamm_shop_bot")
4. BotFather will give you a **bot token** - save this for later

### 2. Configure Mini App Settings

1. Send `/mybots` to BotFather
2. Select your bot
3. Choose "Bot Settings" → "Menu Button"
4. Choose "Configure Menu Button"
5. Send your web app URL:
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`
6. Send a button text (e.g., "🛍 فروشگاه باهم")

### 3. Configure Backend

Add your bot token to the environment configuration:

**Option 1: Environment Variable (Recommended for production)**

Create or update `.env` file in the project root:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

**Option 2: Direct Configuration (Development only)**

Edit `backend/app/config.py`:
```python
TELEGRAM_BOT_TOKEN: str = "your_bot_token_here"
```

### 4. Run Database Migration

The database migration has already been applied to add Telegram fields to the users table. If you need to run it again:

```bash
python backend/run_telegram_migration.py
```

To rollback:
```bash
python backend/run_telegram_migration.py --rollback
```

### 5. Start the Servers

Start both backend and frontend servers:

```bash
# Backend
cd backend
python start_server.py

# Frontend (in another terminal)
cd frontend
npm run dev
```

## Testing

### Test in Development

1. **Access via Browser:**
   - Open `http://localhost:3000`
   - Should show phone number login form
   - Login works as before with phone verification

2. **Access via Telegram:**
   - Open your bot in Telegram
   - Tap the "Menu" button at the bottom of the chat
   - Select your web app from the menu
   - Should automatically log you in using Telegram credentials

### Verify Authentication Flow

1. **First Time Telegram User:**
   - Opens app in Telegram
   - Gets automatically logged in
   - New user account created with Telegram ID
   - User info populated from Telegram (name, username, photo)

2. **Existing Phone User in Telegram:**
   - Opens app in Telegram for first time
   - If phone number matches, existing account is linked
   - User's Telegram info is added to their account

3. **Returning Telegram User:**
   - Opens app in Telegram
   - Automatically logged in
   - Token stored for 365 days

## How It Works

### Backend Flow

1. Frontend receives `initData` from Telegram WebApp API
2. Backend verifies `initData` signature using HMAC-SHA256 with bot token
3. If valid, extracts Telegram user info (ID, username, name, photo)
4. Searches for user by:
   - First, Telegram ID
   - If not found, tries phone number match (if available)
   - If still not found, creates new user
5. Returns JWT token for session

### Frontend Flow

1. On app load, checks for `window.Telegram.WebApp.initData`
2. If present (in Telegram), calls backend `/auth/telegram-login`
3. If not present (browser), shows phone login form
4. AuthContext manages authentication state

## Security

- **Signature Verification:** All Telegram data is cryptographically verified using HMAC-SHA256
- **Bot Token Security:** Never expose your bot token in frontend code
- **Token Expiry:** JWT tokens expire after 365 days (configurable)
- **Data Validation:** User data is validated on backend before creating/updating accounts

## Database Schema

New fields added to `users` table:

| Field | Type | Description |
|-------|------|-------------|
| `telegram_id` | VARCHAR(50) | Unique Telegram user ID (indexed) |
| `telegram_username` | VARCHAR(100) | Telegram username (optional) |
| `telegram_photo_url` | VARCHAR(500) | Profile photo URL from Telegram |
| `telegram_language_code` | VARCHAR(10) | User's language preference |

## Troubleshooting

### "Telegram authentication not configured" Error

**Cause:** `TELEGRAM_BOT_TOKEN` is not set or empty

**Solution:** Set the bot token in `.env` or `config.py`

### Authentication Fails in Telegram

**Cause:** Bot token mismatch or signature verification failure

**Solutions:**
1. Verify bot token is correct
2. Check backend logs for verification errors
3. Ensure web app URL matches the one configured in BotFather

### Telegram WebApp API Not Available

**Cause:** Telegram script not loaded or app not accessed via Telegram

**Solutions:**
1. Verify `telegram-web-app.js` script is loaded (check browser console)
2. Make sure accessing via Telegram menu button, not direct browser link
3. Try reopening the mini app

### User Gets Logged Out Immediately

**Cause:** Token verification fails or user data fetch fails

**Solutions:**
1. Check backend `/users/me` endpoint is working
2. Verify JWT secret key matches between sessions
3. Check browser console for errors

## API Reference

### POST `/api/auth/telegram-login`

Authenticate user via Telegram Mini App.

**Request Body:**
```json
{
  "init_data": "query_id=...&user={...}&hash=...",
  "init_data_unsafe": {
    "user": {
      "id": 123456789,
      "first_name": "John",
      "last_name": "Doe",
      "username": "johndoe",
      "language_code": "en",
      "photo_url": "https://..."
    },
    "auth_date": 1234567890,
    "hash": "..."
  }
}
```

**Success Response (200):**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid Telegram data signature
- `400 Bad Request` - Invalid or missing user data
- `500 Internal Server Error` - Bot token not configured

## Additional Resources

- [Telegram Mini Apps Documentation](https://core.telegram.org/bots/webapps)
- [Telegram WebApp API Reference](https://core.telegram.org/bots/webapps#initializing-mini-apps)
- [Validating Data Received via Mini App](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)

## Support

For issues or questions:
1. Check backend logs: `backend/logs/app.log`
2. Check browser console for frontend errors
3. Verify bot configuration in BotFather
4. Ensure all migration steps completed successfully

