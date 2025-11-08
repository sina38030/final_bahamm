from typing import Optional, Dict, Any
from app.models import User
from app.services.sms import sms_service
from app.services.telegram import telegram_service
from app.utils.logging import get_logger

logger = get_logger("notifications")

class NotificationService:

    async def send_notification(
        self,
        user: User,
        title: str,
        message: str,
        order_id: Optional[int] = None,
        group_id: Optional[int] = None
    ) -> Dict[str, bool]:
        """
        Send notification to user via appropriate channel (SMS or Telegram)

        Args:
            user: The user to notify
            title: Notification title
            message: Notification message
            order_id: Optional order ID
            group_id: Optional group ID

        Returns:
            Dict with notification results
        """
        results = {"sms": False, "telegram": False}

        # Determine notification channels based on user type
        should_send_sms = user.phone_number and user.is_phone_verified
        should_send_telegram = user.telegram_id is not None

        if not should_send_sms and not should_send_telegram:
            logger.warning(f"No notification channel available for user {user.id}")
            return results

        # Format messages for each channel
        sms_message = self._format_sms_message(title, message, order_id, group_id)
        telegram_message = self._format_telegram_message(title, message, order_id, group_id)

        # Send SMS notification (for bahamm.ir users)
        if should_send_sms:
            try:
                sms_success = await sms_service.send_sms(user.phone_number, sms_message)
                results["sms"] = sms_success
                if sms_success:
                    logger.info(f"SMS notification sent to user {user.id} ({user.phone_number})")
                else:
                    logger.error(f"Failed to send SMS notification to user {user.id}")
            except Exception as e:
                logger.error(f"Error sending SMS notification to user {user.id}: {str(e)}")

        # Send Telegram notification (for Telegram mini app users)
        if should_send_telegram:
            try:
                telegram_success = await telegram_service.send_notification(
                    str(user.telegram_id), title, telegram_message, order_id
                )
                results["telegram"] = telegram_success
                if telegram_success:
                    logger.info(f"Telegram notification sent to user {user.id} (telegram_id: {user.telegram_id})")
                else:
                    logger.error(f"Failed to send Telegram notification to user {user.id}")
            except Exception as e:
                logger.error(f"Error sending Telegram notification to user {user.id}: {str(e)}")

        return results

    def _format_sms_message(self, title: str, message: str, order_id: Optional[int], group_id: Optional[int]) -> str:
        """Format message for SMS (keep it concise)"""
        sms_text = f"باهم: {message}"

        if order_id:
            sms_text += f" - سفارش {order_id}"
        if group_id:
            sms_text += f" - گروه {group_id}"

        return sms_text

    def _format_telegram_message(self, title: str, message: str, order_id: Optional[int], group_id: Optional[int]) -> str:
        """Format message for Telegram (can include formatting)"""
        telegram_text = message

        if order_id or group_id:
            telegram_text += "\n\n"
            if order_id:
                telegram_text += f"📦 شماره سفارش: <code>{order_id}</code>\n"
            if group_id:
                telegram_text += f"👥 شماره گروه: <code>{group_id}</code>"

        return telegram_text

# Create singleton instance
notification_service = NotificationService()
