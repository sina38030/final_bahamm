#!/usr/bin/env python3
"""
Quick test script to verify Telegram Bot Token configuration
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

try:
    from app.config import get_settings
    
    settings = get_settings()
    
    print("=" * 60)
    print("Telegram Bot Token Configuration Check")
    print("=" * 60)
    
    if settings.TELEGRAM_BOT_TOKEN:
        # Mask most of the token for security
        token = settings.TELEGRAM_BOT_TOKEN
        if len(token) > 10:
            masked_token = token[:10] + "..." + token[-5:]
        else:
            masked_token = "***"
        
        print(f"✅ Token is set: {masked_token}")
        print(f"   Length: {len(token)} characters")
        
        # Basic format check
        if ":" in token and len(token) > 40:
            print("✅ Token format looks correct")
        else:
            print("⚠️  Token format might be incorrect")
            print("   Expected format: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz")
        
    else:
        print("❌ Token is NOT set or empty")
        print("\nTo fix:")
        print("1. Create a bot with @BotFather on Telegram")
        print("2. Add the token to backend/app/config.py:")
        print("   TELEGRAM_BOT_TOKEN: str = 'YOUR_TOKEN_HERE'")
        print("\nOr create a .env file:")
        print("   TELEGRAM_BOT_TOKEN=YOUR_TOKEN_HERE")
    
    print("=" * 60)
    
    # Check other settings
    print("\nOther Configuration:")
    print(f"  Frontend URL: {settings.FRONTEND_URL}")
    print(f"  Database: {settings.DATABASE_URL}")
    print(f"  Token Expiry: {settings.ACCESS_TOKEN_EXPIRE_MINUTES} minutes")
    
    if settings.TELEGRAM_BOT_TOKEN:
        print("\n✅ Configuration looks good! Restart backend if it's running.")
    else:
        print("\n❌ Please configure TELEGRAM_BOT_TOKEN before using Telegram Mini App")
    
except Exception as e:
    print(f"❌ Error loading configuration: {e}")
    print("\nMake sure you're running this from the project root directory.")
    sys.exit(1)

