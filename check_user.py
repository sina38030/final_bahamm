#!/usr/bin/env python3

import sys
import os
sys.path.append('backend')

from app.database import get_db
from app.models import User, Order
from sqlalchemy.orm import Session

def main():
    db: Session = next(get_db())
    try:
        print("🔍 Checking user 09164223123...")

        # Check if user exists
        user = db.query(User).filter(User.phone_number == '+989164223123').first()
        if user:
            print(f'✅ Found user: ID={user.id}, Phone={user.phone_number}, Name={user.first_name} {user.last_name}')

            # Check user's orders
            orders = db.query(Order).filter(Order.user_id == user.id).all()
            print(f'📦 User has {len(orders)} orders:')
            for order in orders:
                print(f'   Order ID: {order.id}, Status: {order.status}, Amount: {order.total_amount}, Group ID: {order.group_order_id}, Payment Ref: {order.payment_ref_id}')
        else:
            print('❌ User not found with phone +989164223123')

            # Check for similar phone numbers
            similar = db.query(User).filter(User.phone_number.like('%23123%')).all()
            print(f'📊 Similar users found: {len(similar)}')
            for u in similar:
                print(f'   User ID: {u.id}, Phone: {u.phone_number}, Name: {u.first_name} {u.last_name}')

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()