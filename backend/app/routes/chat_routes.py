from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.models import ChatMessage, Product, SupportMessage, User
from app.schemas import ChatMessageSend, ChatMessage as ChatMessageSchema, SupportMessage as SupportMessageSchema
from app.utils.security import get_current_user
from app.utils.admin import ADMIN_PHONE_NUMBER
from app.services.ai_chatbot import maybe_reply_to_user

chat_router = APIRouter(prefix="/chat", tags=["chat"])

# In-memory receipt store: { message_id: { delivered: bool, seen_by_user: bool, seen_by_admin: bool } }
_receipts: dict[int, dict[str, bool]] = {}

@chat_router.get("/messages/{product_id}", response_model=List[ChatMessageSchema])
def get_chat_messages(product_id: int, db: Session = Depends(get_db)):
    user_id = 1  # legacy endpoint kept for compatibility
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    seller_id = product.store.merchant_id
    messages = db.query(ChatMessage).filter(
        ChatMessage.product_id == product_id,
        ((ChatMessage.sender_id == user_id) & (ChatMessage.receiver_id == seller_id)) |
        ((ChatMessage.sender_id == seller_id) & (ChatMessage.receiver_id == user_id))
    ).order_by(ChatMessage.timestamp).all()
    return messages

# Admin support chat (user <-> admin by phone)
def _get_admin_user(db: Session) -> User | None:
    phone = ADMIN_PHONE_NUMBER
    if phone and phone.startswith("+"):
        phone = phone
    return db.query(User).filter(User.phone_number == phone).first()

@chat_router.get('/admin/messages', response_model=List[SupportMessageSchema])
def get_support_messages(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    admin = _get_admin_user(db)
    if not admin:
        raise HTTPException(status_code=500, detail='Admin user not configured')
    rows = db.query(SupportMessage).filter(
        ((SupportMessage.sender_id == current_user.id) & (SupportMessage.receiver_id == admin.id)) |
        ((SupportMessage.sender_id == admin.id) & (SupportMessage.receiver_id == current_user.id))
    ).order_by(SupportMessage.timestamp.asc()).all()
    def to_schema(r: SupportMessage) -> SupportMessageSchema:
        sender = 'user' if r.sender_id == current_user.id else 'admin'
        rec = _receipts.get(r.id, {})
        seen = rec.get('seen_by_admin', False) if sender == 'user' else rec.get('seen_by_user', False)
        delivered = rec.get('delivered', True)
        return SupportMessageSchema(id=r.id, sender=sender, message=r.message, timestamp=r.timestamp, delivered=delivered, seen=seen)
    return [to_schema(r) for r in rows]

@chat_router.post('/admin/send', response_model=SupportMessageSchema)
def send_support_message(payload: dict, background_tasks: BackgroundTasks, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    msg = str(payload.get('message') or '').strip()
    if not msg:
        raise HTTPException(status_code=400, detail='Empty message')
    admin = _get_admin_user(db)
    if not admin:
        raise HTTPException(status_code=500, detail='Admin user not configured')
    row = SupportMessage(sender_id=current_user.id, receiver_id=admin.id, message=msg, timestamp=datetime.utcnow())
    db.add(row)
    try:
        db.commit()
        _receipts[row.id] = { 'delivered': True, 'seen_by_user': True, 'seen_by_admin': False }
        # Schedule AI auto-reply in background
        background_tasks.add_task(maybe_reply_to_user, current_user.id, msg)
        return SupportMessageSchema(id=row.id, sender='user', message=row.message, timestamp=row.timestamp, delivered=True, seen=False)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail='Failed to send')

@chat_router.get('/admin/conversations')
def list_conversations(db: Session = Depends(get_db)):
    admin = _get_admin_user(db)
    if not admin:
        raise HTTPException(status_code=500, detail='Admin user not configured')
    rows = db.query(SupportMessage).filter(
        (SupportMessage.sender_id == admin.id) | (SupportMessage.receiver_id == admin.id)
    ).order_by(SupportMessage.timestamp.desc()).all()
    conversations: dict[int, dict] = {}
    for r in rows:
        other_id = r.receiver_id if r.sender_id == admin.id else r.sender_id
        if other_id not in conversations:
            user = db.query(User).filter(User.id == other_id).first()
            conversations[other_id] = {
                'user_id': other_id,
                'name': f"{getattr(user, 'first_name', '') or ''} {getattr(user, 'last_name', '') or ''}".strip() if user else 'کاربر',
                'phone': getattr(user, 'phone_number', None) if user else None,
                'last_message': r.message,
                'last_timestamp': r.timestamp,
            }
    return list(conversations.values())

@chat_router.get('/admin/conversations/{user_id}', response_model=List[SupportMessageSchema])
def get_conversation(user_id: int, db: Session = Depends(get_db)):
    admin = _get_admin_user(db)
    if not admin:
        raise HTTPException(status_code=500, detail='Admin user not configured')
    rows = db.query(SupportMessage).filter(
        ((SupportMessage.sender_id == user_id) & (SupportMessage.receiver_id == admin.id)) |
        ((SupportMessage.sender_id == admin.id) & (SupportMessage.receiver_id == user_id))
    ).order_by(SupportMessage.timestamp.asc()).all()
    def to_schema(r: SupportMessage) -> SupportMessageSchema:
        sender = 'admin' if r.sender_id == admin.id else 'user'
        rec = _receipts.get(r.id, {})
        seen = rec.get('seen_by_user', False) if sender == 'admin' else rec.get('seen_by_admin', False)
        delivered = rec.get('delivered', True)
        return SupportMessageSchema(id=r.id, sender=sender, message=r.message, timestamp=r.timestamp, delivered=delivered, seen=seen)
    return [to_schema(r) for r in rows]

@chat_router.post('/admin/conversations/{user_id}/send', response_model=SupportMessageSchema)
def send_conversation_message(user_id: int, payload: dict, db: Session = Depends(get_db)):
    msg = str(payload.get('message') or '').strip()
    if not msg:
        raise HTTPException(status_code=400, detail='Empty message')
    # Ensure user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    admin = _get_admin_user(db)
    if not admin:
        raise HTTPException(status_code=500, detail='Admin user not configured')
    row = SupportMessage(sender_id=admin.id, receiver_id=user_id, message=msg, timestamp=datetime.utcnow())
    db.add(row)
    try:
        db.commit()
        _receipts[row.id] = { 'delivered': True, 'seen_by_user': False, 'seen_by_admin': True }
        return SupportMessageSchema(id=row.id, sender='admin', message=row.message, timestamp=row.timestamp, delivered=True, seen=False)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail='Failed to send')

# Mark messages seen by user (frontend chat open)
@chat_router.post('/admin/messages/seen')
def mark_seen_by_user(ids: List[int]):
    for mid in ids:
        entry = _receipts.setdefault(mid, { 'delivered': True, 'seen_by_user': False, 'seen_by_admin': False })
        entry['seen_by_user'] = True
    return { 'ok': True }

# Mark messages seen by admin (admin-full conversation open)
@chat_router.post('/admin/conversations/{user_id}/seen')
def mark_seen_by_admin(user_id: int, db: Session = Depends(get_db)):
    admin = _get_admin_user(db)
    if not admin:
        raise HTTPException(status_code=500, detail='Admin user not configured')
    rows = db.query(SupportMessage).filter(
        (SupportMessage.sender_id == user_id) & (SupportMessage.receiver_id == admin.id)
    ).all()
    for r in rows:
        entry = _receipts.setdefault(r.id, { 'delivered': True, 'seen_by_user': False, 'seen_by_admin': False })
        entry['seen_by_admin'] = True
    return { 'ok': True }

# Test endpoint for AI chatbot (no auth required)
@chat_router.post('/test-ai')
def test_ai_chatbot(payload: dict, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Test endpoint to trigger AI chatbot without authentication"""
    msg = str(payload.get('message') or '').strip()
    if not msg:
        raise HTTPException(status_code=400, detail='Empty message')
    
    # Use a test user ID (you can change this to any existing user ID)
    test_user_id = 1
    
    # Trigger AI response
    background_tasks.add_task(maybe_reply_to_user, test_user_id, msg)
    
    return {
        'message': 'AI chatbot test triggered',
        'user_message': msg,
        'test_user_id': test_user_id
    }