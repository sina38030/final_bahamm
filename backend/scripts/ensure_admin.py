#!/usr/bin/env python3
"""
Ensure the admin user exists in the configured database.
Uses the same DB config and models as the backend.
"""

from app.database import engine, SessionLocal, Base
from app.models import User, UserType
from app.utils.admin import ADMIN_PHONE_NUMBER


def main() -> int:
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        phone = ADMIN_PHONE_NUMBER
        # Normalize to include '+' just in case (matches utils.admin logic)
        if phone and not phone.startswith("+"):
            phone = "+" + phone

        admin = db.query(User).filter(User.phone_number == phone).first()
        if admin:
            print(f"Admin user already exists: id={admin.id}, phone={admin.phone_number}")
            return 0

        admin = User(
            first_name="Admin",
            last_name="User",
            email=None,
            phone_number=phone,
            password=None,
            user_type=UserType.MERCHANT,
            is_phone_verified=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print(f"Admin user created: id={admin.id}, phone={admin.phone_number}")
        return 0
    except Exception as e:
        print(f"Failed to ensure admin user: {e}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())



