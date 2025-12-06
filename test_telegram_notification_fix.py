"""
Test script to verify Telegram notification fixes are working.

Usage:
    python test_telegram_notification_fix.py

This script:
1. Checks if bot token is configured
2. Tests notification service
3. Verifies database has Telegram users
4. Provides guidance on next steps
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.config import get_settings
from app.database import SessionLocal
from app.models import User
from sqlalchemy import func

def check_bot_configuration():
    """Check if Telegram bot token is properly configured."""
    print("🔍 Checking bot configuration...")
    settings = get_settings()
    
    bot_token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
    bot_username = getattr(settings, 'TELEGRAM_BOT_USERNAME', None)
    
    if not bot_token or bot_token == "":
        print("❌ FAILED: Bot token not configured!")
        print("   Please set TELEGRAM_BOT_TOKEN in backend/app/config.py")
        return False
    
    print(f"✅ Bot token configured: {bot_token[:10]}...{bot_token[-10:]}")
    print(f"✅ Bot username: @{bot_username}")
    return True

def check_telegram_users():
    """Check if there are Telegram users in the database."""
    print("\n🔍 Checking for Telegram users in database...")
    
    db = SessionLocal()
    try:
        # Count users with telegram_id
        telegram_users = db.query(User).filter(User.telegram_id.isnot(None)).all()
        count = len(telegram_users)
        
        if count == 0:
            print("⚠️  No Telegram users found in database")
            print("   Users need to authenticate via Telegram mini app first")
            return False
        
        print(f"✅ Found {count} Telegram user(s):")
        for user in telegram_users[:5]:  # Show first 5
            print(f"   - User ID: {user.id}, Telegram ID: {user.telegram_id}, Username: @{user.telegram_username or 'N/A'}")
        
        if count > 5:
            print(f"   ... and {count - 5} more")
        
        return True
    finally:
        db.close()

def check_notification_service():
    """Check if notification service can be imported."""
    print("\n🔍 Checking notification service...")
    
    try:
        from app.services.telegram import telegram_service
        
        is_test_mode = telegram_service.is_test_mode
        if is_test_mode:
            print("⚠️  Telegram service is in TEST MODE")
            print("   No real messages will be sent!")
            print("   Check bot token configuration")
            return False
        
        print("✅ Telegram service initialized successfully")
        print(f"   Bot username: @{telegram_service.bot_username}")
        return True
    except Exception as e:
        print(f"❌ Failed to initialize notification service: {e}")
        return False

def provide_next_steps():
    """Provide guidance on what to do next."""
    print("\n" + "="*60)
    print("📋 NEXT STEPS TO TEST NOTIFICATIONS:")
    print("="*60)
    
    print("\n1. Ensure a user has started your bot:")
    print("   - Open Telegram")
    print("   - Search for @Bahamm_bot")
    print("   - Click START button")
    
    print("\n2. Test notification for a specific user:")
    print("   - Use the test endpoint:")
    print("     curl -X POST http://localhost:8001/admin/test-telegram-notification/{user_id}")
    print("   - Replace {user_id} with a real user ID from the list above")
    
    print("\n3. Test full group join flow:")
    print("   - Leader creates a group in Telegram mini app")
    print("   - Share invite link")
    print("   - Second user joins and pays")
    print("   - Leader should receive notification")
    
    print("\n4. Monitor logs:")
    print("   - Watch backend logs for notification attempts:")
    print("     tail -f backend/logs/app.log | grep -i 'notif\\|telegram'")
    
    print("\n5. Common issues:")
    print("   - If 'bot can't initiate conversation': User needs to start bot")
    print("   - If test mode: Check bot token configuration")
    print("   - If no Telegram users: Users need to login via mini app")
    
    print("\n" + "="*60)

def main():
    """Main test function."""
    print("="*60)
    print("🧪 TELEGRAM NOTIFICATION FIX - VERIFICATION TEST")
    print("="*60)
    
    # Run checks
    checks = [
        ("Bot Configuration", check_bot_configuration),
        ("Telegram Users", check_telegram_users),
        ("Notification Service", check_notification_service),
    ]
    
    results = []
    for name, check_func in checks:
        try:
            result = check_func()
            results.append((name, result))
        except Exception as e:
            print(f"❌ Error in {name}: {e}")
            results.append((name, False))
    
    # Summary
    print("\n" + "="*60)
    print("📊 VERIFICATION SUMMARY:")
    print("="*60)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")
    
    all_passed = all(result for _, result in results)
    
    if all_passed:
        print("\n🎉 All checks passed! System is ready for testing.")
    else:
        print("\n⚠️  Some checks failed. Please review the issues above.")
    
    provide_next_steps()
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    exit(main())

