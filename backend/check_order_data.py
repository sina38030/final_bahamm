#!/usr/bin/env python3
from app.database import get_db
from app.models import Order
from sqlalchemy.orm import sessionmaker

engine = get_db()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

orders = db.query(Order).limit(5).all()
for order in orders:
    print(f'Order ID: {order.id}')
    print(f'Shipping Address: {repr(order.shipping_address)}')
    print(f'Delivery Slot: {repr(order.delivery_slot)}')
    print('---')

db.close()


