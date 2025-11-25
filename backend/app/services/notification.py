from typing import Optional, Dict, Any
from app.models import User, GroupOrderStatus
from app.services.sms import sms_service
from app.services.telegram import telegram_service
from app.utils.logging import get_logger
from app.config import get_settings

logger = get_logger("notifications")

class NotificationService:
    def __init__(self):
        self._settings = get_settings()

    async def send_notification(
        self,
        user: User,
        title: str,
        message: str,
        order_id: Optional[int] = None,
        group_id: Optional[int] = None,
        include_references: bool = True
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
        sms_message = self._format_sms_message(title, message, order_id, group_id, include_references)
        telegram_message = self._format_telegram_message(title, message, order_id, group_id, include_references)

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

    def _format_sms_message(
        self,
        title: str,
        message: str,
        order_id: Optional[int],
        group_id: Optional[int],
        include_references: bool = True
    ) -> str:
        """Format message for SMS (keep it concise)"""
        sms_text = f"باهم: {message}"

        if include_references:
            if order_id:
                sms_text += f" - سفارش {order_id}"
            if group_id:
                sms_text += f" - گروه {group_id}"

        return sms_text

    def _format_telegram_message(
        self,
        title: str,
        message: str,
        order_id: Optional[int],
        group_id: Optional[int],
        include_references: bool = True
    ) -> str:
        """Format message for Telegram (can include formatting)"""
        telegram_text = message

        if include_references and (order_id or group_id):
            telegram_text += "\n\n"
            if order_id:
                telegram_text += f"📦 شماره سفارش: <code>{order_id}</code>\n"
            if group_id:
                telegram_text += f"👥 شماره گروه: <code>{group_id}</code>"

        return telegram_text

    def _groups_orders_link(self) -> str:
        base = (self._settings.get_frontend_public_url or "").strip()
        if not base or "localhost" in base or "127.0.0.1" in base:
            base = "https://bahamm.ir"
        if base.endswith("/"):
            base = base[:-1]
        return f"{base}/groups-orders?tab=groups"

    def get_groups_orders_link(self) -> str:
        """
        Public helper to expose the groups/orders page link for other services.
        """
        return self._groups_orders_link()

    def _leader_has_paid(self, group_order: Any) -> bool:
        if getattr(group_order, "leader_paid_at", None):
            return True
        try:
            leader_id = getattr(group_order, "leader_id", None)
            orders = getattr(group_order, "orders", None)
            if leader_id and orders:
                for order in orders:
                    if getattr(order, "user_id", None) != leader_id:
                        continue
                    if getattr(order, "payment_ref_id", None) or getattr(order, "paid_at", None):
                        return True
        except Exception:
            pass
        return False

    def _build_group_outcome_message(self, group_order: Any) -> Optional[Dict[str, str]]:
        if not group_order:
            return None

        try:
            refund_due_amount = int(getattr(group_order, "refund_due_amount", 0) or 0)
        except Exception:
            refund_due_amount = 0

        needs_refund = refund_due_amount > 0 and getattr(group_order, "refund_paid_at", None) is None

        settlement_amount = int(getattr(group_order, "settlement_amount", 0) or 0)
        needs_payment = (
            (bool(getattr(group_order, "settlement_required", False)) or settlement_amount > 0)
            and getattr(group_order, "settlement_paid_at", None) is None
            and settlement_amount > 0
        )

        link = self._groups_orders_link()
        status = getattr(group_order, "status", None)
        status_value = status.value if isinstance(status, GroupOrderStatus) else str(status or "")

        if needs_refund:
            return {
                "title": "گروه با موفقیت تکمیل شد",
                "message": (
                    "گروه شما با موفقیت تشکیل شد! جهت بازگشت مبلغ لطفا وارد لینک زیر شده و "
                    "شماره کارت خودتون رو ثبت بفرمایید.\n"
                    f"{link}"
                )
            }

        if needs_payment:
            return {
                "title": "تکمیل گروه - پرداخت نهایی",
                "message": (
                    "گروه شما با موفقیت تشکیل شد. لطفا برای نهایی شدن سفارشتون مبلغ باقیمانده رو پرداخت بفرمایید.\n"
                    f"{link}"
                )
            }

        if status_value == GroupOrderStatus.GROUP_FAILED.value and self._leader_has_paid(group_order):
            return {
                "title": "گروه ناموفق شد",
                "message": (
                    "متاسفانه گروه به حد نصاب نرسید. لطفا برای برگشت وجه وارد لینک زیر شده و شماره کارت خود را وارد بفرمایید.\n"
                    f"{link}"
                )
            }

        return {
            "title": "گروه با موفقیت تکمیل شد",
            "message": (
                "گروه شما با موفقیت تشکیل شد. سفارشتون بزودی ارسال خواهد شد.\n"
                f"{link}"
            )
        }

    async def send_group_outcome_notification(self, leader: Optional[User], group_order: Any) -> Dict[str, bool]:
        """
        Send the leader an SMS/Telegram message summarizing the group outcome.
        Decides among: no debt, needs payment, or refund required.
        """
        if not leader or not group_order:
            logger.warning("Cannot send group outcome notification: missing leader or group data")
            return {"sms": False, "telegram": False}

        payload = self._build_group_outcome_message(group_order)
        if not payload:
            logger.warning("Unable to build group outcome notification payload")
            return {"sms": False, "telegram": False}

        try:
            return await self.send_notification(
                user=leader,
                title=payload["title"],
                message=payload["message"],
                group_id=getattr(group_order, "id", None),
                include_references=False
            )
        except Exception as exc:
            logger.error(f"Failed to send group outcome notification: {exc}")
            return {"sms": False, "telegram": False}

# Create singleton instance
notification_service = NotificationService()



