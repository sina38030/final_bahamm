"""
Test Telegram Mini App authentication
This script helps debug why Telegram login is failing
"""

import sys
import hashlib
import hmac
from urllib.parse import parse_qsl
import io

# Fix Windows encoding issues
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Test with both tokens to see which one works
OLD_TOKEN = "<YOUR_TELEGRAM_BOT_TOKEN>"
NEW_TOKEN = "8401301600:AAESD_wvk1dw0O9HQT_jNkWIdlpCp5GNlwc"

def verify_telegram_init_data(init_data: str, bot_token: str) -> bool:
    """
    Verify the authenticity of Telegram WebApp initData.
    """
    try:
        # Parse the init_data query string
        parsed_data = dict(parse_qsl(init_data))
        
        # Extract the hash
        received_hash = parsed_data.pop('hash', None)
        if not received_hash:
            print(f"  ❌ No hash found in initData")
            return False
        
        # Create data-check-string: sorted key=value pairs joined with \n
        data_check_string = '\n'.join(
            f"{k}={v}" for k, v in sorted(parsed_data.items())
        )
        
        # Create secret key: HMAC-SHA256(bot_token, "WebAppData")
        secret_key = hmac.new(
            key=b"WebAppData",
            msg=bot_token.encode(),
            digestmod=hashlib.sha256
        ).digest()
        
        # Calculate hash: HMAC-SHA256(data-check-string, secret_key)
        calculated_hash = hmac.new(
            key=secret_key,
            msg=data_check_string.encode(),
            digestmod=hashlib.sha256
        ).hexdigest()
        
        # Compare hashes
        is_valid = calculated_hash == received_hash
        
        if is_valid:
            print(f"  ✅ Verification SUCCESSFUL")
        else:
            print(f"  ❌ Verification FAILED")
            print(f"     Expected hash: {calculated_hash}")
            print(f"     Received hash: {received_hash}")
            
        return is_valid
        
    except Exception as e:
        print(f"  ❌ Error: {str(e)}")
        return False

def main():
    print("\n" + "="*60)
    print("Telegram Mini App Token Verification Test")
    print("="*60 + "\n")
    
    # Instructions
    print("📋 Instructions:")
    print("1. Open your Telegram Mini App")
    print("2. Open browser console (F12)")
    print("3. Type: Telegram.WebApp.initData")
    print("4. Copy the entire string")
    print("5. Paste it below when prompted")
    print("\n" + "-"*60 + "\n")
    
    # Get initData from user
    init_data = input("Paste your initData here and press Enter:\n").strip()
    
    if not init_data:
        print("\n❌ Error: No initData provided")
        return
    
    print("\n" + "-"*60)
    print("\n🧪 Testing both tokens...\n")
    
    # Test OLD token
    print("1️⃣  Testing OLD Token (previous):")
    print(f"   Token: {OLD_TOKEN[:20]}...")
    old_result = verify_telegram_init_data(init_data, OLD_TOKEN)
    
    print()
    
    # Test NEW token
    print("2️⃣  Testing NEW Token (current in config.py):")
    print(f"   Token: {NEW_TOKEN[:20]}...")
    new_result = verify_telegram_init_data(init_data, NEW_TOKEN)
    
    print("\n" + "="*60)
    print("📊 RESULTS:")
    print("="*60)
    
    if old_result:
        print("\n✅ OLD Token works! (8413343514...)")
        print("   👉 Action: Change back to old token in config.py")
    elif new_result:
        print("\n✅ NEW Token works! (8401301600...)")
        print("   👉 Action: Token is correct, check other issues")
    else:
        print("\n❌ Neither token works!")
        print("\n   Possible reasons:")
        print("   1. Mini App is configured with a different bot in BotFather")
        print("   2. initData might be expired (they expire after ~1 hour)")
        print("   3. Mini App URL doesn't match in BotFather settings")
        print("\n   👉 Action: Check your @BotFather configuration:")
        print("      - Which bot is the Mini App connected to?")
        print("      - What's the bot token for that bot?")
        print("      - Is the Mini App URL correct (bahamm.ir)?")
    
    print("\n" + "="*60 + "\n")

if __name__ == "__main__":
    main()

