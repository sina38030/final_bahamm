from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.models import ChatMessage, Product
from app.schemas import ChatMessageSend, ChatMessage as ChatMessageSchema

chat_router = APIRouter(prefix="/chat", tags=["chat"])

@chat_router.get("/messages/{product_id}", response_model=List[ChatMessageSchema])
def get_chat_messages(product_id: int, db: Session = Depends(get_db)):
    # TODO: Replace with actual user authentication
    user_id = 1  # Assuming user with ID 1 for now
    
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

@chat_router.post("/send", response_model=ChatMessageSchema, status_code=201)
def send_chat_message(message: ChatMessageSend, db: Session = Depends(get_db)):
    # TODO: Replace with actual user authentication
    sender_id = 1  # Assuming user with ID 1 for now
    
    new_message = ChatMessage(
        sender_id=sender_id,
        receiver_id=message.receiver_id,
        product_id=message.product_id,
        message=message.message,
        timestamp=datetime.utcnow()
    )
    db.add(new_message)

    try:
        db.commit()
        return new_message
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to send message") 