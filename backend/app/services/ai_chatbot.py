from __future__ import annotations

from typing import List, Optional
from datetime import datetime
import os

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import SupportMessage, User
from app.utils.admin import ADMIN_PHONE_NUMBER


def _load_openai_client():
    """Lazy import OpenAI client only if API key is present to avoid hard dependency."""
    # First check for hardcoded key, then environment variables
    api_key = "REDACTED"
    if not api_key:
        api_key = os.getenv("OPENAI_API_KEY") or os.getenv("OPENAI_API_TOKEN")
    if not api_key:
        return None, None
    try:
        from openai import OpenAI  # type: ignore
    except Exception:
        return None, None
    return OpenAI(api_key=api_key), api_key


SYSTEM_PROMPT = (
    "You are an AI support agent for an online marketplace app called Bahamm. "
    "Answer in Persian (fa-IR). Be concise and friendly. If the user asks about order status, payments, delivery, or how to use features, "
    "reply with step-by-step guidance. If you don't have enough data, ask a short clarifying question. Do not invent order details."
)

def is_ai_enabled() -> bool:
    """Check database setting and env flag to enable/disable AI replies globally."""
    # Check database setting first
    try:
        from sqlalchemy import text
        db = SessionLocal()
        try:
            result = db.execute(text("SELECT value FROM app_settings WHERE key = 'ai_chatbot_enabled'"))
            row = result.fetchone()
            if row:
                db_flag = (row[0] or "").strip().lower()
                enabled = db_flag in ("1", "true", "yes", "on")
                print(f"[AI Chatbot] Database setting found: {row[0]} -> enabled: {enabled}")
                return enabled
            else:
                print(f"[AI Chatbot] No database setting found for ai_chatbot_enabled")
        finally:
            db.close()
    except Exception as e:
        print(f"[AI Chatbot] Database check failed: {e}")
        pass
    
    # Fallback to environment variable
    flag = (os.getenv("AI_SUPPORT_ENABLED") or "").strip().lower()
    enabled = flag in ("1", "true", "yes", "on")
    print(f"[AI Chatbot] Environment variable fallback: {flag} -> enabled: {enabled}")
    return enabled


def _build_messages_context(history: List[dict[str, str]], user_text: str) -> List[dict[str, str]]:
    messages: List[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    # Keep last ~8 turns for brevity
    for h in history[-16:]:
        messages.append(h)
    messages.append({"role": "user", "content": user_text})
    return messages


def _generate_reply_with_openai(user_text: str, history: List[dict[str, str]]) -> Optional[str]:
    client, api_key = _load_openai_client()
    if not client or not api_key:
        return None
    model = os.getenv("AI_MODEL", "gpt-4o-mini")
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=_build_messages_context(history, user_text),
            temperature=0.4,
            max_tokens=300,
        )
        return (resp.choices[0].message.content or "").strip()
    except Exception:
        return None


def _fallback_rule_based_reply(user_text: str) -> str:
    text = (user_text or "").lower()
    print(f"[AI Chatbot] Generating fallback response for: {text}")
    
    # Extremely simple heuristics (fa and en keywords)
    if any(k in text for k in ["پرداخت", "payment", "authority", "ref id", "رسید"]):
        return "سلام! برای بررسی وضعیت پرداخت، لطفاً شماره سفارش یا کد پیگیری پرداخت را بفرمایید."
    if any(k in text for k in ["ارسال", "delivery", "تحویل", "پیک"]):
        return "سلام! زمان تحویل بسته به آدرس شما متفاوت است. لطفاً شهر/منطقه خود را بفرمایید تا دقیق‌تر راهنمایی کنم."
    if any(k in text for k in ["سفارش", "order", "پیگیری"]):
        return "سلام! برای پیگیری سفارش، لطفاً شماره سفارش را ارسال کنید تا وضعیت را بررسی کنم."
    if any(k in text for k in ["بازگشت", "refund", "مرجوع", "استرداد"]):
        return "سلام! درخواست بازگشت وجه/مرجوعی را می‌توانید ثبت کنید. لطفاً شماره سفارش و شرح کوتاه مشکل را بفرمایید."
    if any(k in text for k in ["سلام", "hello", "hi", "درود"]):
        return "سلام و درود! من دستیار هوش مصنوعی بهام هستم. چطور می‌تونم کمکتون کنم؟"
    
    return "سلام! سوال شما را دریافت کردم. من دستیار هوش مصنوعی بهام هستم و آماده کمک به شما در مورد سفارشات، پرداخت‌ها و خدمات ما هستم. لطفاً کمی بیشتر توضیح دهید تا بهتر بتونم راهنمایی‌تون کنم."


def _fetch_conversation_history(db: Session, admin_id: int, user_id: int, limit: int = 20) -> List[dict[str, str]]:
    rows = (
        db.query(SupportMessage)
        .filter(
            ((SupportMessage.sender_id == user_id) & (SupportMessage.receiver_id == admin_id))
            | ((SupportMessage.sender_id == admin_id) & (SupportMessage.receiver_id == user_id))
        )
        .order_by(SupportMessage.timestamp.asc())
        .all()
    )
    history: List[dict[str, str]] = []
    for r in rows[-limit:]:
        role = "assistant" if r.sender_id == admin_id else "user"
        history.append({"role": role, "content": r.message})
    return history


def maybe_reply_to_user(user_id: int, user_text: str) -> None:
    """Background task: generate an AI reply and save it as an admin message.

    Safe to no-op if admin user or AI provider not configured.
    """
    print(f"[AI Chatbot] Checking if AI is enabled...")
    if not is_ai_enabled():
        print(f"[AI Chatbot] AI is disabled, skipping response")
        return
    
    print(f"[AI Chatbot] AI is enabled, processing message from user {user_id}: {user_text}")
    
    # Create independent session for background task
    db: Session = SessionLocal()
    try:
        # Lookup admin by configured phone number
        phone = ADMIN_PHONE_NUMBER
        if not phone:
            print(f"[AI Chatbot] No admin phone number configured")
            return
        admin: Optional[User] = db.query(User).filter(User.phone_number == phone).first()
        if not admin:
            print(f"[AI Chatbot] Admin user not found with phone: {phone}")
            return

        print(f"[AI Chatbot] Admin found: {admin.id}")
        
        history = _fetch_conversation_history(db, admin.id, user_id)
        print(f"[AI Chatbot] Conversation history loaded: {len(history)} messages")
        
        # Try OpenAI first, then fallback
        ai_text = _generate_reply_with_openai(user_text, history)
        if not ai_text:
            print(f"[AI Chatbot] OpenAI failed, using fallback")
            ai_text = _fallback_rule_based_reply(user_text)
        else:
            print(f"[AI Chatbot] OpenAI response generated")
        
        # Force fallback for now since OpenAI has billing issues
        if not ai_text or "billing" in str(ai_text).lower():
            print(f"[AI Chatbot] Forcing fallback response")
            ai_text = _fallback_rule_based_reply(user_text)

        if ai_text and ai_text.strip():
            print(f"[AI Chatbot] Saving AI response: {ai_text}")
            row = SupportMessage(
                sender_id=admin.id,
                receiver_id=user_id,
                message=ai_text.strip(),
                timestamp=datetime.utcnow(),
            )
            db.add(row)
            db.commit()
            print(f"[AI Chatbot] AI response saved successfully")
        else:
            print(f"[AI Chatbot] No AI response generated")
    except Exception as e:
        print(f"[AI Chatbot] Error: {e}")
        try:
            db.rollback()
        except Exception:
            pass
    finally:
        db.close()


