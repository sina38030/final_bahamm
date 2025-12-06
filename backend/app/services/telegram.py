import requests
import json
from typing import Optional, Dict, Any
from app.config import get_settings
from app.utils.logging import get_logger

logger = get_logger("telegram_notifications")
settings = get_settings()

class TelegramService:
    def __init__(self):
        self.bot_token = settings.TELEGRAM_BOT_TOKEN
        self.bot_username = getattr(settings, 'TELEGRAM_BOT_USERNAME', 'Bahamm_bot')
        self.base_url = f"https://api.telegram.org/bot{self.bot_token}"
        self.is_test_mode = not self.bot_token or self.bot_token == ""

        if self.is_test_mode:
            logger.warning("⚠️ Telegram bot token not configured. Using test mode - NO REAL MESSAGES WILL BE SENT!")
            logger.warning("   Set TELEGRAM_BOT_TOKEN in config.py to enable Telegram notifications")
        else:
            logger.info(f"✅ Telegram notification service initialized with bot @{self.bot_username}")
            logger.info(f"   Bot token: {self.bot_token[:10]}...{self.bot_token[-10:]}")

    async def send_message(self, telegram_id: str, message: str) -> bool:
        """
        Send a message to a Telegram user

        Args:
            telegram_id: The user's Telegram ID
            message: The message to send

        Returns:
            bool: True if message was sent successfully, False otherwise
        """
        if self.is_test_mode:
            logger.warning(f"⚠️ TELEGRAM IN TEST MODE - Bot token not configured!")
            logger.info(f"[TEST MODE] Would send to {telegram_id}: {message}")
            print(f"*** TELEGRAM MESSAGE TO {telegram_id}: {message} ***")
            return False  # Changed to False to trigger fallback

        try:
            url = f"{self.base_url}/sendMessage"
            data = {
                "chat_id": telegram_id,
                "text": message,
                "parse_mode": "HTML"  # Allow basic formatting
            }

            logger.info(f"📤 Sending Telegram message to {telegram_id} via {url}")
            response = requests.post(url, json=data, timeout=30)

            if response.status_code == 200:
                result = response.json()
                if result.get("ok"):
                    logger.info(f"✅ Telegram message sent successfully to {telegram_id}")
                    return True
                else:
                    error_desc = result.get('description', 'Unknown error')
                    logger.error(f"❌ Telegram API error: {error_desc}")
                    if "bot can't initiate conversation" in error_desc.lower():
                        logger.error(f"   💡 User {telegram_id} needs to start the bot first!")
                        logger.error(f"   💡 User should search for @{getattr(self, 'bot_username', 'your_bot')} in Telegram and click START")
                    return False
            else:
                logger.error(f"❌ Telegram API HTTP error: {response.status_code}")
                logger.error(f"   Response: {response.text[:200]}")
                return False

        except Exception as e:
            logger.error(f"❌ Failed to send Telegram message to {telegram_id}: {str(e)}")
            import traceback
            logger.error(f"   Traceback: {traceback.format_exc()}")
            return False

    async def send_notification(self, telegram_id: str, title: str, message: str, order_id: Optional[int] = None) -> bool:
        """
        Send a formatted notification message

        Args:
            telegram_id: The user's Telegram ID
            title: Notification title
            message: Notification message
            order_id: Optional order ID for deep linking

        Returns:
            bool: True if notification was sent successfully
        """
        # Format the message
        full_message = f"🔔 <b>{title}</b>\n\n{message}"

        if order_id:
            full_message += f"\n\n📦 شماره سفارش: {order_id}"

        return await self.send_message(telegram_id, full_message)

# Create singleton instance
telegram_service = TelegramService()








