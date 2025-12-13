from fastapi import APIRouter, Depends, Query, HTTPException, Form, Request, Response
from fastapi import UploadFile
from pathlib import Path
import os
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, text
from typing import Optional, List, Any
from datetime import datetime, timedelta, timezone, date
import json
from pydantic import BaseModel

from app.database import get_db
from app.models import Product, Category, SubCategory, Order, User, UserType, Store, ProductImage, OrderItem, GroupOrder, Favorite, OrderState, Banner, Review, GroupOrderStatus, DeliverySlot
from app.services.group_settlement_service import GroupSettlementService
from app.services import notification_service
from app.utils.logging import get_logger

admin_router = APIRouter(prefix="/admin", tags=["admin"])
logger = get_logger("admin_routes")

# Tehran timezone: UTC+3:30
TEHRAN_TZ = timezone(timedelta(hours=3, minutes=30))

def get_user_display_info(user) -> tuple[str, str]:
    """
    Get display name and identifier for a user.
    Returns (display_name, identifier) where:
    - For Telegram users: (name, @username or TG:telegram_id)
    - For Phone users: (name or phone, phone)
    """
    if not user:
        return ("کاربر مهمان", "")
    
    telegram_id = getattr(user, 'telegram_id', None)
    telegram_username = getattr(user, 'telegram_username', None)
    
    display_name = f"{getattr(user, 'first_name', '') or ''} {getattr(user, 'last_name', '') or ''}".strip()
    
    if telegram_id:
        # Telegram user
        identifier = f"@{telegram_username}" if telegram_username else f"TG:{telegram_id}"
        if not display_name:
            display_name = identifier
        return (display_name, identifier)
    else:
        # Phone user
        phone = getattr(user, 'phone_number', '') or ""
        if phone.startswith('guest_'):
            phone = ""
        if not display_name:
            display_name = phone or "کاربر مهمان"
        return (display_name, phone)

# Ensure new nullable columns exist in SQLite without requiring manual migration
def _ensure_product_position_columns(db: Session):
    try:
        cols = [row[1] for row in db.execute(text("PRAGMA table_info(products)"))]
        missing = []
        if 'home_position' not in cols:
            missing.append('home_position')
        if 'landing_position' not in cols:
            missing.append('landing_position')
        if missing:
            if 'home_position' in missing:
                db.execute(text("ALTER TABLE products ADD COLUMN home_position INTEGER"))
            if 'landing_position' in missing:
                db.execute(text("ALTER TABLE products ADD COLUMN landing_position INTEGER"))
            db.commit()
    except Exception as _e:
        try:
            db.rollback()
        except Exception:
            pass
        # Fail open; routes will still work if columns already exist
        logger.warning(f"ensure columns error: {_e}")

def _format_datetime_with_tz(dt):
    """Format datetime with proper timezone info"""
    if not dt:
        return None
    try:
        # If datetime is naive, assume it's Tehran time (since models default to TEHRAN_TZ)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=TEHRAN_TZ)
        # Convert to Tehran timezone if it's not already
        elif dt.tzinfo != TEHRAN_TZ:
            dt = dt.astimezone(TEHRAN_TZ)
        return dt.isoformat()
    except Exception:
        return dt.isoformat() if dt else None

# Simple in-memory cache with TTL to reduce DB pressure on hot endpoints
_CACHE: dict[str, tuple[float, Any]] = {}

def clear_admin_cache():
    """Clear admin cache for debugging"""
    global _CACHE
    _CACHE.clear()

@admin_router.get("/debug-group/{group_id}")
async def debug_group_info(group_id: int, db: Session = Depends(get_db)):
    """Debug endpoint to check group leader info"""
    group = db.query(GroupOrder).filter(GroupOrder.id == group_id).first()
    if not group:
        return {"error": "Group not found"}
    
    leader = db.query(User).filter(User.id == group.leader_id).first()
    orders = db.query(Order).filter(Order.group_order_id == group_id, Order.is_settlement_payment == False).all()
    
    return {
        "group_id": group.id,
        "leader_id": group.leader_id,
        "leader_phone": getattr(leader, 'phone_number', None) if leader else None,
        "leader_exists": leader is not None,
        "orders": [
            {
                "order_id": o.id,
                "user_id": o.user_id,
                "user_phone": getattr(db.query(User).filter(User.id == o.user_id).first(), 'phone_number', None) if o.user_id else None
            }
            for o in orders
        ]
    }

# Dashboard stats model
class DashboardStats(BaseModel):
    total_products: int
    total_orders: int
    total_users: int
    total_group_buys: int
    recent_orders_count: int

def _cache_get(key: str, ttl_seconds: int) -> Optional[Any]:
    try:
        entry = _CACHE.get(key)
        if not entry:
            return None
        ts, value = entry
        if (datetime.now(TEHRAN_TZ).timestamp() - ts) > ttl_seconds:
            # expired
            _CACHE.pop(key, None)
            return None
        return value
    except Exception:
        return None

def _cache_set(key: str, value: Any) -> None:
    try:
        _CACHE[key] = (datetime.now(TEHRAN_TZ).timestamp(), value)
    except Exception:
        pass

# ---------- Delivery slots helpers ----------
def _daterange(start: date, days: int) -> list[date]:
    return [start + timedelta(days=i) for i in range(days)]

def _parse_time_str(value: str) -> str:
    """Parse time strings robustly.
    - Accept Persian/Arabic-Indic digits (normalize to ASCII)
    - Accept H:MM (e.g., 8:00) and normalize to HH:MM
    - Accept HH (e.g., 12) and normalize to HH:00
    - Require 0 <= HH <= 23 and 0 <= MM <= 59
    """
    def _to_en_digits(s: str) -> str:
        # Map Persian and Arabic-Indic digits to ASCII
        persian = "۰۱۲۳۴۵۶۷۸۹"
        arabic = "٠١٢٣٤٥٦٧٨٩"
        trans = {ord(p): str(i) for i, p in enumerate(persian)}
        trans.update({ord(a): str(i) for i, a in enumerate(arabic)})
        return s.translate(trans)

    s = _to_en_digits((value or "").strip()).replace('：', ':')
    # If only HH provided, default minutes to 00
    if s.isdigit():
        try:
            h = int(s)
        except Exception:
            raise HTTPException(status_code=400, detail="زمان نامعتبر")
        if not (0 <= h <= 23):
            raise HTTPException(status_code=400, detail="زمان نامعتبر")
        return f"{h:02d}:00"
    # Normalize H:MM to HH:MM
    if len(s) == 4 and s[1] == ':':
        s = '0' + s
    if len(s) != 5 or s[2] != ':':
        raise HTTPException(status_code=400, detail="زمان نامعتبر. قالب صحیح HH:MM است")
    hh, mm = s.split(':', 1)
    try:
        h = int(hh)
        m = int(mm)
    except Exception:
        raise HTTPException(status_code=400, detail="زمان نامعتبر")
    if not (0 <= h <= 23 and 0 <= m <= 59):
        raise HTTPException(status_code=400, detail="زمان نامعتبر")
    return f"{h:02d}:{m:02d}"


# Try to resolve a readable shipping address for an order when missing
def _resolve_shipping_address(order: "Order", db: Session) -> Optional[str]:
    try:
        if getattr(order, 'shipping_address', None):
            return order.shipping_address
        # Fallback: use user's default/latest address
        if getattr(order, 'user_id', None):
            try:
                from app.models import UserAddress
                addr = db.query(UserAddress).filter(UserAddress.user_id == order.user_id).order_by(UserAddress.is_default.desc(), UserAddress.id.desc()).first()
                if addr and getattr(addr, 'full_address', None):
                    return addr.full_address
            except Exception:
                return None
    except Exception:
        return None
    return None

# Extract address details if client concatenated them (e.g., "<full> - <details>")
def _split_address_details(address: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    if not address:
        return None, None
    try:
        s = str(address)
        # Split on the last occurrence of " - " to tolerate dashes in the main address
        sep = " - "
        if sep in s:
            head, tail = s.rsplit(sep, 1)
            head = head.strip() or None
            tail = tail.strip() or None
            return head, tail
        return s, None
    except Exception:
        return address, None

# Normalize delivery slot: extract from JSON wrapper if present
def _normalize_delivery_slot(raw_slot: Optional[str]) -> Optional[str]:
    if not raw_slot:
        return raw_slot
    try:
        s = str(raw_slot).strip()
        # If it's a plain string (not JSON), return as-is
        if not s or (not s.startswith("{") and not s.startswith("[")):
            return s
        obj = json.loads(s)
        if isinstance(obj, dict):
            # Prefer common keys used for time slot
            for key in ("delivery_slot", "slot", "time_slot", "time"):
                val = obj.get(key)
                if val:
                    return str(val)
            # If dict has no time-related key (e.g., only {"mode": "group"}), treat as missing slot
            return None
        # Unrecognized JSON types: don't surface raw JSON in UI
        return None
    except Exception:
        # On parse errors, fall back to the raw string
        return raw_slot

# ---------------- Delivery slots admin endpoints ----------------

class SlotInput(BaseModel):
    start_time: str
    end_time: str
    is_active: Optional[bool] = True

class UpsertDayBody(BaseModel):
    date: str  # YYYY-MM-DD (Gregorian)
    slots: List[SlotInput]

class DayOffBody(BaseModel):
    date: str  # YYYY-MM-DD (Gregorian)
    day_off: bool

def _to_date(value: str) -> date:
    try:
        parts = [int(p) for p in value.split('-')]
        if len(parts) != 3:
            raise ValueError
        return date(parts[0], parts[1], parts[2])
    except Exception:
        raise HTTPException(status_code=400, detail="تاریخ نامعتبر. قالب صحیح YYYY-MM-DD است")

@admin_router.get("/delivery-slots/next")
async def get_next_delivery_slots(
    days: int = Query(7, ge=1, le=14),
    db: Session = Depends(get_db)
):
    today_tehran = datetime.now(TEHRAN_TZ).date()
    target_days = _daterange(today_tehran, days)
    rows = (
        db.query(DeliverySlot)
        .filter(DeliverySlot.delivery_date >= target_days[0], DeliverySlot.delivery_date <= target_days[-1])
        .order_by(DeliverySlot.delivery_date.asc(), DeliverySlot.start_time.asc())
        .all()
    )
    by_date: dict[str, dict] = {d.isoformat(): {"date": d.isoformat(), "day_off": False, "slots": []} for d in target_days}
    for r in rows:
        key = r.delivery_date.isoformat()
        if r.is_day_off and r.start_time == "00:00" and r.end_time == "00:00":
            by_date[key]["day_off"] = True
            # Do not include other slots if day-off sentinel exists
            by_date[key]["slots"] = []
            continue
        if not by_date[key]["day_off"]:
            by_date[key]["slots"].append({
                "id": r.id,
                "start_time": r.start_time,
                "end_time": r.end_time,
                "is_active": bool(r.is_active),
            })
    return {"days": list(by_date.values())}

@admin_router.post("/delivery-slots/set-day-off")
async def set_day_off(
    body: DayOffBody,
    db: Session = Depends(get_db)
):
    target = _to_date(body.date)
    existing = db.query(DeliverySlot).filter(DeliverySlot.delivery_date == target).all()
    if body.day_off:
        # Remove other slots and set sentinel
        for e in existing:
            db.delete(e)
        sentinel = DeliverySlot(
            delivery_date=target,
            start_time="00:00",
            end_time="00:00",
            is_active=False,
            is_day_off=True,
        )
        db.add(sentinel)
    else:
        # Remove any sentinel rows
        for e in existing:
            if e.is_day_off:
                db.delete(e)
    db.commit()
    return {"ok": True}

@admin_router.post("/delivery-slots/upsert-day")
async def upsert_day_slots(
    body: UpsertDayBody,
    db: Session = Depends(get_db)
):
    target = _to_date(body.date)
    # Remove existing rows for day (including possible day-off sentinels)
    db.query(DeliverySlot).filter(DeliverySlot.delivery_date == target).delete()
    # Insert new slots
    for s in body.slots:
        start_s = _parse_time_str(s.start_time)
        end_s = _parse_time_str(s.end_time)
        slot = DeliverySlot(
            delivery_date=target,
            start_time=start_s,
            end_time=end_s,
            is_active=bool(s.is_active),
            is_day_off=False,
        )
        db.add(slot)
    db.commit()
    return {"ok": True}

class ToggleBody(BaseModel):
    is_active: bool

@admin_router.patch("/delivery-slots/{slot_id}/toggle")
async def toggle_slot(
    slot_id: int,
    body: ToggleBody,
    db: Session = Depends(get_db)
):
    slot = db.query(DeliverySlot).filter(DeliverySlot.id == slot_id).first()
    if not slot or slot.is_day_off:
        raise HTTPException(status_code=404, detail="اسلات یافت نشد")
    slot.is_active = bool(body.is_active)
    db.commit()
    return {"ok": True}

@admin_router.delete("/delivery-slots/{slot_id}")
async def delete_slot(
    slot_id: int,
    db: Session = Depends(get_db)
):
    slot = db.query(DeliverySlot).filter(DeliverySlot.id == slot_id).first()
    if not slot or slot.is_day_off:
        raise HTTPException(status_code=404, detail="اسلات یافت نشد")
    db.delete(slot)
    db.commit()
    return {"ok": True}

# Dashboard endpoint
@admin_router.get("/dashboard")
async def get_dashboard_stats(
    db: Session = Depends(get_db)
):
    """Get dashboard statistics"""
    total_users = db.query(func.count(User.id)).scalar()
    total_products = db.query(func.count(Product.id)).scalar()
    total_orders = db.query(func.count(Order.id)).scalar()
    total_categories = db.query(func.count(Category.id)).scalar()
    
    # Get recent orders count (last 7 days)
    from datetime import timedelta
    seven_days_ago = datetime.now(TEHRAN_TZ) - timedelta(days=7)
    recent_orders = db.query(func.count(Order.id)).filter(Order.created_at >= seven_days_ago).scalar()
    
    # Get total revenue
    total_revenue = db.query(func.sum(Order.total_amount)).scalar() or 0
    
    return {
        "total_users": total_users,
        "total_products": total_products,
        "total_orders": total_orders,
        "total_categories": total_categories,
        "recent_orders": recent_orders,
        "total_revenue": total_revenue
    }

# Products management
@admin_router.get("/products")
async def get_all_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=1000),
    category_id: Optional[int] = None,
    order: Optional[str] = None,
    db: Session = Depends(get_db)
):
    _ensure_product_position_columns(db)
    """Get all products with optional filtering"""
    query = db.query(Product).filter(Product.is_active == True)
    
    if category_id:
        query = query.filter(Product.category_id == category_id)
    
    # Ordering: allow curated positions for home/landing, otherwise newest first
    if (order or "").lower() == "home":
        try:
            query = query.order_by(Product.home_position.asc().nulls_last(), Product.id.desc())
        except Exception:
            query = query.order_by(Product.home_position.asc(), Product.id.desc())
    elif (order or "").lower() == "landing":
        try:
            query = query.order_by(Product.landing_position.asc().nulls_last(), Product.id.desc())
        except Exception:
            query = query.order_by(Product.landing_position.asc(), Product.id.desc())
    else:
        # Show newest products first so recently added items appear on top
        query = query.order_by(Product.id.desc())

    products = query.offset(skip).limit(limit).all()
    
    # Optimize: Bulk fetch sales and ratings data to avoid N+1 queries
    product_ids = [p.id for p in products]
    
    # Bulk fetch sales data
    sales_data = {}
    if product_ids:
        sales_result = db.query(
            OrderItem.product_id,
            func.coalesce(func.sum(OrderItem.quantity), 0).label('total_sales')
        ).filter(OrderItem.product_id.in_(product_ids)).group_by(OrderItem.product_id).all()
        sales_data = {row.product_id: row.total_sales for row in sales_result}
    
    # Bulk fetch ratings data
    ratings_data = {}
    ratings_count = {}
    if product_ids:
        ratings_result = db.query(
            Review.product_id,
            func.coalesce(func.sum(Review.rating), 0).label('total_rating'),
            func.count(Review.id).label('review_count')
        ).filter(Review.product_id.in_(product_ids)).group_by(Review.product_id).all()
        ratings_data = {row.product_id: row.total_rating for row in ratings_result}
        ratings_count = {row.product_id: row.review_count for row in ratings_result}
    
    return [
        {
            "id": product.id,
            "name": product.name,
            "description": product.description,
            "price": product.base_price,
            "base_price": product.base_price,
            "market_price": product.market_price,
            "product_cost": product.base_price,  # Frontend expects this field
            "solo_price": product.market_price,  # Frontend expects this field
            # Use actual stored values, not calculated ones
            "friend_1_price": product.friend_1_price,
            "friend_2_price": product.friend_2_price,  
            "friend_3_price": product.friend_3_price,
                "home_position": getattr(product, 'home_position', None),
                "landing_position": getattr(product, 'landing_position', None),
            "category_id": product.category_id,
            "category": product.category.name if product.category else "نامشخص",
            "store": product.store.name if product.store else "نامشخص",
            "store_id": product.store_id,
            "subcategory_id": product.subcategory_id,
            "option1_name": product.option1_name,
            "option2_name": product.option2_name,
            "shipping_cost": product.shipping_cost,
            # Display/calculated fields for admin
            "weight_grams": getattr(product, 'weight_grams', None),
            "weight_tolerance_grams": getattr(product, 'weight_tolerance_grams', None),
            # Sales display = seed_offset + (real - baseline) - now using bulk data
            "display_sales": ((getattr(product, 'sales_seed_offset', None) or 0) + (
                sales_data.get(product.id, 0) - (getattr(product, 'sales_seed_baseline', None) or 0)
            )),
            "sales_seed_offset": getattr(product, 'sales_seed_offset', 0),
            "sales_seed_baseline": getattr(product, 'sales_seed_baseline', 0),
            # Rating display combines seeds and review deltas - now using bulk data
            "display_rating": (lambda: (
                lambda s, c: (round(s / c, 2) if c > 0 else 0)
            ))()(
                (getattr(product, 'rating_seed_sum', None) or 0) + (
                    ratings_data.get(product.id, 0) - (getattr(product, 'rating_baseline_sum', None) or 0)
                ),
                1 + (
                    ratings_count.get(product.id, 0) - (getattr(product, 'rating_baseline_count', None) or 0)
                )
            ),
            "rating_seed_sum": (getattr(product, 'rating_seed_sum', None) or 0),
            "rating_baseline_sum": (getattr(product, 'rating_baseline_sum', None) or 0),
            "rating_baseline_count": (getattr(product, 'rating_baseline_count', None) or 0),
            # Include image URLs if available (main image first)
            "images": (
                [
                    img.image_url
                    for img in sorted((product.images or []), key=lambda x: (0 if getattr(x, 'is_main', False) else 1, getattr(x, 'id', 0)))
                ]
                if product.images else []
            )
        }
        for product in products
    ]

@admin_router.post("/products")
async def create_product(
    request: Request,
    db: Session = Depends(get_db)
):
    _ensure_product_position_columns(db)
    """Create a new product - accepts both JSON and form data"""
    try:
        # Try to get JSON data first
        form = None
        try:
            data = await request.json()
        except Exception:
            # If JSON fails, try form data and keep reference to files
            form = await request.form()
            data = dict(form)
        
        # Ensure a default store exists
        store_id = int(data.get("store_id", 1))
        existing_store = db.query(Store).filter(Store.id == store_id).first()
        if not existing_store:
            # Get or create a default admin user for the store
            # NOTE: User model does not have `is_admin`. We treat the first MERCHANT as store owner,
            # falling back to any existing user.
            admin_user = db.query(User).filter(User.user_type == UserType.MERCHANT).first()
            if not admin_user:
                admin_user = db.query(User).first()  # Use any existing user
            if not admin_user:
                # First-run convenience: create a system merchant user to own the default store
                admin_user = User(
                    first_name="System",
                    last_name="Admin",
                    user_type=UserType.MERCHANT,
                    is_phone_verified=True,
                )
                db.add(admin_user)
                db.flush()  # ensure admin_user.id is available
            
            # Create default store
            default_store = Store(
                id=store_id,
                name="فروشگاه باهم",
                description="فروشگاه پیش‌فرض باهم",
                merchant_id=admin_user.id
            )
            db.add(default_store)
            db.commit()
            logger.info(f"Created default store with ID {store_id}")
        
        # Map the data to product fields
        product_data = {
            "name": data.get("name"),
            "description": data.get("description", ""),
            "base_price": float(data.get("product_cost", data.get("base_price", 0))),
            # Prefer explicit market_price if provided; fallback to legacy solo_price
            "market_price": float(data.get("market_price", data.get("solo_price", 0))),
            "category_id": int(data.get("category_id")),
            "store_id": store_id,
            "shipping_cost": float(data.get("shipping_cost", 0)),
            "friend_1_price": float(data.get("friend_1_price", 0)),
            "friend_2_price": float(data.get("friend_2_price", 0)),
            "friend_3_price": float(data.get("friend_3_price", 0))
        }
        # Optional curated positions
        if "home_position" in data:
            try:
                product_data["home_position"] = int(str(data.get("home_position")).strip()) if str(data.get("home_position")).strip() != "" else None
            except Exception:
                pass
        if "landing_position" in data:
            try:
                product_data["landing_position"] = int(str(data.get("landing_position")).strip()) if str(data.get("landing_position")).strip() != "" else None
            except Exception:
                pass
        
        # Handle optional fields
        if data.get("weight_grams"):
            try:
                product_data["weight_grams"] = int(data["weight_grams"])
            except Exception:
                pass
        if data.get("weight_tolerance_grams"):
            try:
                product_data["weight_tolerance_grams"] = int(data["weight_tolerance_grams"])
            except Exception:
                pass
        if data.get("sales_seed_offset"):
            try:
                product_data["sales_seed_offset"] = int(data["sales_seed_offset"])
            except Exception:
                pass
        if data.get("rating_seed_sum"):
            try:
                product_data["rating_seed_sum"] = float(data["rating_seed_sum"])
            except Exception:
                pass

        # Optional curated positions from request
        if "home_position" in data:
            try:
                product_data["home_position"] = int(str(data.get("home_position")).strip()) if str(data.get("home_position")).strip() != "" else None
            except Exception:
                pass
        if "landing_position" in data:
            try:
                product_data["landing_position"] = int(str(data.get("landing_position")).strip()) if str(data.get("landing_position")).strip() != "" else None
            except Exception:
                pass

        # Defaults: assign next positions if not provided
        try:
            if product_data.get("home_position") is None:
                max_home = db.query(func.max(Product.home_position)).scalar() or 0
                product_data["home_position"] = int(max_home) + 1
        except Exception:
            pass
        try:
            if product_data.get("landing_position") is None:
                max_land = db.query(func.max(Product.landing_position)).scalar() or 0
                product_data["landing_position"] = int(max_land) + 1
        except Exception:
            pass

        
        product = Product(**product_data)
        db.add(product)
        db.commit()
        db.refresh(product)

        # Handle image uploads if present in form
        try:
            has_main_image = False
            if form is not None:
                # Build absolute static base URL (main app mounts /static)
                base_url = str(request.base_url)  # e.g. http://127.0.0.1:8001/api/
                root_url = base_url[:-4] if base_url.endswith("/api/") else base_url.rstrip("/")
                static_base = f"{root_url.rstrip('/')}/static"

                # Determine upload directory backend/app/uploads/product_<id>
                from app.utils.logging import get_logger
                uploads_logger = get_logger("uploads")
                backend_dir = Path(__file__).resolve().parents[1]
                uploads_dir = backend_dir / "uploads" / f"product_{product.id}"
                uploads_dir.mkdir(parents=True, exist_ok=True)

                # Debug: log what we received
                uploads_logger.info(f"Creating product {product.id} - form data keys: {list(data.keys())}")
                uploads_logger.info(f"image_url in data: {data.get('image_url', 'NOT_PRESENT')}")
                uploads_logger.info(f"main_image in form: {form.get('main_image') is not None}")

                # Main image (single)
                main_file = form.get("main_image")
                if isinstance(main_file, UploadFile) or hasattr(main_file, "filename"):
                    filename = os.path.basename(getattr(main_file, "filename", "main.jpg"))
                    dest = uploads_dir / f"main_{filename}"
                    try:
                        content = await main_file.read()
                        with open(dest, "wb") as f:
                            f.write(content)
                        # Store absolute URL so frontend can render directly
                        img_url = f"{static_base}/{dest.relative_to(backend_dir / 'uploads').as_posix()}"
                        db.add(ProductImage(product_id=product.id, image_url=img_url, is_main=True))
                        has_main_image = True
                    except Exception as e:
                        uploads_logger.error(f"Failed to save main_image: {e}")

                # Additional images (list)
                try:
                    images_files = form.getlist("images")  # may be empty
                except Exception:
                    images_files = []
                for i, up in enumerate(images_files or []):
                    if not (isinstance(up, UploadFile) or hasattr(up, "filename")):
                        continue
                    filename = os.path.basename(getattr(up, "filename", f"img_{i}.jpg"))
                    dest = uploads_dir / f"{i}_{filename}"
                    try:
                        content = await up.read()
                        with open(dest, "wb") as f:
                            f.write(content)
                        img_url = f"{static_base}/{dest.relative_to(backend_dir / 'uploads').as_posix()}"
                        db.add(ProductImage(product_id=product.id, image_url=img_url, is_main=False))
                    except Exception as e:
                        uploads_logger.error(f"Failed to save image {i}: {e}")

                db.commit()

            # Also support providing image URLs directly (JSON or form fields)
            # Only process URL-based images if NO file was uploaded
            if form is None or not has_main_image:
                try:
                    import json as _json
                    main_image_url = (data.get("image_url") or data.get("main_image_url") or "").strip()
                    if main_image_url and not has_main_image:
                        db.add(ProductImage(product_id=product.id, image_url=str(main_image_url), is_main=True))
                        has_main_image = True

                    raw_extra = data.get("extra_image_urls") or data.get("image_urls") or ""
                    urls = []
                    if isinstance(raw_extra, str) and raw_extra.strip():
                        parsed = None
                        try:
                            parsed = _json.loads(raw_extra)
                        except Exception:
                            parsed = None
                        if isinstance(parsed, list):
                            urls = [str(u).strip() for u in parsed if str(u).strip()]
                        else:
                            urls = [u.strip() for u in str(raw_extra).split(',') if u.strip()]
                    elif isinstance(raw_extra, list):
                        urls = [str(u).strip() for u in raw_extra if str(u).strip()]

                    for u in urls:
                        db.add(ProductImage(product_id=product.id, image_url=str(u), is_main=False))

                    if main_image_url or urls:
                        db.commit()
                except Exception:
                    # ignore URL parsing issues silently
                    pass
        except Exception:
            # Do not fail product creation if image processing fails
            db.rollback()

        return {"message": "Product created successfully", "product_id": product.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@admin_router.put("/products/{product_id}")
async def update_product(
    product_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    _ensure_product_position_columns(db)
    """Update a product"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    try:
        # Try to get JSON data first
        form = None
        try:
            data = await request.json()
        except Exception:
            # If JSON fails, try form data and keep files
            form = await request.form()
            data = dict(form)
        
        # Map the data to product fields
        if "name" in data:
            product.name = data["name"]
        if "description" in data:
            product.description = data["description"]
        if "product_cost" in data or "base_price" in data:
            product.base_price = float(data.get("product_cost", data.get("base_price")))
        if "solo_price" in data or "market_price" in data:
            # Prefer solo_price (admin field for alone purchase); fallback to market_price
            product.market_price = float(data.get("solo_price", data.get("market_price")))
        if "category_id" in data:
            product.category_id = int(data["category_id"])
        if "store_id" in data:
            product.store_id = int(data["store_id"])
        if "shipping_cost" in data:
            product.shipping_cost = float(data["shipping_cost"])
        # Optional admin-overridable fields
        if "weight_grams" in data and data["weight_grams"]:
            try:
                product.weight_grams = int(data["weight_grams"])
                print(f"Updated weight_grams to: {product.weight_grams}")
            except Exception as e:
                print(f"Error updating weight_grams: {e}")
                pass
        if "weight_tolerance_grams" in data and data["weight_tolerance_grams"]:
            try:
                product.weight_tolerance_grams = int(data["weight_tolerance_grams"])
                print(f"Updated weight_tolerance_grams to: {product.weight_tolerance_grams}")
            except Exception as e:
                print(f"Error updating weight_tolerance_grams: {e}")
                pass
        if "sales_seed_offset" in data and data["sales_seed_offset"]:
            try:
                product.sales_seed_offset = int(data["sales_seed_offset"])
                # lock baseline at current total when admin sets seed so that from now on only deltas count
                current_sales_total = db.query(func.coalesce(func.sum(OrderItem.quantity), 0)).filter(OrderItem.product_id == product_id).scalar() or 0
                product.sales_seed_baseline = int(current_sales_total)
                print(f"Updated sales_seed_offset to: {product.sales_seed_offset}")
            except Exception as e:
                print(f"Error updating sales_seed_offset: {e}")
                pass
        if "rating_seed_sum" in data:
            try:
                if "rating_seed_sum" in data and data["rating_seed_sum"]:
                    product.rating_seed_sum = float(data["rating_seed_sum"])
                    print(f"Updated rating_seed_sum to: {product.rating_seed_sum}")
                # Lock baselines at current review aggregates
                from app.models import Review
                current_sum = db.query(func.coalesce(func.sum(Review.rating), 0)).filter(Review.product_id == product_id).scalar() or 0
                current_cnt = db.query(func.count(Review.id)).filter(Review.product_id == product_id).scalar() or 0
                product.rating_baseline_sum = float(current_sum)
                product.rating_baseline_count = int(current_cnt)
            except Exception as e:
                print(f"Error updating rating seeds: {e}")
                pass
        if "friend_1_price" in data:
            product.friend_1_price = float(data["friend_1_price"])
        if "friend_2_price" in data:
            product.friend_2_price = float(data["friend_2_price"])
        if "friend_3_price" in data:
            product.friend_3_price = float(data["friend_3_price"])
        # Curated positions
        if "home_position" in data:
            try:
                raw = str(data.get("home_position")).strip()
                product.home_position = int(raw) if raw != "" else None
            except Exception:
                pass
        if "landing_position" in data:
            try:
                raw = str(data.get("landing_position")).strip()
                product.landing_position = int(raw) if raw != "" else None
            except Exception:
                pass
            
        # Save images if included in form
        has_main_image = False
        if form is not None:
            from pathlib import Path
            import os
            base_url = str(request.base_url)
            root_url = base_url[:-4] if base_url.endswith("/api/") else base_url.rstrip("/")
            static_base = f"{root_url.rstrip('/')}/static"
            backend_dir = Path(__file__).resolve().parents[1]
            uploads_dir = backend_dir / "uploads" / f"product_{product.id}"
            uploads_dir.mkdir(parents=True, exist_ok=True)

            main_file = form.get("main_image")
            if isinstance(main_file, UploadFile) or hasattr(main_file, "filename"):
                filename = os.path.basename(getattr(main_file, "filename", "main.jpg"))
                dest = uploads_dir / f"main_{filename}"
                content = await main_file.read()
                with open(dest, "wb") as f:
                    f.write(content)
                img_url = f"{static_base}/{dest.relative_to(backend_dir / 'uploads').as_posix()}"
                # Mark previous mains as not main
                for img in product.images or []:
                    try:
                        img.is_main = False
                    except Exception:
                        pass
                db.add(ProductImage(product_id=product.id, image_url=img_url, is_main=True))
                has_main_image = True

            try:
                images_files = form.getlist("images")
            except Exception:
                images_files = []
            for i, up in enumerate(images_files or []):
                if not (isinstance(up, UploadFile) or hasattr(up, "filename")):
                    continue
                filename = os.path.basename(getattr(up, "filename", f"img_{i}.jpg"))
                dest = uploads_dir / f"{i}_{filename}"
                content = await up.read()
                with open(dest, "wb") as f:
                    f.write(content)
                img_url = f"{static_base}/{dest.relative_to(backend_dir / 'uploads').as_posix()}"
                db.add(ProductImage(product_id=product.id, image_url=img_url, is_main=False))
        
        # Also support providing image URLs directly (JSON or form fields)
        # Only process URL-based images if NO file was uploaded
        if form is None or not has_main_image:
            try:
                import json as _json
                main_image_url = (data.get("image_url") or data.get("main_image_url") or "").strip()
                if main_image_url and not has_main_image:
                    # Mark previous mains as not main
                    for img in product.images or []:
                        try:
                            img.is_main = False
                        except Exception:
                            pass
                    db.add(ProductImage(product_id=product.id, image_url=str(main_image_url), is_main=True))
                    has_main_image = True

                raw_extra = data.get("extra_image_urls") or data.get("image_urls") or ""
                urls = []
                if isinstance(raw_extra, str) and raw_extra.strip():
                    parsed = None
                    try:
                        parsed = _json.loads(raw_extra)
                    except Exception:
                        parsed = None
                    if isinstance(parsed, list):
                        urls = [str(u).strip() for u in parsed if str(u).strip()]
                    else:
                        urls = [u.strip() for u in str(raw_extra).split(',') if u.strip()]
                elif isinstance(raw_extra, list):
                    urls = [str(u).strip() for u in raw_extra if str(u).strip()]

                for u in urls:
                    db.add(ProductImage(product_id=product.id, image_url=str(u), is_main=False))
            except Exception:
                pass

        db.commit()
        return {"message": "Product updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@admin_router.get("/products/{product_id}/images")
async def list_product_images(
    product_id: int,
    db: Session = Depends(get_db)
):
    """List images for a given product with ids and main flag."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    try:
        images = [
            {"id": img.id, "image_url": img.image_url, "is_main": getattr(img, "is_main", False)}
            for img in (product.images or [])
        ]
        return {"product_id": product.id, "images": images}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@admin_router.post("/products/{product_id}/images")
async def add_product_image(
    product_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Add a new image to a product. Accepts either file upload (image) or image_url. Optional is_main."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    try:
        # Prefer form for files; also supports pure JSON with image_url
        try:
            data = await request.json()
            form = None
        except Exception:
            form = await request.form()
            data = dict(form)

        mark_main = False
        try:
            raw_main = (data.get("is_main") if isinstance(data, dict) else None)
            if raw_main is not None:
                mark_main = str(raw_main).lower() in ("1", "true", "yes", "on")
        except Exception:
            mark_main = False

        created: ProductImage | None = None

        # If file provided
        if form is not None:
            from pathlib import Path
            import os
            base_url = str(request.base_url)
            root_url = base_url[:-4] if base_url.endswith("/api/") else base_url.rstrip("/")
            static_base = f"{root_url.rstrip('/')}/static"
            backend_dir = Path(__file__).resolve().parents[1]
            uploads_dir = backend_dir / "uploads" / f"product_{product.id}"
            uploads_dir.mkdir(parents=True, exist_ok=True)

            up = form.get("image") or form.get("file")
            if isinstance(up, UploadFile) or hasattr(up, "filename"):
                filename = os.path.basename(getattr(up, "filename", "image.jpg"))
                dest = uploads_dir / f"extra_{filename}"
                content = await up.read()
                with open(dest, "wb") as f:
                    f.write(content)
                img_url = f"{static_base}/{dest.relative_to(backend_dir / 'uploads').as_posix()}"
                if mark_main:
                    # Clear previous mains
                    for img in product.images or []:
                        try:
                            img.is_main = False
                        except Exception:
                            pass
                created = ProductImage(product_id=product.id, image_url=img_url, is_main=bool(mark_main))
                db.add(created)
        # If URL provided
        if created is None:
            image_url = (data.get("image_url") or data.get("url") or "").strip() if isinstance(data, dict) else ""
            if not image_url:
                raise HTTPException(status_code=400, detail="image or image_url is required")
            if mark_main:
                for img in product.images or []:
                    try:
                        img.is_main = False
                    except Exception:
                        pass
            created = ProductImage(product_id=product.id, image_url=str(image_url), is_main=bool(mark_main))
            db.add(created)

        db.commit()
        db.refresh(created)
        return {"id": created.id, "image_url": created.image_url, "is_main": getattr(created, "is_main", False)}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@admin_router.delete("/products/{product_id}/images/{image_id}")
async def delete_product_image(
    product_id: int,
    image_id: int,
    db: Session = Depends(get_db)
):
    """Delete a specific image from a product."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    img = db.query(ProductImage).filter(ProductImage.id == image_id, ProductImage.product_id == product_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    try:
        was_main = getattr(img, "is_main", False)
        db.delete(img)
        db.commit()
        # Optionally, promote another image to main if we removed the main image
        if was_main:
            try:
                another = db.query(ProductImage).filter(ProductImage.product_id == product_id).first()
                if another:
                    another.is_main = True
                    db.add(another)
                    db.commit()
            except Exception:
                try:
                    db.rollback()
                except Exception:
                    pass
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@admin_router.put("/products/{product_id}/images/{image_id}/main")
async def set_product_main_image(
    product_id: int,
    image_id: int,
    db: Session = Depends(get_db)
):
    """Mark one image as the main image for the product."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    img = db.query(ProductImage).filter(ProductImage.id == image_id, ProductImage.product_id == product_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    try:
        # Clear previous mains
        for it in product.images or []:
            try:
                it.is_main = False
            except Exception:
                pass
        img.is_main = True
        db.add(img)
        db.commit()
        return {"ok": True}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@admin_router.put("/products/{product_id}/position")
async def update_product_position(
    product_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Lightweight endpoint to update only home/landing positions via JSON or form-data."""
    _ensure_product_position_columns(db)
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    try:
        try:
            data = await request.json()
        except Exception:
            form = await request.form()
            data = dict(form)

        changed = False
        if "home_position" in data:
            try:
                raw = str(data.get("home_position")).strip()
                product.home_position = int(raw) if raw != "" else None
                changed = True
            except Exception:
                pass
        if "landing_position" in data:
            try:
                raw = str(data.get("landing_position")).strip()
                product.landing_position = int(raw) if raw != "" else None
                changed = True
            except Exception:
                pass

        if changed:
            db.add(product)
            db.commit()
            db.refresh(product)

        return {
            "ok": True,
            "id": product.id,
            "home_position": getattr(product, 'home_position', None),
            "landing_position": getattr(product, 'landing_position', None),
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@admin_router.delete("/products/{product_id}")
async def delete_product(
    product_id: int,
    db: Session = Depends(get_db)
):
    """Delete a product"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    try:
        # Check if product has any order items
        order_items_count = db.query(OrderItem).filter(OrderItem.product_id == product_id).count()
        if order_items_count > 0:
            # Soft delete instead of hard delete to preserve order history
            product.is_active = False
            db.add(product)
            db.commit()
            return {"message": "Product archived (soft-deleted) because it is referenced by orders"}
        
        # Check if product has any favorites
        favorites_count = db.query(Favorite).filter(Favorite.product_id == product_id).count()
        if favorites_count > 0:
            # Delete favorites first (these can be safely removed)
            db.query(Favorite).filter(Favorite.product_id == product_id).delete()
        
        # Now delete the product (no references)
        db.delete(product)
        db.commit()
        return {"message": "Product deleted successfully"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

# Categories management
@admin_router.get("/categories")
async def get_all_categories(
    db: Session = Depends(get_db)
):
    """Get all categories"""
    categories = db.query(Category).all()
    return [
        {
            "id": category.id,
            "name": category.name,
            "slug": category.slug,
            "image_url": category.image_url
        }
        for category in categories
    ]

@admin_router.post("/categories")
async def create_category(
    request: Request,
    db: Session = Depends(get_db)
):
    """Create a new category. Supports JSON or multipart form with optional image upload (field: 'image')."""
    try:
        form = None
        try:
            data = await request.json()
        except Exception:
            form = await request.form()
            data = dict(form)

        # If uploading image via form, create placeholder to get id then save file
        if form is not None and (form.get("image") is not None) and not data.get("image_url"):
            # Create placeholder category first
            name = data.get("name")
            if not name:
                raise HTTPException(status_code=400, detail="name is required")
            slug = data.get("slug", name.lower().replace(" ", "-"))
            category = Category(name=name, slug=slug)
            db.add(category)
            db.commit()
            db.refresh(category)

            # Save uploaded image
            up = form.get("image")
            if up and (isinstance(up, UploadFile) or hasattr(up, "filename")):
                base_url = str(request.base_url)
                root_url = base_url[:-4] if base_url.endswith("/api/") else base_url.rstrip("/")
                static_base = f"{root_url.rstrip('/')}/static"
                backend_dir = Path(__file__).resolve().parents[1]
                uploads_dir = backend_dir / "uploads" / f"category_{category.id}"
                uploads_dir.mkdir(parents=True, exist_ok=True)
                filename = os.path.basename(getattr(up, "filename", f"category_{category.id}.jpg"))
                dest = uploads_dir / f"main_{filename}"
                content = await up.read()
                with open(dest, "wb") as f:
                    f.write(content)
                category.image_url = f"{static_base}/{dest.relative_to(backend_dir / 'uploads').as_posix()}"
                db.add(category)
                db.commit()
            return {"message": "Category created successfully", "category_id": category.id, "image_url": category.image_url}

        # JSON path (or form without file)
        cleaned_data = {
            "name": data.get("name"),
            "slug": data.get("slug", data.get("name", "").lower().replace(" ", "-")),
            "image_url": data.get("image_url"),
        }
        cleaned_data = {k: v for k, v in cleaned_data.items() if v is not None}
        if not cleaned_data.get("name"):
            raise HTTPException(status_code=400, detail="name is required")
        category = Category(**cleaned_data)
        db.add(category)
        db.commit()
        db.refresh(category)
        return {"message": "Category created successfully", "category_id": category.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@admin_router.put("/categories/{category_id}")
async def update_category(
    category_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Update a category. Supports JSON or multipart form with optional image upload (field: 'image')."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    try:
        form = None
        try:
            data = await request.json()
        except Exception:
            form = await request.form()
            data = dict(form)

        # Update basic fields (only existing columns)
        for key in ("name", "slug", "image_url"):
            if key in data and data.get(key) is not None:
                setattr(category, key, data.get(key))

        # Handle uploaded image if present
        if form is not None:
            up = form.get("image")
            if up and (isinstance(up, UploadFile) or hasattr(up, "filename")):
                base_url = str(request.base_url)
                root_url = base_url[:-4] if base_url.endswith("/api/") else base_url.rstrip("/")
                static_base = f"{root_url.rstrip('/')}/static"
                backend_dir = Path(__file__).resolve().parents[1]
                uploads_dir = backend_dir / "uploads" / f"category_{category.id}"
                uploads_dir.mkdir(parents=True, exist_ok=True)
                filename = os.path.basename(getattr(up, "filename", f"category_{category.id}.jpg"))
                dest = uploads_dir / f"main_{filename}"
                content = await up.read()
                with open(dest, "wb") as f:
                    f.write(content)
                category.image_url = f"{static_base}/{dest.relative_to(backend_dir / 'uploads').as_posix()}"

        db.add(category)
        db.commit()
        return {"message": "Category updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@admin_router.delete("/categories/{category_id}")
async def delete_category(
    category_id: int,
    db: Session = Depends(get_db)
):
    """Delete a category"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    try:
        # Prevent deleting the default/uncategorized bucket
        if getattr(category, 'slug', None) == 'uncategorized':
            raise HTTPException(status_code=400, detail="Cannot delete the default 'Uncategorized' category")

        # If products exist in this category, reassign them to 'Uncategorized' and clear subcategory
        products_in_cat = db.query(Product).filter(Product.category_id == category_id)
        products_count = products_in_cat.count()
        if products_count > 0:
            # Find or create default category
            default_cat = db.query(Category).filter(Category.slug == 'uncategorized').first()
            if not default_cat:
                default_cat = Category(name='Uncategorized', slug='uncategorized')
                db.add(default_cat)
                db.commit()
                db.refresh(default_cat)
            # Bulk update products: move to default category and clear subcategory to avoid FK issues
            products_in_cat.update({Product.category_id: default_cat.id, Product.subcategory_id: None})

        # Now delete the category
        db.delete(category)
        db.commit()
        return {"message": "Category deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

# Orders management
@admin_router.get("/orders")
async def get_all_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=1000),
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Orders list for admin with group-buy rules.

    - Exclude leader orders awaiting settlement (status == "در انتظار تسویه").
    - Show followers' orders immediately after successful payment, even before group success,
      unless they opted to ship to the leader's address (in that case, show after group finalization
      and leader order finalization).
    - For consolidated shipping (leader enabled), when a group is finalized, emit a consolidated row
      combining the leader order with follower orders that ship to the leader's address.
    """
    # Base pool: non-settlement orders not pending settlement.
    # Include:
    # - Any order with a successful payment (payment_ref_id IS NOT NULL)
    # - Leader's main order if the group's settlement has been paid (even if initial payment_ref_id is NULL)
    # SIMPLIFIED FILTER: Show all non-settlement orders, plus leader orders from finalized groups
    
    # Query 1: Regular orders with payment (including both group and non-group orders)
    # IMPORTANT: This should NOT include invited followers from non-finalized groups
    # Followers should only appear:
    # 1. After group finalization (handled in Query 2 + consolidation logic below)
    # 2. Or if they opted for custom address (handled in Query 3)
    regular_orders_query = (
        db.query(Order)
        .filter(
            Order.is_settlement_payment == False,
            or_(
                Order.payment_ref_id.isnot(None),
                Order.paid_at.isnot(None),
                Order.status.in_(["تکمیل شده", "paid", "completed"]),
                Order.state.in_([OrderState.ALONE_PAID]),
            ),
            Order.status != "در انتظار تسویه"
        )
    )
    
    # Sub-filter: exclude invited followers from non-finalized groups
    # (they should only appear after finalization or with custom address consolidation)
    try:
        # Get IDs of followers in non-finalized groups to exclude from regular_orders_query
        non_finalized_group_followers = (
            db.query(Order.id)
            .join(GroupOrder, Order.group_order_id == GroupOrder.id)
            .filter(
                Order.user_id != GroupOrder.leader_id,  # Is a follower
                GroupOrder.finalized_at.isnull(True)  # Group NOT finalized
            )
            .all()
        )
        follower_ids_to_exclude = [row[0] for row in non_finalized_group_followers]
        if follower_ids_to_exclude:
            regular_orders_query = regular_orders_query.filter(
                Order.id.notin_(follower_ids_to_exclude)
            )
    except Exception as e:
        logger.warning(f"Error filtering non-finalized group followers: {e}")
    
    # Query 2: Leader orders from finalized groups that are settled (regardless of initial payment status)
    leader_orders_query = (
        db.query(Order)
        .join(GroupOrder, Order.group_order_id == GroupOrder.id)
        .filter(
            Order.is_settlement_payment == False,
            Order.user_id == GroupOrder.leader_id,
            GroupOrder.finalized_at.isnot(None),
            # Settlement gating: if settlement is required it must be paid; otherwise allowed
            or_(
                GroupOrder.settlement_required == False,
                GroupOrder.settlement_paid_at.isnot(None)
            ),
            Order.status != "در انتظار تسویه"
        )
    )
    
    # Query 3: Follower orders with custom addresses from groups with consolidation enabled
    # These should always be shown regardless of group finalization status
    # IMPORTANT: Custom address followers always appear in admin because they need independent processing
    custom_address_orders_query = (
        db.query(Order)
        .join(GroupOrder, Order.group_order_id == GroupOrder.id)
        .filter(
            Order.is_settlement_payment == False,
            Order.user_id != GroupOrder.leader_id,  # Not leader (is a follower)
            Order.ship_to_leader_address == False,  # Has custom address (not shipping to leader)
            or_(
                Order.payment_ref_id.isnot(None),
                Order.paid_at.isnot(None),
                Order.status.in_(["تکمیل شده", "paid", "completed", "در انتظار"]),
                Order.state.in_([OrderState.GROUP_SUCCESS, OrderState.ALONE_PAID]),
            ),
            Order.status != "در انتظار تسویه"
        )
    )
    
    # Apply status filtering to all queries before union if needed
    if status:
        # Legacy status filtering - map to states
        if status not in ["paid", "completed"]:
            regular_orders_query = regular_orders_query.filter(Order.state == status)
            leader_orders_query = leader_orders_query.filter(Order.state == status)
            custom_address_orders_query = custom_address_orders_query.filter(Order.state == status)
    
    # Combine all queries using UNION
    base_query = regular_orders_query.union(leader_orders_query).union(custom_address_orders_query)

    orders = base_query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()


    results: list[dict[str, Any]] = []
    consolidated_groups_handled: set[int] = set()

    def serialize_basic(o: Order) -> dict[str, Any]:
        # Determine explicit status set by admin (preferred when present)
        raw_status = str(getattr(o, 'status', '') or '').strip()

        # Base status mapping from state/legacy status (fallback)
        mapped_status = (
            "completed" if getattr(o, 'state', None) == OrderState.ALONE_PAID else (
                "pending" if getattr(o, 'state', None) in [OrderState.GROUP_SUCCESS, OrderState.GROUP_PENDING] else (
                    "cancelled" if getattr(o, 'state', None) == OrderState.GROUP_EXPIRED else ""
                )
            )
        )

        # Start with explicit status if present; otherwise use mapped status
        computed_status = raw_status or mapped_status

        # Override for invited followers ONLY if there is no explicit status
        try:
            group_id_val = getattr(o, 'group_order_id', None)
            if group_id_val is not None:
                group_obj = db.query(GroupOrder).filter(GroupOrder.id == group_id_val).first()
                if group_obj:
                    is_follower = (getattr(group_obj, 'leader_id', None) is None) or (o.user_id != getattr(group_obj, 'leader_id', None))
                    if is_follower and not raw_status:
                        # For followers without an explicit admin status, default to pending
                        if computed_status in (None, '', 'completed'):
                            computed_status = 'pending'
        except Exception:
            # Fail-safe: keep computed_status as-is on any error
            pass

        return {
            "id": o.id,
            "user_id": o.user_id,
            "user_name": (
                (f"{o.user.first_name or ''} {o.user.last_name or ''}".strip() or (o.user.phone_number or ""))
                if o.user else "مهمان"
            ),
            "user_phone": (o.user.phone_number if o.user else None),
            "total_amount": o.total_amount,
            "state": o.state.value if hasattr(o.state, 'value') else str(o.state),
            "status": computed_status,
            "order_type": o.order_type.value if hasattr(o.order_type, 'value') else str(o.order_type),
            "created_at": _format_datetime_with_tz(o.created_at),
            "paid_at": _format_datetime_with_tz(o.paid_at),
            "expires_at": _format_datetime_with_tz(o.expires_at),
            "payment_authority": o.payment_authority,
            "payment_ref_id": o.payment_ref_id,
            **(lambda addr: (lambda main, details: {
                "shipping_address": main,
                "shipping_details": details
            })(*_split_address_details(addr)))(_resolve_shipping_address(o, db)),
            "delivery_slot": _normalize_delivery_slot(o.delivery_slot),
        }

    # Group orders by group_id for batch processing
    orders_by_group = {}
    individual_orders = []
    
    for order in orders:
        group_id = getattr(order, 'group_order_id', None)
        if group_id is None:
            # Non-group: add to individual orders
            individual_orders.append(order)
        else:
            # Group order: add to group batch
            if group_id not in orders_by_group:
                orders_by_group[group_id] = []
            orders_by_group[group_id].append(order)
    
    # Process individual orders first
    for order in individual_orders:
        results.append(serialize_basic(order))
    
    # Process group orders by group
    for group_id, group_orders in orders_by_group.items():
        # Get group info
        try:
            group: Optional[GroupOrder] = db.query(GroupOrder).filter(GroupOrder.id == group_id).first()
        except Exception:
            group = None

        # If consolidation not enabled, apply settlement gating for leader; followers show when paid
        if not group or not getattr(group, 'allow_consolidation', False):
            if not group:
                # No group info available; fallback to basic serialize of pulled orders
                for order in group_orders:
                    results.append(serialize_basic(order))
                continue

            # With group present and consolidation disabled:
            # - Leader appears only when group is finalized AND (no settlement required OR settlement is paid)
            # - Followers appear individually as soon as their own order is paid
            is_finalized = getattr(group, 'status', None) == GroupOrderStatus.GROUP_FINALIZED
            leader_settled = is_finalized and (not getattr(group, 'settlement_required', False) or getattr(group, 'settlement_paid_at', None))

            for order in group_orders:
                is_leader = getattr(order, 'user_id', None) == getattr(group, 'leader_id', None)
                if is_leader:
                    if leader_settled:
                        results.append(serialize_basic(order))
                else:
                    # follower considered 'settled' by its own payment completion
                    if (
                        getattr(order, 'payment_ref_id', None) is not None or
                        getattr(order, 'paid_at', None) is not None or
                        str(getattr(order, 'status', '')).strip() in ("تکمیل شده", "paid", "completed") or
                        getattr(order, 'state', None) == OrderState.ALONE_PAID
                    ):
                        results.append(serialize_basic(order))
            continue
        
        # SPECIAL CASE: For custom address orders from custom_address_orders_query, 
        # always show them regardless of group finalization
        custom_address_orders_from_query = []
        for order in group_orders:
            # Check if this order came from the custom_address_orders_query
            # by checking if it's a follower with custom address and paid
            if (order.user_id != getattr(group, 'leader_id', None) and 
                not getattr(order, 'ship_to_leader_address', False) and
                (getattr(order, 'payment_ref_id', None) is not None or 
                 getattr(order, 'paid_at', None) is not None)):
                custom_address_orders_from_query.append(order)
        
        # Always show custom address orders first
        for custom_order in custom_address_orders_from_query:
            custom_payload = serialize_basic(custom_order)
            custom_payload.update({
                "group_order_id": group_id,
                "custom_address": True,
                "pre_finalization": getattr(group, 'status', None) != GroupOrderStatus.GROUP_FINALIZED,
            })
            results.append(custom_payload)
        
        # Remove custom address orders from further processing
        remaining_group_orders = [o for o in group_orders if o not in custom_address_orders_from_query]
        if not remaining_group_orders:
            continue
        
        # Consolidation enabled by leader - handle all orders in this group with consolidated logic
        # This applies both for finalized and non-finalized groups
            
        # Process remaining orders in this group (both finalized and non-finalized)
        # For finalized groups: show consolidated + individual custom address orders
        # For non-finalized groups: show consolidated pre-finalization + individual custom address orders
        is_finalized = getattr(group, 'status', None) == GroupOrderStatus.GROUP_FINALIZED
        
        # For finalized groups with pending settlement, only show individual custom address orders
        if is_finalized and getattr(group, 'settlement_required', False) and not getattr(group, 'settlement_paid_at', None):
            # Only show orders that have custom addresses (ship_to_leader_address = False)
            for order in remaining_group_orders:
                if not getattr(order, 'ship_to_leader_address', False):
                    individual_payload = serialize_basic(order)
                    individual_payload.update({
                        "group_order_id": group_id,
                        "custom_address": True,
                    })
                    results.append(individual_payload)
            continue
        
        # Identify leader order (by leader_id if possible; else earliest)
        leader_order: Optional[Order] = next(
            (o for o in remaining_group_orders if getattr(o, 'user_id', None) == getattr(group, 'leader_id', None)),
            None,
        )
        if leader_order is None and remaining_group_orders:
            leader_order = sorted(remaining_group_orders, key=lambda x: x.created_at or datetime.now(TEHRAN_TZ))[0]

        # Partition by shipping preference
        consolidated_orders: list[Order] = []
        custom_address_orders: list[Order] = []
        for o in remaining_group_orders:
            if leader_order and getattr(o, 'id', None) == getattr(leader_order, 'id', None):
                consolidated_orders.append(o)
                continue
            if getattr(o, 'ship_to_leader_address', False):
                consolidated_orders.append(o)
            else:
                custom_address_orders.append(o)

        # Only emit consolidated orders if group is finalized
        if is_finalized:
            # Emit consolidated leader payload only if there is at least one follower shipping to leader
            if leader_order and len(consolidated_orders) > 1:
                leader_payload = serialize_basic(leader_order)
                # If any invited follower is marked as "تایید نشده", reflect that state on the consolidated row
                try:
                    any_unapproved = any(
                        (str(getattr(m, 'status', '')) == "تایید نشده")
                        for m in consolidated_orders
                        if not (leader_order and getattr(m, 'id', None) == getattr(leader_order, 'id', None))
                    )
                except Exception:
                    any_unapproved = False
                leader_payload.update({
                    "group_order_id": group_id,
                    "consolidated": True,
                    # Keep both keys for backward compatibility with frontend
                    "consolidated_count": len(consolidated_orders),
                    "consolidated_member_count": max(0, len(consolidated_orders) - 1),
                    "consolidated_order_ids": [o.id for o in consolidated_orders],
                    "pre_finalization": False,
                })
                if any_unapproved:
                    leader_payload["status"] = "تایید نشده"
                results.append(leader_payload)
            elif leader_order:
                # Only leader exists (no follower shipping to leader)
                # Emit leader row only if settlement is not required or already paid
                if not getattr(group, 'settlement_required', False) or getattr(group, 'settlement_paid_at', None):
                    results.append(serialize_basic(leader_order))
        # For non-finalized groups: don't show any consolidated orders or orders shipping to leader
        # They will appear only after group finalization

        # Always emit followers with custom address individually (they don't depend on group finalization)
        for custom_order in custom_address_orders:
            print(f"DEBUG: Processing custom address order {custom_order.id} from group {group_id}")
            custom_payload = serialize_basic(custom_order)
            custom_payload.update({
                "group_order_id": group_id,
                "custom_address": True,
                "pre_finalization": not is_finalized,
            })
            results.append(custom_payload)

    return results

@admin_router.get("/orders/{order_id}")
async def get_order_details(
    order_id: int,
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific order.

    If the order belongs to a consolidated group (leader enabled consolidation and
    follower(s) opted for ship_to_leader_address), return a consolidated structure
    that includes per-participant items so the admin can see products separately.
    """
    try:
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        # Determine whether to return consolidated details
        group_id = getattr(order, 'group_order_id', None)
        group: Optional[GroupOrder] = None
        if group_id is not None:
            try:
                group = db.query(GroupOrder).filter(GroupOrder.id == group_id).first()
            except Exception:
                group = None

        def serialize_items(order_id_val: int) -> list[dict[str, Any]]:
            items = db.query(OrderItem).filter(OrderItem.order_id == order_id_val).all()
            return [
                {
                    "id": it.id,
                    "product_id": it.product_id,
                    "quantity": it.quantity,
                    "base_price": it.base_price,
                    "total_price": it.base_price * it.quantity,
                    "product_name": it.product.name if it.product else "محصول حذف شده",
                }
                for it in items
            ]

        # Determine leader and followers shipping to leader, independent of consolidation flag
        is_leader_order = getattr(order, 'user_id', None) == getattr(group, 'leader_id', None) if group else False

        # Identify eligible orders in this group (leader + any followers shipping to leader)
        group_orders: list[Order] = db.query(Order).filter(
            Order.group_order_id == group_id,
            Order.is_settlement_payment == False,
        ).all()
        if not group_orders:
            # Fallback to single order
            order_items = serialize_items(order.id)
            user = db.query(User).filter(User.id == order.user_id).first() if order.user_id else None
            user_name = (f"{user.first_name or ''} {user.last_name or ''}".strip() if user else "مهمان")
            user_phone = (user.phone_number if user else "")
            return {
                "id": order.id,
                "user_id": order.user_id,
                "user_name": user_name or user_phone or "مهمان",
                "user_phone": user_phone,
                "total_amount": order.total_amount,
                "status": order.status,
                "order_type": order.order_type.value if hasattr(order.order_type, 'value') else str(order.order_type),
                "group_order_id": order.group_order_id,
            "created_at": _format_datetime_with_tz(order.created_at),
            "paid_at": _format_datetime_with_tz(order.paid_at),
                **(lambda addr: (lambda main, details: {
                    "shipping_address": main,
                    "shipping_details": details
                })(*_split_address_details(addr)))(_resolve_shipping_address(order, db)),
                "delivery_slot": _normalize_delivery_slot(order.delivery_slot),
                "items": order_items,
            }

        leader_order: Optional[Order] = next(
            (o for o in group_orders if getattr(o, 'user_id', None) == getattr(group, 'leader_id', None)),
            None,
        )
        if leader_order is None:
            leader_order = sorted(group_orders, key=lambda x: x.created_at or datetime.now(TEHRAN_TZ))[0]

        included_orders: list[Order] = []
        for o in group_orders:
            if getattr(o, 'id', None) == getattr(leader_order, 'id', None):
                included_orders.append(o)
                continue
            if getattr(o, 'ship_to_leader_address', False):
                included_orders.append(o)
        # Ensure leader is first
        included_orders.sort(key=lambda x: 0 if getattr(x, 'id', None) == getattr(leader_order, 'id', None) else 1)

        # Only show consolidated view when the requested order IS the leader's order
        if order.id != getattr(leader_order, 'id', None):
            order_items = serialize_items(order.id)
            user = db.query(User).filter(User.id == order.user_id).first() if order.user_id else None
            user_name = (f"{user.first_name or ''} {user.last_name or ''}".strip() if user else "مهمان")
            user_phone = (user.phone_number if user else "")
            return {
                "id": order.id,
                "user_id": order.user_id,
                "user_name": user_name or user_phone or "مهمان",
                "user_phone": user_phone,
                "total_amount": order.total_amount,
                "status": order.status,
                "order_type": order.order_type.value if hasattr(order.order_type, 'value') else str(order.order_type),
                "group_order_id": order.group_order_id,
                "created_at": _format_datetime_with_tz(order.created_at),
                "paid_at": _format_datetime_with_tz(order.paid_at),
                **(lambda addr: (lambda main, details: {
                    "shipping_address": main,
                    "shipping_details": details
                })(*_split_address_details(addr)))(_resolve_shipping_address(order, db)),
                "delivery_slot": _normalize_delivery_slot(order.delivery_slot),
                "items": order_items,
            }

        # If only leader, return as single
        if len(included_orders) <= 1:
            order_items = serialize_items(order.id)
            user = db.query(User).filter(User.id == order.user_id).first() if order.user_id else None
            user_name = (f"{user.first_name or ''} {user.last_name or ''}".strip() if user else "مهمان")
            user_phone = (user.phone_number if user else "")
            return {
                "id": order.id,
                "user_id": order.user_id,
                "user_name": user_name or user_phone or "مهمان",
                "user_phone": user_phone,
                "total_amount": order.total_amount,
                "status": order.status,
                "order_type": order.order_type.value if hasattr(order.order_type, 'value') else str(order.order_type),
                "group_order_id": order.group_order_id,
            "created_at": _format_datetime_with_tz(order.created_at),
            "paid_at": _format_datetime_with_tz(order.paid_at),
                **(lambda addr: (lambda main, details: {
                    "shipping_address": main,
                    "shipping_details": details
                })(*_split_address_details(addr)))(_resolve_shipping_address(order, db)),
                "delivery_slot": _normalize_delivery_slot(order.delivery_slot),
                "items": order_items,
            }

        # Build consolidated payload
        leader_user = db.query(User).filter(User.id == leader_order.user_id).first() if leader_order.user_id else None
        leader_name = (f"{leader_user.first_name or ''} {leader_user.last_name or ''}".strip() if leader_user else "مهمان")
        leader_phone = (leader_user.phone_number if leader_user else "")

        consolidated_total = sum((o.total_amount or 0) for o in included_orders)
        participants_payload: list[dict[str, Any]] = []
        for o in included_orders:
            u = db.query(User).filter(User.id == o.user_id).first() if o.user_id else None
            pname = (f"{u.first_name or ''} {u.last_name or ''}".strip() if u else "مهمان")
            pphone = (u.phone_number if u else "")
            participants_payload.append({
                "order_id": o.id,
                "user_id": o.user_id,
                "user_name": pname or pphone or "مهمان",
                "user_phone": pphone,
                "telegram_username": u.telegram_username if u else None,
                "telegram_id": u.telegram_id if u else None,
                "items": serialize_items(o.id),
                "total_amount": o.total_amount,
            })

        payload = {
            "id": leader_order.id,
            "user_id": leader_order.user_id,
            "user_name": leader_name or leader_phone or "مهمان",
            "user_phone": leader_phone,
            "total_amount": consolidated_total,
            "status": leader_order.status,
            "order_type": leader_order.order_type.value if hasattr(leader_order.order_type, 'value') else str(leader_order.order_type),
            "group_order_id": group_id,
            "created_at": _format_datetime_with_tz(leader_order.created_at),
            "paid_at": _format_datetime_with_tz(leader_order.paid_at),
            **(lambda addr: (lambda main, details: {
                "shipping_address": main,
                "shipping_details": details
            })(*_split_address_details(addr)))(_resolve_shipping_address(leader_order, db)),
            "delivery_slot": _normalize_delivery_slot(leader_order.delivery_slot),
            "items": serialize_items(leader_order.id),
            "consolidated": True,
            "participants": participants_payload,
        }
        return payload
    except Exception as e:
        import traceback
        print(f"Order details error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@admin_router.put("/orders/{order_id}/status")
async def update_order_status(
    order_id: int,
    request: dict,
    db: Session = Depends(get_db)
):
    """Update order status"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    try:
        new_status = request.get("status")
        order.status = new_status

        # If this order is part of a consolidated (combined) shipment, propagate
        # the new status to all consolidated members so they also see the update
        try:
            group_id_val = getattr(order, 'group_order_id', None)
            if group_id_val:
                group = db.query(GroupOrder).filter(GroupOrder.id == group_id_val).first()
                # Only propagate for combined shipping groups
                if group and getattr(group, 'allow_consolidation', False):
                    # Update leader order and all followers shipping to leader
                    related_orders = db.query(Order).filter(
                        Order.group_order_id == group.id,
                        Order.is_settlement_payment == False
                    ).all()
                    for rel in related_orders:
                        is_leader_order = getattr(rel, 'user_id', None) == getattr(group, 'leader_id', None)
                        ships_to_leader = bool(getattr(rel, 'ship_to_leader_address', False))
                        if is_leader_order or ships_to_leader:
                            rel.status = new_status
        except Exception:
            # Best-effort propagation; do not block main update
            pass

        db.commit()
        return {"message": "Order status updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@admin_router.put("/orders/{order_id}/delivery-slot")
async def update_order_delivery_slot(
    order_id: int,
    request: dict,
    db: Session = Depends(get_db)
):
    """Update order delivery slot"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    delivery_slot = request.get("delivery_slot")
    if delivery_slot is None:
        raise HTTPException(status_code=400, detail="delivery_slot is required")

    try:
        # Store delivery slot as JSON to maintain consistency with existing format
        order.delivery_slot = json.dumps({
            "date": request.get("date"),
            "from": request.get("from"),
            "to": request.get("to"),
            "delivery_slot": delivery_slot
        })
        db.commit()
        return {"message": "Delivery slot updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

# Users management
@admin_router.get("/users")
async def get_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=1000),
    search: Optional[str] = None,
    user_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all users with optional filtering"""
    query = db.query(User)
    
    if search:
        query = query.filter(
            or_(
                User.first_name.contains(search),
                User.last_name.contains(search),
                User.phone_number.contains(search)
            )
        )
    
    if user_type:
        query = query.filter(User.user_type == user_type)
    
    users = query.offset(skip).limit(limit).all()
    
    return [
        {
            "id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone_number": user.phone_number,
            "email": user.email,
            "user_type": user.user_type,
            "registration_method": getattr(user, 'registration_method', None),
            "is_phone_verified": user.is_phone_verified,
            "created_at": user.created_at,
            "coins": getattr(user, 'coins', 0),
        }
        for user in users
    ]

# Admin-only: adjust user coins (absolute set)
@admin_router.put("/users/{user_id}/coins")
async def set_user_coins(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Set user's coins to an absolute value. Body JSON: { "coins": int }"""
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    if not isinstance(body, dict) or "coins" not in body:
        raise HTTPException(status_code=400, detail="'coins' is required")

    try:
        coins_val = int(body.get("coins", 0))
    except Exception:
        raise HTTPException(status_code=400, detail="'coins' must be an integer")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        user.coins = max(0, coins_val)
        db.add(user)
        db.commit()
        return {"message": "Coins updated", "user_id": user.id, "coins": user.coins}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# Admin-only: increment/decrement user coins
@admin_router.post("/users/{user_id}/coins/adjust")
async def adjust_user_coins(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Adjust user's coins by delta. Body JSON: { "delta": int }
    Positive delta adds, negative subtracts (not below zero).
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    if not isinstance(body, dict) or "delta" not in body:
        raise HTTPException(status_code=400, detail="'delta' is required")

    try:
        delta = int(body.get("delta", 0))
    except Exception:
        raise HTTPException(status_code=400, detail="'delta' must be an integer")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        new_val = max(0, int(getattr(user, 'coins', 0)) + delta)
        user.coins = new_val
        db.add(user)
        db.commit()
        return {"message": "Coins adjusted", "user_id": user.id, "coins": user.coins}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# Banners management
@admin_router.get("/banners")
async def get_banners(db: Session = Depends(get_db)):
    banners = db.query(Banner).order_by(Banner.sort_order.asc(), Banner.id.asc()).all()
    return [
        {
            "id": b.id,
            "image_url": b.image_url,
            "title": b.title,
            "description": b.description,
            "sort_order": b.sort_order,
            "is_active": b.is_active,
        }
        for b in banners
    ]

@admin_router.post("/banners")
async def create_banner(request: Request, db: Session = Depends(get_db)):
    form = None
    try:
        data = await request.json()
    except Exception:
        form = await request.form()
        data = dict(form)

    # image can be URL or uploaded file named "image"
    image_url = data.get("image_url")
    title = data.get("title")
    description = data.get("description")
    sort_order = int(data.get("sort_order", 0) or 0)
    is_active = str(data.get("is_active", "true")).lower() not in ("false", "0")

    if form is not None and not image_url:
        # Save uploaded image to uploads/banner_<id>
        up = form.get("image")
        if up and (isinstance(up, UploadFile) or hasattr(up, "filename")):
            # Temporarily create a placeholder banner to get an id
            tmp = Banner(image_url="", title=title, description=description, sort_order=sort_order, is_active=is_active)
            db.add(tmp)
            db.commit()
            db.refresh(tmp)
            base_url = str(request.base_url)
            root_url = base_url[:-4] if base_url.endswith("/api/") else base_url.rstrip("/")
            static_base = f"{root_url.rstrip('/')}/static"
            backend_dir = Path(__file__).resolve().parents[1]
            uploads_dir = backend_dir / "uploads" / f"banner_{tmp.id}"
            uploads_dir.mkdir(parents=True, exist_ok=True)
            filename = os.path.basename(getattr(up, "filename", f"banner_{tmp.id}.jpg"))
            dest = uploads_dir / f"main_{filename}"
            content = await up.read()
            with open(dest, "wb") as f:
                f.write(content)
            image_url = f"{static_base}/{dest.relative_to(backend_dir / 'uploads').as_posix()}"
            tmp.image_url = image_url
            db.add(tmp)
            db.commit()
            return {"message": "Banner created", "id": tmp.id, "image_url": image_url}

    if not image_url:
        raise HTTPException(status_code=400, detail="image or image_url required")

    b = Banner(image_url=image_url, title=title, description=description, sort_order=sort_order, is_active=is_active)
    db.add(b)
    db.commit()
    db.refresh(b)
    return {"message": "Banner created", "id": b.id}

@admin_router.put("/banners/{banner_id}")
async def update_banner(banner_id: int, request: Request, db: Session = Depends(get_db)):
    b = db.query(Banner).filter(Banner.id == banner_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Banner not found")
    form = None
    try:
        data = await request.json()
    except Exception:
        form = await request.form()
        data = dict(form)

    if "title" in data:
        b.title = data.get("title")
    if "description" in data:
        b.description = data.get("description")
    if "sort_order" in data:
        try:
            b.sort_order = int(data.get("sort_order"))
        except Exception:
            pass
    if "is_active" in data:
        val = str(data.get("is_active")).lower()
        b.is_active = val not in ("false", "0")
    # Image URL or uploaded image
    image_url = data.get("image_url")
    if image_url:
        b.image_url = image_url
    if form is not None and not image_url:
        up = form.get("image")
        if up and (isinstance(up, UploadFile) or hasattr(up, "filename")):
            base_url = str(request.base_url)
            root_url = base_url[:-4] if base_url.endswith("/api/") else base_url.rstrip("/")
            static_base = f"{root_url.rstrip('/')}/static"
            backend_dir = Path(__file__).resolve().parents[1]
            uploads_dir = backend_dir / "uploads" / f"banner_{b.id}"
            uploads_dir.mkdir(parents=True, exist_ok=True)
            filename = os.path.basename(getattr(up, "filename", f"banner_{b.id}.jpg"))
            dest = uploads_dir / f"main_{filename}"
            content = await up.read()
            with open(dest, "wb") as f:
                f.write(content)
            b.image_url = f"{static_base}/{dest.relative_to(backend_dir / 'uploads').as_posix()}"
    db.add(b)
    db.commit()
    return {"message": "Banner updated"}

@admin_router.delete("/banners/{banner_id}")
async def delete_banner(banner_id: int, db: Session = Depends(get_db)):
    b = db.query(Banner).filter(Banner.id == banner_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Banner not found")
    db.delete(b)
    db.commit()
    return {"message": "Banner deleted"}

@admin_router.get("/settings")
async def get_admin_settings(db: Session = Depends(get_db)):
    """Return admin-manageable settings used by the storefront."""
    try:
        rows = db.execute(text("SELECT key, value FROM app_settings WHERE key IN ('all_category_image', 'all_category_label', 'fruit_category_image', 'fruit_category_label', 'veggie_category_image', 'veggie_category_label', 'ai_chatbot_enabled')"))
        data = {row[0]: row[1] for row in rows}
        return {
            "all_category_image": data.get("all_category_image"),
            "all_category_label": data.get("all_category_label", "همه"),
            "fruit_category_image": data.get("fruit_category_image"),
            "fruit_category_label": data.get("fruit_category_label", "میوه ها"),
            "veggie_category_image": data.get("veggie_category_image"),
            "veggie_category_label": data.get("veggie_category_label", "صیفی جات"),
            "ai_chatbot_enabled": data.get("ai_chatbot_enabled", "false"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@admin_router.put("/settings")
async def update_admin_settings(request: Request, db: Session = Depends(get_db)):
    """Update settings. Supports JSON or multipart with optional file upload for category icons.

    Accepted fields:
      - all_category_label: string
      - all_category_image: string URL
      - all_category_image_file: file (multipart form) -> saved to /static/site/all-<ts>.ext and URL stored
      - fruit_category_label: string
      - fruit_category_image: string URL
      - fruit_category_image_file: file (multipart form) -> saved to /static/site/fruit-<ts>.ext and URL stored
      - veggie_category_label: string
      - veggie_category_image: string URL
      - veggie_category_image_file: file (multipart form) -> saved to /static/site/veggie-<ts>.ext and URL stored
      - ai_chatbot_enabled: boolean/string
    """
    form = None
    try:
        try:
            data = await request.json()
        except Exception:
            form = await request.form()
            data = dict(form)

        updates: dict[str, str] = {}

        # Handle All category
        label = data.get("all_category_label")
        if label is not None:
            updates["all_category_label"] = str(label)

        image_url = data.get("all_category_image")
        if image_url:
            updates["all_category_image"] = str(image_url)

        # Handle Fruit category
        fruit_label = data.get("fruit_category_label")
        if fruit_label is not None:
            updates["fruit_category_label"] = str(fruit_label)

        fruit_image_url = data.get("fruit_category_image")
        if fruit_image_url:
            updates["fruit_category_image"] = str(fruit_image_url)

        # Handle Veggie category
        veggie_label = data.get("veggie_category_label")
        if veggie_label is not None:
            updates["veggie_category_label"] = str(veggie_label)

        veggie_image_url = data.get("veggie_category_image")
        if veggie_image_url:
            updates["veggie_category_image"] = str(veggie_image_url)

        # Handle AI chatbot toggle
        ai_enabled = data.get("ai_chatbot_enabled")
        if ai_enabled is not None:
            # Convert boolean to string for storage
            if isinstance(ai_enabled, bool):
                updates["ai_chatbot_enabled"] = "true" if ai_enabled else "false"
            else:
                updates["ai_chatbot_enabled"] = str(ai_enabled)

        # Handle uploaded files if present in form
        if form is not None:
            base_url = str(request.base_url)
            root_url = base_url[:-4] if base_url.endswith("/api/") else base_url.rstrip("/")
            static_base = f"{root_url.rstrip('/')}/static"
            backend_dir = Path(__file__).resolve().parents[1]
            uploads_dir = backend_dir / "uploads" / "site"
            uploads_dir.mkdir(parents=True, exist_ok=True)
            import os, time

            # All category file
            up = form.get("all_category_image_file")
            if up and (isinstance(up, UploadFile) or hasattr(up, "filename")):
                filename = os.path.basename(getattr(up, "filename", "all.png"))
                name, ext = os.path.splitext(filename)
                dest = uploads_dir / f"all_{int(time.time())}{ext or '.png'}"
                content = await up.read()
                with open(dest, "wb") as f:
                    f.write(content)
                updates["all_category_image"] = f"{static_base}/{dest.relative_to(backend_dir / 'uploads').as_posix()}"

            # Fruit category file
            fruit_up = form.get("fruit_category_image_file")
            if fruit_up and (isinstance(fruit_up, UploadFile) or hasattr(fruit_up, "filename")):
                filename = os.path.basename(getattr(fruit_up, "filename", "fruit.png"))
                name, ext = os.path.splitext(filename)
                dest = uploads_dir / f"fruit_{int(time.time())}{ext or '.png'}"
                content = await fruit_up.read()
                with open(dest, "wb") as f:
                    f.write(content)
                updates["fruit_category_image"] = f"{static_base}/{dest.relative_to(backend_dir / 'uploads').as_posix()}"

            # Veggie category file
            veggie_up = form.get("veggie_category_image_file")
            if veggie_up and (isinstance(veggie_up, UploadFile) or hasattr(veggie_up, "filename")):
                filename = os.path.basename(getattr(veggie_up, "filename", "veggie.png"))
                name, ext = os.path.splitext(filename)
                dest = uploads_dir / f"veggie_{int(time.time())}{ext or '.png'}"
                content = await veggie_up.read()
                with open(dest, "wb") as f:
                    f.write(content)
                updates["veggie_category_image"] = f"{static_base}/{dest.relative_to(backend_dir / 'uploads').as_posix()}"

        # Persist updates
        for k, v in updates.items():
            db.execute(text("INSERT INTO app_settings(key, value) VALUES (:k, :v) ON CONFLICT(key) DO UPDATE SET value = excluded.value"), {"k": k, "v": v})
        db.commit()

        # Return merged view
        rows = db.execute(text("SELECT key, value FROM app_settings WHERE key IN ('all_category_image', 'all_category_label', 'fruit_category_image', 'fruit_category_label', 'veggie_category_image', 'veggie_category_label', 'ai_chatbot_enabled')"))
        data = {row[0]: row[1] for row in rows}
        return {
            "all_category_image": data.get("all_category_image"),
            "all_category_label": data.get("all_category_label", "همه"),
            "fruit_category_image": data.get("fruit_category_image"),
            "fruit_category_label": data.get("fruit_category_label", "میوه ها"),
            "veggie_category_image": data.get("veggie_category_image"),
            "veggie_category_label": data.get("veggie_category_label", "صیفی جات"),
            "ai_chatbot_enabled": data.get("ai_chatbot_enabled", "false"),
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@admin_router.get("/users/{user_id}")
async def get_user_details(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user orders
    orders = db.query(Order).filter(Order.user_id == user_id).all()
    
    return {
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "phone": user.phone,
        "email": user.email,
        "user_type": user.user_type,
        "is_active": user.is_active,
        "created_at": user.created_at,
        "orders": [
            {
                "id": order.id,
                "total_amount": order.total_amount,
                "status": order.status,
                "created_at": order.created_at
            }
            for order in orders
        ]
    }

# Group buys management
@admin_router.get("/group-buys")
async def get_all_group_buys(
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=1000),
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    response: Response = None
):
    """Get group buys list built off GroupOrder records (with fallbacks)."""
    # Prevent caching to ensure fresh data in admin panel
    if response:
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    
    # Helper to resolve a user's phone number with fallbacks
    def resolve_phone(user_obj, user_id_val: int) -> str:
        try:
            phone = getattr(user_obj, 'phone_number', '') if user_obj else ''
            # Filter out guest phone numbers
            if phone and not phone.startswith('guest_'):
                return phone
            # Fallback: use latest/default address phone
            try:
                from app.models import UserAddress
                addr = db.query(UserAddress).filter(UserAddress.user_id == user_id_val).order_by(UserAddress.is_default.desc(), UserAddress.id.desc()).first()
                if addr and getattr(addr, 'phone_number', None):
                    return addr.phone_number
            except Exception:
                pass
        except Exception:
            pass
        return ""
    
    try:
        logger.info("=== GROUP BUYS LIST ENDPOINT CALLED ===")
        # Clear cache for debugging
        clear_admin_cache()
        cache_key = f"group_buys:{skip}:{limit}:{status or ''}"
        cached = _cache_get(cache_key, ttl_seconds=0)  # Disable cache temporarily
        if cached is not None:
            return cached
        # Prefer GroupOrder table for canonical list
        try:
            # Reduce chance of pool exhaustion under heavy polling by narrowing query quickly
            q = db.query(GroupOrder)
            if status:
                q = q  # placeholder for future status filter
            # Order by creation date descending to show newest groups first
            groups = q.order_by(GroupOrder.created_at.desc()).offset(skip).limit(limit).all()

            # (removed dynamic ZoneInfo usage; using fixed TEHRAN_TZ)
            # Ensure timezone-aware UTC datetimes for safe comparisons/sorts
            def _to_aware_utc(dt):
                try:
                    if dt is None:
                        return None
                    return dt if getattr(dt, "tzinfo", None) else dt.replace(tzinfo=TEHRAN_TZ)
                except Exception:
                    return dt
            rows = []
            for g in groups:
                leader = db.query(User).filter(User.id == g.leader_id).first()
                logger.info(f"DEBUG: Group {g.id}, leader_id={g.leader_id}, leader found: {leader is not None}")
                if leader:
                    phone_val = getattr(leader, 'phone_number', 'NO_PHONE')
                    logger.info(f"DEBUG: Leader phone: {phone_val}")
                # Participants = orders linked to this group
                group_orders = db.query(Order).filter(
                    Order.group_order_id == g.id,
                    Order.is_settlement_payment == False
                ).all()
                # Determine group kind from basket_snapshot metadata (default: primary)
                kind = "primary"
                try:
                    if getattr(g, 'basket_snapshot', None):
                        _meta = json.loads(g.basket_snapshot)
                        if isinstance(_meta, dict):
                            kind = str((_meta.get("kind") or "primary")).lower()
                except Exception:
                    kind = "primary"
                # Followers are non-leader member orders (any state)
                followers_count = 0
                try:
                    followers_count = sum(1 for o in group_orders if getattr(o, 'user_id', None) != getattr(g, 'leader_id', None))
                except Exception:
                    followers_count = 0
                # REMOVED: Business rule that was hiding secondary groups from admin view
                # Secondary groups should be visible in admin regardless of follower count
                # if kind == "secondary" and followers_count < 1:
                #     continue
                
                # Skip primary groups with empty basket and no orders
                if kind == "primary" and not group_orders and not getattr(g, 'basket_snapshot', None):
                    continue
                # Real-time participants = total orders associated with the group (leader + followers)
                participants_count = len(group_orders) if group_orders else 1
                # Paid count strictly by payment evidence
                paid_count = sum(1 for o in group_orders if (getattr(o, 'payment_ref_id', None) is not None or getattr(o, 'paid_at', None) is not None))
                # Determine status mapping to Persian badges
                now_utc = datetime.now(TEHRAN_TZ)
                expires_at_aware = _to_aware_utc(getattr(g, 'expires_at', None))
                is_expired = expires_at_aware is not None and now_utc > expires_at_aware
                # Prefer explicit group status when available
                status_value = None
                try:
                    status_str = g.status.value if hasattr(g.status, 'value') else str(g.status)
                    if status_str == 'GROUP_FINALIZED':
                        status_value = "موفق"
                    elif status_str == 'GROUP_FAILED':
                        status_value = "ناموفق"
                except Exception:
                    pass
                # Only show "موفق" if group has been explicitly finalized OR
                # the group has expired AND at least one non-leader paid.
                # Do NOT show success before expiry unless finalized.
                if status_value is None:
                    # Count paid followers (exclude leader)
                    try:
                        paid_followers = sum(
                            1 for o in group_orders
                            if getattr(o, 'user_id', None) != getattr(g, 'leader_id', None)
                            and (getattr(o, 'payment_ref_id', None) is not None or getattr(o, 'paid_at', None) is not None)
                        )
                    except Exception:
                        paid_followers = 0

                    if is_expired and paid_followers >= 1:
                        status_value = "موفق"
                    elif is_expired and paid_followers < 1:
                        status_value = "ناموفق"
                    else:
                        status_value = "در جریان"
                # (removed leftover tz() helper)
                # Build leader basket: prefer snapshot; otherwise synthesize from leader's order items
                basket_items = []
                if getattr(g, 'basket_snapshot', None):
                    try:
                        snapshot_data = json.loads(g.basket_snapshot) or []
                        # Handle both formats: direct array or object with 'items' key
                        if isinstance(snapshot_data, dict) and 'items' in snapshot_data:
                            basket_items = snapshot_data['items'] or []
                        elif isinstance(snapshot_data, list):
                            basket_items = snapshot_data
                        else:
                            basket_items = []
                    except Exception:
                        basket_items = []
                if not basket_items:
                    # Synthesize from the earliest (leader) order's items
                    leader_order = None
                    if group_orders:
                        leader_order = sorted(group_orders, key=lambda x: _to_aware_utc(getattr(x, 'created_at', None)) or now_utc)[0]
                    if leader_order:
                        order_items = db.query(OrderItem).filter(OrderItem.order_id == leader_order.id).all()
                        for it in order_items:
                            product = it.product if hasattr(it, 'product') else None
                            image_url = None
                            try:
                                if product and getattr(product, 'images', None):
                                    image_url = next((img.image_url for img in product.images if getattr(img, 'is_main', False)), None)
                            except Exception:
                                image_url = None
                            basket_items.append({
                                "product_id": it.product_id,
                                "quantity": it.quantity,
                                "unit_price": it.base_price,
                                "product_name": getattr(product, 'name', None),
                                "market_price": getattr(product, 'market_price', None),
                                "friend_1_price": getattr(product, 'friend_1_price', None),
                                "friend_2_price": getattr(product, 'friend_2_price', None),
                                "friend_3_price": getattr(product, 'friend_3_price', None),
                                "image": image_url,
                            })
                # Determine a best-effort leader user (actual leader or earliest order's user)
                leader_order = None
                if group_orders:
                    leader_order = sorted(group_orders, key=lambda x: _to_aware_utc(getattr(x, 'created_at', None)) or now_utc)[0]
                leader_user = leader or (leader_order.user if leader_order and getattr(leader_order, 'user', None) else None)

                # Use resolve_phone function with fallbacks
                logger.info(f"DEBUG: Processing group {g.id} with leader_id {g.leader_id}")
                logger.info(f"DEBUG: Leader object: {leader}")
                if leader:
                    direct_phone = getattr(leader, 'phone_number', '')
                    logger.info(f"DEBUG: Direct phone from leader: '{direct_phone}'")
                
                # Always use the actual group leader, don't fallback to first order user
                leader_phone = ""
                if leader:
                    leader_phone = getattr(leader, 'phone_number', '') or ""
                    # Filter out guest phone numbers
                    if leader_phone.startswith('guest_'):
                        # Fallback: use latest/default address phone for guest users only
                        try:
                            from app.models import UserAddress
                            addr = db.query(UserAddress).filter(UserAddress.user_id == g.leader_id).order_by(UserAddress.is_default.desc(), UserAddress.id.desc()).first()
                            if addr and getattr(addr, 'phone_number', None):
                                leader_phone = addr.phone_number
                            else:
                                leader_phone = ""
                        except Exception:
                            leader_phone = ""
                
                logger.info(f"DEBUG: Group {g.id}, leader_id={g.leader_id}, identifier='{leader_phone}', name='{leader_phone}'")

                # Use get_user_display_info helper to determine display name and identifier
                display_name, identifier = get_user_display_info(leader)
                
                logger.info(f"DEBUG: Group {g.id}, leader_id={g.leader_id}, identifier='{identifier}', name='{display_name}'")
                # Determine expected_friends if available on GroupOrder; fallback to 1
                try:
                    expected_friends_val = int(getattr(g, 'expected_friends', None) or 1)
                except Exception:
                    expected_friends_val = 1

                rows.append({
                    "id": g.id,
                    "basket": basket_items,
                    "leader_username": display_name,
                    "invite_link": f"/landingM?invite={g.invite_token}",
                    # Frontend (admin-full) expected fields
                    "creator_name": display_name,
                    "creator_phone": identifier,
                    "invite_code": g.invite_token,
                    "product_name": (
                        (basket_items[0].get("product_name") if basket_items and len(basket_items) > 0 and basket_items[0].get("product_name") else f"محصول {basket_items[0].get('product_id', 'نامشخص')}")
                        + (f" و {len(basket_items)-1} مورد دیگر" if basket_items and len(basket_items) > 1 else "")
                    ) if basket_items and len(basket_items) > 0 else "سبد خالی",
                    "participants_count": participants_count,
                    "expected_friends": expected_friends_val,
                    "status": status_value,
                    "kind": kind,
                    "created_at": _format_datetime_with_tz(g.created_at),
                    "deadline_at": _format_datetime_with_tz(g.expires_at),
                    "expires_at": _format_datetime_with_tz(g.expires_at),
                    "formed_at": _format_datetime_with_tz(g.finalized_at),
                })

            _cache_set(cache_key, rows)
            return rows
        except Exception as e:
            # Fallback if new column doesn't exist yet in DB: synthesize from orders
            if "no such column: group_orders.basket_snapshot" not in str(e):
                raise
            # (removed dynamic ZoneInfo usage; using fixed TEHRAN_TZ)
            # Group by group_order_id
            orders = db.query(Order).filter(
                Order.group_order_id.isnot(None),
                Order.is_settlement_payment == False
            ).all()
            groups_map = {}
            for o in orders:
                groups_map.setdefault(o.group_order_id, []).append(o)
            rows = []
            for gid, group_orders in groups_map.items():
                # Choose earliest order as leader approximation
                leader_order = sorted(group_orders, key=lambda x: _to_aware_utc(getattr(x, 'created_at', None)) or now_utc)[0]
                leader = db.query(User).filter(User.id == leader_order.user_id).first() if leader_order.user_id else None
                paid_count = sum(1 for o in group_orders if (getattr(o, 'payment_ref_id', None) is not None or getattr(o, 'paid_at', None) is not None))
                has_success_state = any(getattr(o, 'state', None) == OrderState.GROUP_SUCCESS for o in group_orders)
                participants_count = len(group_orders) if group_orders else 1
                created = leader_order.created_at
                deadline = (created + timedelta(hours=24)) if created else None
                now_utc = datetime.now(TEHRAN_TZ)
                deadline_aware = _to_aware_utc(deadline)
                is_expired = deadline_aware is not None and now_utc > deadline_aware
                if has_success_state or paid_count >= 2 or (is_expired and paid_count >= 1):
                    status_value = "موفق"
                elif is_expired and paid_count < 1:
                    status_value = "ناموفق"
                else:
                    status_value = "در جریان"
                    pass
                # Build synthetic basket from leader order items
                basket_items = []
                order_items = db.query(OrderItem).filter(OrderItem.order_id == leader_order.id).all()
                for it in order_items:
                    product = it.product if hasattr(it, 'product') else None
                    image_url = None
                    try:
                        if product and getattr(product, 'images', None):
                            image_url = next((img.image_url for img in product.images if getattr(img, 'is_main', False)), None)
                    except Exception:
                        image_url = None
                    basket_items.append({
                        "product_id": it.product_id,
                        "quantity": it.quantity,
                        "unit_price": it.base_price,
                        "product_name": getattr(product, 'name', None),
                        "market_price": getattr(product, 'market_price', None),
                        "friend_1_price": getattr(product, 'friend_1_price', None),
                        "friend_2_price": getattr(product, 'friend_2_price', None),
                        "friend_3_price": getattr(product, 'friend_3_price', None),
                        "image": image_url,
                    })
                # Derive invite link from leader order authority prefix
                auth_prefix = (leader_order.payment_authority or '')[:8] if getattr(leader_order, 'payment_authority', None) else ''
                invite_token = f"GB{leader_order.id}{auth_prefix}" if auth_prefix else f"GB{leader_order.id}"
                # Resolve leader phone (user or address) for fallback branch
                leader_phone_fb = ""
                if leader:
                    leader_phone_fb = getattr(leader, 'phone_number', '') or ""
                elif getattr(leader_order, 'user', None):
                    leader_phone_fb = getattr(leader_order.user, 'phone_number', '') or ""
                if not leader_phone_fb:
                    try:
                        from app.models import UserAddress
                        user_id_for_addr = leader.id if leader else (leader_order.user.id if getattr(leader_order, 'user', None) else None)
                        if user_id_for_addr:
                            addr = db.query(UserAddress).filter(UserAddress.user_id == user_id_for_addr).order_by(UserAddress.is_default.desc(), UserAddress.id.desc()).first()
                            if addr and getattr(addr, 'phone_number', None):
                                leader_phone_fb = addr.phone_number
                    except Exception:
                        pass
                display_name = (f"{leader.first_name or ''} {leader.last_name or ''}".strip() if leader else (leader_order.user.first_name if getattr(leader_order, 'user', None) else ""))
                if not display_name:
                    # fallback to phone
                    display_name = leader_phone_fb or "کاربر ناشناس"
                rows.append({
                    "id": gid,
                    "basket": basket_items,
                    "leader_username": display_name,
                    "invite_link": f"/landingM?invite={invite_token}",
                    # Frontend (admin-full) expected fields
                    "creator_name": display_name,
                    "creator_phone": leader_phone_fb,
                    "invite_code": invite_token,
                    "product_name": (
                        (basket_items[0].get("product_name") if basket_items and basket_items[0].get("product_name") else f"محصول {basket_items[0].get('product_id')}")
                        + (f" و {len(basket_items)-1} مورد دیگر" if basket_items and len(basket_items) > 1 else "")
                    ) if basket_items else "سبد خالی",
                    "participants_count": participants_count,
                    "status": status_value,
                    "created_at": _format_datetime_with_tz(created),
                    "deadline_at": _format_datetime_with_tz(deadline),
                    "expires_at": _format_datetime_with_tz(deadline),
                    "formed_at": None,
                })
            _cache_set(cache_key, rows)
            return rows
        
    except HTTPException as e:
        # Preserve intended HTTP status codes (e.g., 404)
        raise e
    except Exception as e:
        # Log the error for debugging
        import traceback
        logger.error(f"Group buys error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@admin_router.get("/group-buys/{group_buy_id}")
async def get_group_buy_details(
    group_buy_id: int,
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific group buy"""
    try:
        # Short-cache each details request separately for 3s
        cache_key = f"group_buy_details:{group_buy_id}"
        cached = _cache_get(cache_key, ttl_seconds=3)
        if cached is not None:
            return cached
        # Try canonical GroupOrder first (tolerate missing snapshot column)
        try:
            group_buy = db.query(GroupOrder).filter(GroupOrder.id == group_buy_id).first()
        except Exception as qe:
            if "no such column: group_orders.basket_snapshot" in str(qe):
                group_buy = None
            else:
                raise

        if not group_buy:
            # Fallback A: synthesize by group_order_id (limit to prevent heavy scans)
            participants = db.query(Order).filter(
                Order.group_order_id == group_buy_id,
                Order.is_settlement_payment == False
            ).limit(200).all()
            if participants:
                leader_order = sorted(participants, key=lambda x: x.created_at or datetime.now(TEHRAN_TZ))[0]
                leader = db.query(User).filter(User.id == leader_order.user_id).first() if leader_order.user_id else None
                paid_count = sum(1 for p in participants if p.payment_ref_id is not None)
                created = leader_order.created_at
                synthetic_deadline = (created + timedelta(hours=24)) if created else None
                now_utc = datetime.now(TEHRAN_TZ)
                is_expired = synthetic_deadline is not None and now_utc > synthetic_deadline
                # Determine success only if expired and at least one follower (non-leader) paid
                try:
                    paid_followers = sum(
                        1 for p in participants
                        if getattr(p, 'user_id', None) != getattr(leader, 'id', None)
                        and (getattr(p, 'payment_ref_id', None) is not None or getattr(p, 'paid_at', None) is not None)
                    )
                except Exception:
                    paid_followers = max(0, paid_count - 1)

                if is_expired and paid_followers >= 1:
                    status_value = "موفق"
                elif is_expired and paid_followers < 1:
                    status_value = "ناموفق"
                else:
                    status_value = "در جریان"
                # Resolve leader phone consistently (prefer real user phone; fallback to latest/default address if guest_)
                leader_phone_value = getattr(leader, 'phone_number', '') if leader else ''
                if leader_phone_value and leader_phone_value.startswith('guest_'):
                    try:
                        from app.models import UserAddress
                        addr = db.query(UserAddress).filter(UserAddress.user_id == getattr(leader, 'id', None)).order_by(UserAddress.is_default.desc(), UserAddress.id.desc()).first() if leader else None
                        if addr and getattr(addr, 'phone_number', None):
                            leader_phone_value = addr.phone_number
                        else:
                            leader_phone_value = ''
                    except Exception:
                        leader_phone_value = ''

                payload = {
                    "id": group_buy_id,
                    "leader_id": leader_order.user_id,
                "leader_name": f"{getattr(leader, 'first_name', '') or ''} {getattr(leader, 'last_name', '') or ''}".strip() if leader else (f"کاربر حذف شده (ID: {leader_order.user_id})" if leader_order.user_id else "کاربر ناشناس"),
                "leader_phone": leader_phone_value,
                    "invite_token": "",
                    "status": status_value,
                    "allow_consolidation": False,
                    "created_at": _format_datetime_with_tz(created),
                    "leader_paid_at": _format_datetime_with_tz(getattr(leader_order, "paid_at", None)),
                    "expires_at": _format_datetime_with_tz(synthetic_deadline),
                    "finalized_at": None,
                    "leader_address": None,
                    "participants_count": len(participants),
                    "total_amount": sum(p.total_amount for p in participants if p.total_amount),
                    # Aggregation/refund fields for leader payout visibility
                    "refund_due_amount": getattr(group_buy, "refund_due_amount", None) if group_buy else None,
                    "refund_paid_at": _format_datetime_with_tz(getattr(group_buy, "refund_paid_at", None)) if group_buy else None,
                    "refund_card_number": getattr(group_buy, "refund_card_number", None) if group_buy else None,
                    "participants": [
                        {
                            "order_id": p.id,
                            "user_id": p.user_id,
                        "user_name": f"{getattr(p.user, 'first_name', '') or ''} {getattr(p.user, 'last_name', '') or ''}".strip() if getattr(p, 'user', None) else (f"کاربر حذف شده (ID: {p.user_id})" if p.user_id else "کاربر ناشناس"),
                        "user_phone": getattr(getattr(p, 'user', None), 'phone_number', '') if getattr(p, 'user', None) else "",
                        "telegram_username": getattr(getattr(p, 'user', None), 'telegram_username', None) if getattr(p, 'user', None) else None,
                        "telegram_id": getattr(getattr(p, 'user', None), 'telegram_id', None) if getattr(p, 'user', None) else None,
                            "total_amount": p.total_amount,
                            "status": p.status,
                            "created_at": _format_datetime_with_tz(p.created_at),
                            "paid_at": _format_datetime_with_tz(p.paid_at)
                        }
                        for p in participants
                    ]
                }
                _cache_set(cache_key, payload)
                return payload
            # Fallback B: treat the id as an Order id (legacy)
            order = db.query(Order).filter(Order.id == group_buy_id).first()
            if order:
                leader = db.query(User).filter(User.id == order.user_id).first() if order.user_id else None
                participants_single = [order]
                try:
                    synthetic_expires = (order.created_at + timedelta(hours=24)) if order.created_at else None
                except Exception:
                    synthetic_expires = None
                payload = {
                    "id": order.id,
                    "leader_id": order.user_id,
                    "leader_name": f"{getattr(leader, 'first_name', '') or ''} {getattr(leader, 'last_name', '') or ''}".strip() if leader else (f"کاربر حذف شده (ID: {order.user_id})" if order.user_id else "کاربر ناشناس"),
                    "leader_phone": getattr(leader, 'phone_number', '') if leader else "",
                    "invite_token": "",
                    "status": getattr(order, 'state', None).value if hasattr(getattr(order, 'state', None), 'value') else (order.status or ""),
                    "allow_consolidation": False,
                    "created_at": _format_datetime_with_tz(order.created_at),
                    "leader_paid_at": _format_datetime_with_tz(getattr(order, "paid_at", None)),
                    "expires_at": _format_datetime_with_tz(synthetic_expires),
                    "finalized_at": None,
                    "leader_address": None,
                    "participants_count": len(participants_single),
                    "total_amount": sum(p.total_amount for p in participants_single if p.total_amount),
                    # Refund info unavailable without canonical group; provide nulls
                    "refund_due_amount": None,
                    "refund_paid_at": None,
                    "refund_card_number": None,
                    "participants": [
                        {
                            "order_id": p.id,
                            "user_id": p.user_id,
                            "user_name": f"{getattr(p.user, 'first_name', '') or ''} {getattr(p.user, 'last_name', '') or ''}".strip() if getattr(p, 'user', None) else (f"کاربر حذف شده (ID: {p.user_id})" if p.user_id else "کاربر ناشناس"),
                            "user_phone": getattr(getattr(p, 'user', None), 'phone_number', '') if getattr(p, 'user', None) else "",
                        "telegram_username": getattr(getattr(p, 'user', None), 'telegram_username', None) if getattr(p, 'user', None) else None,
                        "telegram_id": getattr(getattr(p, 'user', None), 'telegram_id', None) if getattr(p, 'user', None) else None,
                            "total_amount": p.total_amount,
                            "status": p.status,
                            "created_at": _format_datetime_with_tz(p.created_at),
                            "paid_at": _format_datetime_with_tz(p.paid_at)
                        }
                        for p in participants_single
                    ]
                }
                _cache_set(cache_key, payload)
                return payload
            # Not found
            raise HTTPException(status_code=404, detail="Group buy not found")
    
        # Canonical branch: group_buy exists
        participants = db.query(Order).filter(
            Order.group_order_id == group_buy_id,
            Order.is_settlement_payment == False
        ).all()
        leader = db.query(User).filter(User.id == group_buy.leader_id).first()
        
        # اطمینان از اینکه رهبر همیشه در لیست participants باشد (حتی اگر سفارش نداشته باشد)
        leader_has_order = any(p.user_id == group_buy.leader_id for p in participants)
        if not leader_has_order and group_buy.leader_id and leader:
            # ایجاد یک pseudo-order برای رهبر تا در participants ظاهر شود
            from datetime import datetime
            from app.models import TEHRAN_TZ
            pseudo_order = type('PseudoOrder', (), {
                'id': f"leader_{group_buy.leader_id}",
                'user_id': group_buy.leader_id,
                'user': leader,
                'total_amount': 0,
                'status': 'leader',
                'created_at': group_buy.created_at or datetime.now(TEHRAN_TZ),
                'paid_at': group_buy.leader_paid_at
            })()
            participants.append(pseudo_order)

        # Leader address, if any
        leader_address = None
        if group_buy.leader_address_id:
            from app.models import UserAddress
            leader_address = db.query(UserAddress).filter(UserAddress.id == group_buy.leader_address_id).first()

        
        
    
        # Use get_user_display_info helper to determine display name and identifier
        display_name, identifier = get_user_display_info(leader) if leader else ("کاربر حذف شده", f"ID: {group_buy.leader_id}")
        
        payload = {
        "id": group_buy.id,
            "leader_id": group_buy.leader_id,
            "leader_name": display_name,
            "leader_phone": identifier,
            # Add creator fields for frontend compatibility
            "creator_name": display_name,
            "creator_phone": identifier,
            "invite_token": group_buy.invite_token,
            "status": group_buy.status.value if hasattr(group_buy.status, 'value') else str(group_buy.status),
            "allow_consolidation": group_buy.allow_consolidation,
            "created_at": _format_datetime_with_tz(group_buy.created_at),
            "leader_paid_at": _format_datetime_with_tz(group_buy.leader_paid_at),
            "expires_at": _format_datetime_with_tz(group_buy.expires_at),
            "finalized_at": _format_datetime_with_tz(group_buy.finalized_at),
            "leader_address": {
                "id": leader_address.id,
                "full_address": leader_address.full_address,
                "phone_number": leader_address.phone_number
            } if leader_address else None,
            "participants_count": len(participants),
            "total_amount": sum(p.total_amount for p in participants if p.total_amount),
            # Include basket_snapshot for secondary group detection
            "basket_snapshot": group_buy.basket_snapshot,
            # Include refund/settlement fields
            "refund_due_amount": group_buy.refund_due_amount,
            "refund_paid_at": _format_datetime_with_tz(group_buy.refund_paid_at),
            "refund_card_number": group_buy.refund_card_number,
            "settlement_required": group_buy.settlement_required,
            "settlement_amount": group_buy.settlement_amount,
            "settlement_paid_at": _format_datetime_with_tz(group_buy.settlement_paid_at),
        "participants": [
            {
                "order_id": participant.id,
                "user_id": participant.user_id,
                "user_name": f"{participant.user.first_name or ''} {participant.user.last_name or ''}".strip() if participant.user else (f"کاربر حذف شده (ID: {participant.user_id})" if participant.user_id else "کاربر ناشناس"),
                "user_phone": getattr(participant.user, 'phone_number', '') if participant.user else "",
                "telegram_username": getattr(participant.user, 'telegram_username', None) if participant.user else None,
                "telegram_id": getattr(participant.user, 'telegram_id', None) if participant.user else None,
                "total_amount": participant.total_amount,
                "status": participant.status,
                "created_at": _format_datetime_with_tz(participant.created_at),
                "paid_at": _format_datetime_with_tz(participant.paid_at),
                # اضافه کردن فیلد is_leader برای تشخیص رهبر
                "is_leader": participant.user_id == group_buy.leader_id,
                "isLeader": participant.user_id == group_buy.leader_id  # Alternative field name
            }
            for participant in participants
        ]
    }
        # Include aggregation bonus (10,000 tomans per paid follower shipping to leader)
        try:
            from sqlalchemy import or_ as _or
            paid_followers_to_leader = db.query(Order).filter(
                Order.group_order_id == group_buy_id,
                Order.user_id != group_buy.leader_id,
                Order.is_settlement_payment == False,
                Order.ship_to_leader_address == True,
                _or(
                    Order.payment_ref_id.isnot(None),
                    Order.paid_at.isnot(None),
                    Order.status.in_(["تکمیل شده", "paid", "completed"]),
                ),
            ).count()
            payload["followers_to_leader"] = int(paid_followers_to_leader)
            payload["aggregation_bonus"] = int(paid_followers_to_leader) * 10000
        except Exception:
            payload["followers_to_leader"] = 0
            payload["aggregation_bonus"] = 0

        _cache_set(cache_key, payload)
        return payload
    except HTTPException as e:
        raise e
    except Exception as e:
        import traceback
        logger.error(f"Group buy details error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# Finalize a group buy (mark success and move orders to Orders page)
@admin_router.post("/group-buys/{group_buy_id}/finalize")
async def finalize_group_buy(
    group_buy_id: int,
    db: Session = Depends(get_db)
):
    """Finalize the group buy: set GroupOrder to GROUP_FINALIZED and update all related
    orders' state to GROUP_SUCCESS so they appear in Orders page.

    This endpoint is idempotent: calling again keeps the same end state.
    """
    try:
        # Try ORM first; if DB is missing basket_snapshot, fall back to raw SQL path
        group_buy = None
        try:
            group_buy = db.query(GroupOrder).filter(GroupOrder.id == group_buy_id).first()
        except Exception as qe:
            if "no such column: group_orders.basket_snapshot" in str(qe):
                row = db.execute(text("SELECT id, leader_id FROM group_orders WHERE id = :gid"), {"gid": group_buy_id}).fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Group buy not found")
                group_buy = None
            else:
                raise

        if group_buy is None:
            # Raw path: update orders and group row without loading ORM GroupOrder
            orders = db.query(Order).filter(Order.group_order_id == group_buy_id).all()
            # Enforce at least one non-leader participant joined (count guest paid followers too)
            leader_id_row = db.execute(text("SELECT leader_id FROM group_orders WHERE id = :gid"), {"gid": group_buy_id}).fetchone()
            leader_id_val = leader_id_row[0] if leader_id_row else None
            # Try to identify the leader's own order to avoid counting duplicate orders from leader
            leader_order = None
            if leader_id_val is not None:
                leader_order = next((o for o in orders if getattr(o, 'user_id', None) == leader_id_val), None)
            if leader_order is None and orders:
                try:
                    leader_order = sorted(orders, key=lambda x: getattr(x, 'created_at', None) or datetime.now(TEHRAN_TZ))[0]
                except Exception:
                    leader_order = orders[0]
            has_non_leader = False
            for o in orders:
                if leader_order is not None and getattr(o, 'id', None) == getattr(leader_order, 'id', None):
                    continue
                # Ignore settlement payment orders
                if getattr(o, 'is_settlement_payment', False):
                    continue
                # Require follower to have completed payment
                paid = False
                if getattr(o, 'payment_ref_id', None):
                    paid = True
                elif getattr(o, 'paid_at', None):
                    paid = True
                else:
                    # Match frontend logic: check for various payment status indicators
                    status_str = str(getattr(o, 'status', '')).strip().lower()
                    if any(keyword in status_str for keyword in ["paid", "completed", "تکمیل شده", "success", "تکمیل"]):
                        paid = True
                if not paid:
                    continue
                # Case A: authenticated follower (different user_id)
                if leader_id_val is not None and getattr(o, 'user_id', None) is not None and o.user_id != leader_id_val:
                    has_non_leader = True
                    break
                # Case B: guest follower who paid (no user_id)
                if getattr(o, 'user_id', None) is None:
                    has_non_leader = True
                    break
            # Check if this is a secondary group by reading basket_snapshot
            is_secondary_group = False
            try:
                snapshot_row = db.execute(text("SELECT basket_snapshot FROM group_orders WHERE id = :gid"), {"gid": group_buy_id}).fetchone()
                if snapshot_row and snapshot_row[0]:
                    import json
                    snapshot_data = json.loads(snapshot_row[0])
                    if isinstance(snapshot_data, dict) and snapshot_data.get("kind") == "secondary":
                        is_secondary_group = True
            except Exception:
                # Fallback to hardcoded list for backward compatibility
                is_secondary_group = group_buy_id in [103, 104, 105, 108, 115, 117, 121, 124, 129, 132, 134, 136, 138, 140]
            
            # For secondary groups, different validation logic applies
            if is_secondary_group:
                # Secondary groups can be finalized with any paid member (leader doesn't need to have an order in this group)
                has_any_paid_member = False
                for o in orders:
                    # Ignore settlement payment orders
                    if getattr(o, 'is_settlement_payment', False):
                        continue
                    # Check if paid
                    paid = False
                    if getattr(o, 'payment_ref_id', None):
                        paid = True
                    elif getattr(o, 'paid_at', None):
                        paid = True
                    else:
                        status_str = str(getattr(o, 'status', '')).strip().lower()
                        if any(keyword in status_str for keyword in ["paid", "completed", "تکمیل شده", "success", "تکمیل"]):
                            paid = True
                    if paid:
                        has_any_paid_member = True
                        break
                
                if has_any_paid_member:
                    logger.info(f"DEBUG: Secondary group {group_buy_id} has paid members, allowing finalization")
                    # Continue with finalization (skip the has_non_leader check)
                else:
                    logger.info(f"DEBUG: Secondary group {group_buy_id} has no paid members")
                    raise HTTPException(status_code=400, detail="برای تکمیل گروه، حداقل یک عضو پرداخت‌کرده باید وجود داشته باشد")
            elif not has_non_leader:
                
                # Debug logging for all secondary groups and specific groups
                if is_secondary_group or group_buy_id == 121 or str(group_buy_id) in ["121", "452", "GB452A0000000"]:
                    logger.info(f"DEBUG: Group {group_buy_id} finalize failed - no paid followers found (is_secondary: {is_secondary_group})")
                    logger.info(f"DEBUG: Total orders: {len(orders)}")
                    for i, o in enumerate(orders):
                        logger.info(f"DEBUG: Order {i}: id={getattr(o, 'id', None)}, user_id={getattr(o, 'user_id', None)}, payment_ref_id={getattr(o, 'payment_ref_id', None)}, paid_at={getattr(o, 'paid_at', None)}, status='{getattr(o, 'status', '')}', is_settlement={getattr(o, 'is_settlement_payment', False)}")
                    logger.info(f"DEBUG: Leader order id: {getattr(leader_order, 'id', None) if leader_order else None}")
                    logger.info(f"DEBUG: Leader id from DB: {leader_id_val}")
                
                # Special handling for known secondary groups - allow finalization even without participants
                # This is because secondary groups are hardcoded and may not have real participant data
                if is_secondary_group:
                    logger.info(f"DEBUG: Allowing finalization of secondary group {group_buy_id} without participants")
                    # Calculate refund for secondary group before finalization
                    try:
                        from app.services.group_settlement_service import GroupSettlementService
                        settlement_service = GroupSettlementService(db)
                        settlement_result = settlement_service.check_and_mark_settlement_required(group_buy_id)
                        logger.info(f"DEBUG: Secondary group {group_buy_id} settlement result: {settlement_result}")
                    except Exception as e:
                        logger.error(f"DEBUG: Error calculating secondary group settlement: {e}")
                    # Continue with finalization logic
                else:
                    raise HTTPException(status_code=400, detail="برای تکمیل گروه، حداقل یک عضو غیر از لیدر باید به گروه بپیوندد")
            for o in orders:
                o.state = OrderState.GROUP_SUCCESS
                # Legacy status for Orders page badge
                try:
                    o.status = "pending"
                except Exception:
                    pass
            # Update group_orders finalized_at and status directly
            db.execute(
                text("UPDATE group_orders SET finalized_at = :ts WHERE id = :gid AND finalized_at IS NULL"),
                {"ts": datetime.now(TEHRAN_TZ), "gid": group_buy_id},
            )
            db.execute(
                text("UPDATE group_orders SET status = :st WHERE id = :gid"),
                {"st": "GROUP_FINALIZED", "gid": group_buy_id},
            )
            db.commit()

            # Compute settlement/refund flags for raw path and notify leader
            try:
                settlement_service = GroupSettlementService(db)
                settlement_service.check_and_mark_settlement_required(group_buy_id)
                group_obj = db.query(GroupOrder).filter(GroupOrder.id == group_buy_id).first()
                if group_obj:
                    db.refresh(group_obj)
                    leader = getattr(group_obj, "leader", None)
                    if not leader and getattr(group_obj, "leader_id", None):
                        leader = db.query(User).filter(User.id == group_obj.leader_id).first()
                    if leader:
                        await notification_service.send_group_outcome_notification(leader, group_obj)
            except Exception as notify_exc:
                logger.error(f"Failed to send group outcome notification (raw finalize) for group {group_buy_id}: {notify_exc}")

            return {"ok": True, "group_buy_id": group_buy_id, "orders_updated": len(orders)}

        # ORM path
        if not group_buy:
            raise HTTPException(status_code=404, detail="Group buy not found")

        orders = db.query(Order).filter(Order.group_order_id == group_buy_id).all()
        # Enforce at least one non-leader participant joined (count guest paid followers too)
        # Try to identify the leader's own order to avoid counting duplicate orders from leader
        leader_order = next((o for o in orders if getattr(o, 'user_id', None) == getattr(group_buy, 'leader_id', None)), None)
        if leader_order is None and orders:
            try:
                leader_order = sorted(orders, key=lambda x: getattr(x, 'created_at', None) or datetime.now(TEHRAN_TZ))[0]
            except Exception:
                leader_order = orders[0]
        has_non_leader = False
        for o in orders:
            if leader_order is not None and getattr(o, 'id', None) == getattr(leader_order, 'id', None):
                continue
            # Ignore settlement payment orders
            if getattr(o, 'is_settlement_payment', False):
                continue
            # Require follower to have completed payment
            paid = False
            if getattr(o, 'payment_ref_id', None):
                paid = True
            elif getattr(o, 'paid_at', None):
                paid = True
            else:
                # Match frontend logic: check for various payment status indicators
                status_str = str(getattr(o, 'status', '')).strip().lower()
                if any(keyword in status_str for keyword in ["paid", "completed", "تکمیل شده", "success", "تکمیل"]):
                    paid = True
            if not paid:
                continue
            # Case A: authenticated follower (different user_id)
            if getattr(o, 'user_id', None) is not None and o.user_id != getattr(group_buy, 'leader_id', None):
                has_non_leader = True
                break
            # Case B: guest follower who paid (no user_id)
            if getattr(o, 'user_id', None) is None:
                has_non_leader = True
                break
        # Check if this is a secondary group by reading basket_snapshot
        is_secondary_group = False
        try:
            if hasattr(group_buy, 'basket_snapshot') and group_buy.basket_snapshot:
                import json
                snapshot_data = json.loads(group_buy.basket_snapshot)
                if isinstance(snapshot_data, dict) and snapshot_data.get("kind") == "secondary":
                    is_secondary_group = True
        except Exception:
            # Fallback to hardcoded list for backward compatibility
            is_secondary_group = group_buy_id in [103, 104, 105, 108, 115, 117, 121, 124, 129, 132, 134, 136, 138, 140]
        
        # For secondary groups, different validation logic applies
        if is_secondary_group:
            # Secondary groups can be finalized with any paid member (leader doesn't need to have an order in this group)
            has_any_paid_member = False
            for o in orders:
                # Ignore settlement payment orders
                if getattr(o, 'is_settlement_payment', False):
                    continue
                # Check if paid
                paid = False
                if getattr(o, 'payment_ref_id', None):
                    paid = True
                elif getattr(o, 'paid_at', None):
                    paid = True
                else:
                    status_str = str(getattr(o, 'status', '')).strip().lower()
                    if any(keyword in status_str for keyword in ["paid", "completed", "تکمیل شده", "success", "تکمیل"]):
                        paid = True
                if paid:
                    has_any_paid_member = True
                    break
            
            if has_any_paid_member:
                logger.info(f"DEBUG: Secondary group {group_buy_id} has paid members, allowing finalization")
                # Calculate refund for secondary group before finalization
                try:
                    from app.services.group_settlement_service import GroupSettlementService
                    settlement_service = GroupSettlementService(db)
                    settlement_result = settlement_service.check_and_mark_settlement_required(group_buy_id)
                    logger.info(f"DEBUG: Secondary group {group_buy_id} settlement result: {settlement_result}")
                except Exception as e:
                    logger.error(f"DEBUG: Error calculating secondary group settlement: {e}")
                # Continue with finalization (skip the has_non_leader check)
            else:
                logger.info(f"DEBUG: Secondary group {group_buy_id} has no paid members")
                raise HTTPException(status_code=400, detail="برای تکمیل گروه، حداقل یک عضو پرداخت‌کرده باید وجود داشته باشد")
        elif not has_non_leader:
            
            # Debug logging for all secondary groups and specific groups
            if is_secondary_group or group_buy_id == 121 or str(group_buy_id) in ["121", "452", "GB452A0000000"]:
                logger.info(f"DEBUG: Group {group_buy_id} finalize failed - no paid followers found (is_secondary: {is_secondary_group})")
                logger.info(f"DEBUG: Total orders: {len(orders)}")
                for i, o in enumerate(orders):
                    logger.info(f"DEBUG: Order {i}: id={getattr(o, 'id', None)}, user_id={getattr(o, 'user_id', None)}, payment_ref_id={getattr(o, 'payment_ref_id', None)}, paid_at={getattr(o, 'paid_at', None)}, status='{getattr(o, 'status', '')}', is_settlement={getattr(o, 'is_settlement_payment', False)}")
                logger.info(f"DEBUG: Leader order id: {getattr(leader_order, 'id', None) if leader_order else None}")
                logger.info(f"DEBUG: Leader id from group: {getattr(group_buy, 'leader_id', None)}")
            
            # Special handling for known secondary groups - allow finalization even without participants
            # This is because secondary groups are hardcoded and may not have real participant data
            if is_secondary_group:
                logger.info(f"DEBUG: Allowing finalization of secondary group {group_buy_id} without participants")
                # Calculate refund for secondary group before finalization
                try:
                    from app.services.group_settlement_service import GroupSettlementService
                    settlement_service = GroupSettlementService(db)
                    settlement_result = settlement_service.check_and_mark_settlement_required(group_buy_id)
                    logger.info(f"DEBUG: Secondary group {group_buy_id} settlement result: {settlement_result}")
                except Exception as e:
                    logger.error(f"DEBUG: Error calculating secondary group settlement: {e}")
                # Continue with finalization logic
            else:
                raise HTTPException(status_code=400, detail="برای تکمیل گروه، حداقل یک عضو غیر از لیدر باید به گروه بپیوندد")
        # Before marking success, enforce leader settlement if promised friends > actual
        # Extract target friends from delivery_slot JSON of leader order if available
        promised_friends = None
        try:
            if getattr(leader_order, 'delivery_slot', None):
                import json as _json
                info = _json.loads(leader_order.delivery_slot)
                if isinstance(info, dict):
                    promised_friends = info.get('friends')
                    max_friends = info.get('max_friends')
        except Exception:
            promised_friends = None

        # Compute actual non-leader paid participants
        actual_paid_followers = 0
        for o in orders:
            if getattr(o, 'id', None) == getattr(leader_order, 'id', None):
                continue
            if getattr(o, 'is_settlement_payment', False):
                continue
            paid = False
            if getattr(o, 'payment_ref_id', None):
                paid = True
            elif getattr(o, 'paid_at', None):
                paid = True
            elif str(getattr(o, 'status', '')).strip() in ["تکمیل شده", "paid", "completed"]:
                paid = True
            if paid:
                actual_paid_followers += 1

        # If leader promised more than actual paid followers, compute settlement
        if isinstance(promised_friends, int) and promised_friends > actual_paid_followers:
            # Compute difference based on leader items pricing tiers
            # Strategy: reconstruct leader's intended total at promised_friends vs actual_paid_followers
            from app.models import OrderItem, Product
            leader_items = db.query(OrderItem).filter(OrderItem.order_id == leader_order.id).all()
            difference_total = 0.0
            for it in leader_items:
                product = getattr(it, 'product', None)
                solo_price = getattr(product, 'market_price', None) or getattr(product, 'base_price', 0)
                price_at_actual = None
                price_at_promised = None
                # Map tiers: 0 -> solo, 1 -> friend_1_price, 2 -> friend_2_price, >=3 -> 0
                def tier_price(paid_friends: int) -> float:
                    if paid_friends >= 3:
                        return 0.0
                    if paid_friends == 2:
                        return getattr(product, 'friend_2_price', None) or solo_price * 0.25
                    if paid_friends == 1:
                        return getattr(product, 'friend_1_price', None) or solo_price * 0.5
                    return solo_price
                price_at_actual = tier_price(actual_paid_followers)
                price_at_promised = tier_price(promised_friends)
                # The leader paid based on promised; if promised < actual (not our branch) would refund; here promised > actual -> extra to pay
                diff_per_unit = max(0.0, price_at_actual - price_at_promised)
                difference_total += diff_per_unit * getattr(it, 'quantity', 1)

            # If settlement is due, block finalization and return required payment instructions
            if difference_total > 0.0:
                return {
                    "ok": False,
                    "requires_settlement": True,
                    "group_buy_id": group_buy_id,
                    "leader_order_id": leader_order.id if leader_order else None,
                    "actual_paid_friends": actual_paid_followers,
                    "promised_friends": promised_friends,
                    "settlement_amount_toman": round(difference_total, 0),
                    "message": "رهبر باید مابه‌التفاوت قیمت بین تعداد دوستان وعده‌داده‌شده و تعداد واقعی را پرداخت کند."
                }

        # Before marking orders as success, run settlement check to handle:
        # - leader settlement if under-joined
        # - site refund payout if over-joined and aggregation bonus applies
        from app.services.group_settlement_service import GroupSettlementService
        settlement_service = GroupSettlementService(db)
        settlement_result = settlement_service.check_and_mark_settlement_required(group_buy_id)
        
        for o in orders:
            o.state = OrderState.GROUP_SUCCESS
            # Legacy status for Orders page badge - but don't override settlement status
            if o.status != "در انتظار تسویه":
                try:
                    o.status = "pending"
                except Exception:
                    pass

        from app.models import GroupOrderStatus
        try:
            if not group_buy.finalized_at:
                group_buy.finalized_at = datetime.now(TEHRAN_TZ)
        except Exception:
            group_buy.finalized_at = datetime.now(TEHRAN_TZ)
        try:
            group_buy.status = GroupOrderStatus.GROUP_FINALIZED
        except Exception:
            pass

        # If refund is due to leader, include flag so frontend can prompt for card number
        extra = {}
        try:
            if isinstance(settlement_result, dict) and settlement_result.get("refund_due") and int(settlement_result.get("refund_amount", 0)) > 0:
                extra = {
                    "refund_due": True,
                    "refund_amount": int(settlement_result.get("refund_amount", 0))
                }
        except Exception:
            extra = {}

        db.commit()

        # Notify leader about finalized group outcome
        try:
            db.refresh(group_buy)
        except Exception:
            pass
        leader = getattr(group_buy, "leader", None)
        if not leader and getattr(group_buy, "leader_id", None):
            leader = db.query(User).filter(User.id == group_buy.leader_id).first()
        if leader:
            try:
                await notification_service.send_group_outcome_notification(leader, group_buy)
            except Exception as notify_exc:
                logger.error(f"Failed to send group outcome notification for group {group_buy_id}: {notify_exc}")

        return {"ok": True, "group_buy_id": group_buy_id, "orders_updated": len(orders), **extra}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        import traceback
        logger.error(f"Finalize group error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@admin_router.get("/users/{user_id}/group-buys")
async def get_user_group_buys(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get all group buys a user has participated in"""
    participants = db.query(Order).filter(
        Order.user_id == user_id, 
        Order.group_order_id.isnot(None),
        Order.is_settlement_payment == False
    ).all()
    
    group_buys = []
    for participant in participants:
        group_buy = db.query(GroupOrder).filter(GroupOrder.id == participant.group_order_id).first()
        if group_buy:
            group_buys.append({
                "id": group_buy.id,
                "product_id": group_buy.product_id,
                "status": group_buy.status,
                "joined_at": participant.joined_at
            })
    
    return group_buys

@admin_router.get("/settlements")
async def get_settlements_required(db: Session = Depends(get_db)):
    """
    Admin settlements view combining:
    - Groups that require settlement (unpaid)
    - Groups that had settlement and are already marked paid (keep visible)
    - Leader orders in "در انتظار تسویه" for finalized groups
    """
    from app.models import GroupOrder, Order, User, OrderItem, Product, GroupOrderStatus

    results = []

    # 1) Unpaid settlements (required & finalized)
    groups_unpaid = db.query(GroupOrder).filter(
        GroupOrder.settlement_required == True,
        GroupOrder.status == GroupOrderStatus.GROUP_FINALIZED
    ).all()

    # 2) Already paid settlements (finalized & paid)
    groups_paid = db.query(GroupOrder).filter(
        GroupOrder.status == GroupOrderStatus.GROUP_FINALIZED,
        GroupOrder.settlement_paid_at.isnot(None)
    ).all()

    groups = list({g.id: g for g in [*groups_unpaid, *groups_paid]}.values())
    
    for group in groups:
        # Get leader info
        leader = db.query(User).filter(User.id == group.leader_id).first()
        leader_order = db.query(Order).filter(
            Order.group_order_id == group.id,
            Order.user_id == group.leader_id,
            Order.is_settlement_payment == False
        ).first()
        
        # Count paid friends
        paid_friends = db.query(Order).filter(
            Order.group_order_id == group.id,
            Order.user_id != group.leader_id,
            Order.payment_ref_id.isnot(None),
            Order.is_settlement_payment == False
        ).count()

        # Compute expected vs actual totals based on tiered pricing
        expected_friends = int(group.expected_friends or 1)
        actual_friends = int(paid_friends)

        leader_initial_payment = float(leader_order.total_amount) if leader_order and leader_order.total_amount is not None else 0.0

        expected_total = 0.0
        actual_total = 0.0
        if leader_order:
            order_items = db.query(OrderItem).filter(OrderItem.order_id == leader_order.id).all()
            # Preload products
            product_cache = {}
            for it in order_items:
                if it.product_id not in product_cache:
                    product_cache[it.product_id] = db.query(Product).filter(Product.id == it.product_id).first()

            def tier_price(product: Product, friends_count: int) -> float:
                solo_price = float(product.market_price or product.base_price or 0)
                if friends_count >= 3:
                    return float(product.friend_3_price or 0.0)
                elif friends_count == 2:
                    return float(product.friend_2_price or (solo_price * 0.25))
                elif friends_count == 1:
                    return float(product.friend_1_price or (solo_price * 0.5))
                else:
                    return solo_price

            for it in order_items:
                prod = product_cache.get(it.product_id)
                if not prod:
                    continue
                qty = float(getattr(it, 'quantity', 1) or 1)
                expected_total += tier_price(prod, expected_friends) * qty
                actual_total += tier_price(prod, actual_friends) * qty

        difference = actual_total - expected_total
        
        # Prefer explicit username/display if present
        display_name = (f"{leader.first_name or ''} {leader.last_name or ''}".strip() if leader else "Unknown") or (leader.phone_number if leader else None) or "Unknown"

        results.append({
            "id": group.id,
            "invite_code": group.invite_token,
            "leader_name": f"{leader.first_name or ''} {leader.last_name or ''}".strip() if leader else "Unknown",
            "leader_username": display_name,
            "leader_phone": leader.phone_number if leader else None,
            "expected_friends": group.expected_friends,
            "actual_friends": paid_friends,
            "settlement_amount": group.settlement_amount,
            "leader_initial_payment": int(leader_initial_payment),
            "expected_total": int(round(expected_total)),
            "actual_total": int(round(actual_total)),
            "difference": int(round(difference)),
            "settlement_paid": group.settlement_paid_at is not None,
            "settlement_paid_at": _format_datetime_with_tz(group.settlement_paid_at),
            "created_at": _format_datetime_with_tz(group.created_at),
            "leader_order_id": leader_order.id if leader_order else None,
            "leader_order_status": leader_order.status if leader_order else None
        })
    
    # Also consider leader orders marked "در انتظار تسویه" ONLY if group is finalized
    pending_orders = db.query(Order).join(GroupOrder, GroupOrder.id == Order.group_order_id).filter(
        Order.status == "در انتظار تسویه",
        Order.is_settlement_payment == False,
        GroupOrder.status == GroupOrderStatus.GROUP_FINALIZED
    ).all()
    
    for order in pending_orders:
        # Check if we already have this group
        if order.group_order_id and not any(r["id"] == order.group_order_id for r in results):
            group = db.query(GroupOrder).filter(GroupOrder.id == order.group_order_id).first()
            if group:
                leader = db.query(User).filter(User.id == group.leader_id).first()
                paid_friends = db.query(Order).filter(
                    Order.group_order_id == group.id,
                    Order.user_id != group.leader_id,
                    Order.payment_ref_id.isnot(None),
                    Order.is_settlement_payment == False
                ).count()

                # Compute expected vs actual totals in this branch too
                expected_friends = int(group.expected_friends or 1)
                actual_friends = int(paid_friends)

                leader_initial_payment = float(order.total_amount or 0)
                expected_total = 0.0
                actual_total = 0.0
                order_items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
                product_cache = {}
                for it in order_items:
                    if it.product_id not in product_cache:
                        product_cache[it.product_id] = db.query(Product).filter(Product.id == it.product_id).first()

                def tier_price(product: Product, friends_count: int) -> float:
                    solo_price = float(product.market_price or product.base_price or 0)
                    if friends_count >= 3:
                        return float(product.friend_3_price or 0.0)
                    elif friends_count == 2:
                        return float(product.friend_2_price or (solo_price * 0.25))
                    elif friends_count == 1:
                        return float(product.friend_1_price or (solo_price * 0.5))
                    else:
                        return solo_price

                for it in order_items:
                    prod = product_cache.get(it.product_id)
                    if not prod:
                        continue
                    qty = float(getattr(it, 'quantity', 1) or 1)
                    expected_total += tier_price(prod, expected_friends) * qty
                    actual_total += tier_price(prod, actual_friends) * qty

                difference = actual_total - expected_total
                
                display_name_fb = (f"{leader.first_name or ''} {leader.last_name or ''}".strip() if leader else "Unknown") or (leader.phone_number if leader else None) or "Unknown"

                results.append({
                    "id": group.id,
                    "invite_code": group.invite_token,
                    "leader_name": f"{leader.first_name or ''} {leader.last_name or ''}".strip() if leader else "Unknown",
                    "leader_username": display_name_fb,
                    "leader_phone": leader.phone_number if leader else None,
                    "expected_friends": group.expected_friends,
                    "actual_friends": paid_friends,
                    "settlement_amount": group.settlement_amount or 0,
                    "leader_initial_payment": int(leader_initial_payment),
                    "expected_total": int(round(expected_total)),
                    "actual_total": int(round(actual_total)),
                    "difference": int(round(difference)),
                    "created_at": _format_datetime_with_tz(group.created_at),
                    "leader_order_id": order.id,
                    "leader_order_status": order.status
                })
    
    return results 

@admin_router.get("/refunds")
async def get_pending_refunds(db: Session = Depends(get_db)):
    """
    Admin refunds view combining:
    - Pending refunds (refund_due_amount > 0 and not refund_paid)
    - Paid refunds (keep visible) with paid timestamp
    """
    groups_pending = db.query(GroupOrder).filter(
        GroupOrder.refund_due_amount.isnot(None),
        GroupOrder.refund_due_amount > 0,
        GroupOrder.refund_paid_at.is_(None)
    ).all()
    groups_paid = db.query(GroupOrder).filter(
        GroupOrder.refund_due_amount.isnot(None),
        GroupOrder.refund_due_amount > 0,
        GroupOrder.refund_paid_at.isnot(None)
    ).all()
    groups = list({g.id: g for g in [*groups_pending, *groups_paid]}.values())
    results = []
    for g in groups:
        leader = db.query(User).filter(User.id == g.leader_id).first()
        display_name = (f"{leader.first_name or ''} {leader.last_name or ''}".strip() if leader else "Unknown") or (leader.phone_number if leader else None) or "Unknown"
        results.append({
            "id": g.id,
            "invite_code": g.invite_token,
            "leader_name": f"{leader.first_name or ''} {leader.last_name or ''}".strip() if leader else "Unknown",
            "leader_username": display_name,
            "leader_phone": leader.phone_number if leader else None,
            "refund_amount": g.refund_due_amount,
            "card_number": g.refund_card_number,
            "requested_at": _format_datetime_with_tz(g.refund_requested_at),
            "refund_paid_at": _format_datetime_with_tz(g.refund_paid_at),
            "created_at": _format_datetime_with_tz(g.created_at),
        })
    return results

@admin_router.post("/refunds/{group_id}/mark-paid")
async def mark_refund_paid(
    group_id: int,
    db: Session = Depends(get_db)
):
    """
    Admin marks refund as paid; notifies leader via SMS.
    """
    group = db.query(GroupOrder).filter(GroupOrder.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if not group.refund_due_amount or group.refund_due_amount <= 0:
        raise HTTPException(status_code=400, detail="No refund due for this group")
    if group.refund_paid_at:
        return {"ok": True, "message": "Refund already marked paid"}

    group.refund_paid_at = datetime.now(TEHRAN_TZ)
    db.commit()

    # Notify leader
    try:
        leader = db.query(User).filter(User.id == group.leader_id).first()
        if leader and leader.phone_number:
            from app.utils.logging import get_logger
            from app.services.sms import sms_service
            logger = get_logger("sms")
            amount = group.refund_due_amount or 0
            masked = (group.refund_card_number or "").replace(" ", "")
            if len(masked) >= 16:
                masked = f"****-****-****-{masked[-4:]}"
            
            # Send refund notification to leader
            message = f"بازپرداخت {amount:,} تومان به کارت {masked} واریز شد."
            try:
                await notification_service.send_notification(
                    user=leader,
                    title="بازپرداخت انجام شد",
                    message=message,
                    group_id=group.id
                )
                logger.info(f"Refund notification sent to leader {leader.id}: {amount} tomans to card {masked}")
            except Exception as notif_error:
                logger.error(f"Failed to send refund notification: {notif_error}")
                # Still log for testing/backup
                logger.info(f"[FALLBACK LOG] Refund {amount} paid to leader {leader.phone_number} card {masked}")
    except Exception as e:
        logger.error(f"Error in refund notification: {e}")
        pass

    return {"ok": True, "message": "Refund marked as paid and leader notified"}

# Admin Reviews endpoints
@admin_router.get("/reviews")
async def get_all_reviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=1000),
    product_id: Optional[int] = None,
    approved: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Get all reviews with optional product filter and approval status"""
    try:
        query = db.query(Review).join(User, Review.user_id == User.id, isouter=True)
        
        if product_id:
            query = query.filter(Review.product_id == product_id)
        
        if approved is not None:
            query = query.filter(Review.approved == approved)
        
        reviews = query.order_by(Review.created_at.desc()).offset(skip).limit(limit).all()
        
        result = []
        for review in reviews:
            result.append({
                "id": review.id,
                "rating": review.rating,
                "comment": review.comment,
                "display_name": review.display_name,
                "product_id": review.product_id,
                "user_id": review.user_id,
                "approved": review.approved,
                "created_at": review.created_at.isoformat() if review.created_at else None,
                "first_name": review.user.first_name if review.user else None,
                "last_name": review.user.last_name if review.user else None
            })
        
        return result
    except Exception as e:
        logger.error(f"Error fetching reviews: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@admin_router.post("/reviews")
async def create_review(
    request: Request,
    db: Session = Depends(get_db)
):
    """Create a new review (admin)"""
    try:
        data = await request.json()
        
        product_id = data.get("product_id")
        user_id = data.get("user_id")
        rating = data.get("rating")
        comment = data.get("comment", "")
        display_name = data.get("display_name", "")
        approved = data.get("approved", True)  # Admin-created reviews are approved by default
        
        if not product_id or not user_id or not rating:
            raise HTTPException(status_code=400, detail="product_id, user_id, and rating are required")
        
        # Verify product exists
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Verify user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        review = Review(
            product_id=product_id,
            user_id=user_id,
            rating=rating,
            comment=comment,
            display_name=display_name,
            approved=approved
        )
        
        db.add(review)
        db.commit()
        db.refresh(review)
        
        return {
            "id": review.id,
            "rating": review.rating,
            "comment": review.comment,
            "display_name": review.display_name,
            "product_id": review.product_id,
            "user_id": review.user_id,
            "approved": review.approved,
            "created_at": review.created_at.isoformat() if review.created_at else None,
            "message": "Review created successfully"
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating review: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@admin_router.put("/reviews/{review_id}")
async def update_review(
    review_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Update a review (admin)"""
    try:
        data = await request.json()
        
        review = db.query(Review).filter(Review.id == review_id).first()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        if "rating" in data:
            review.rating = data["rating"]
        if "comment" in data:
            review.comment = data["comment"]
        if "approved" in data:
            review.approved = data["approved"]
        
        db.commit()
        db.refresh(review)
        
        return {
            "id": review.id,
            "rating": review.rating,
            "comment": review.comment,
            "product_id": review.product_id,
            "user_id": review.user_id,
            "approved": review.approved,
            "created_at": review.created_at.isoformat() if review.created_at else None,
            "message": "Review updated successfully"
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating review: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@admin_router.post("/reviews/{review_id}/approve")
async def approve_review(
    review_id: int,
    db: Session = Depends(get_db)
):
    """Approve a review"""
    try:
        review = db.query(Review).filter(Review.id == review_id).first()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        review.approved = True
        db.commit()
        db.refresh(review)
        
        return {
            "id": review.id,
            "approved": review.approved,
            "message": "Review approved successfully"
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error approving review: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@admin_router.post("/reviews/{review_id}/reject")
async def reject_review(
    review_id: int,
    db: Session = Depends(get_db)
):
    """Reject/unapprove a review"""
    try:
        review = db.query(Review).filter(Review.id == review_id).first()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        review.approved = False
        db.commit()
        db.refresh(review)
        
        return {
            "id": review.id,
            "approved": review.approved,
            "message": "Review rejected successfully"
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error rejecting review: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@admin_router.delete("/reviews/{review_id}")
async def delete_review(
    review_id: int,
    db: Session = Depends(get_db)
):
    """Delete a review (admin)"""
    try:
        review = db.query(Review).filter(Review.id == review_id).first()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        db.delete(review)
        db.commit()
        
        return {"message": "Review deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting review: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@admin_router.post("/test-telegram-notification/{user_id}")
async def test_telegram_notification(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Test endpoint to verify Telegram notifications work for a specific user.
    Useful for debugging notification issues.
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"error": "User not found", "user_id": user_id}
        
        telegram_id = getattr(user, 'telegram_id', None)
        if not telegram_id:
            return {
                "error": "User has no telegram_id",
                "user_id": user_id,
                "phone_number": getattr(user, 'phone_number', None)
            }
        
        from app.services.telegram import telegram_service
        
        # Test message
        test_message = (
            "🧪 <b>تست اعلان تلگرام</b>\n\n"
            "اگر این پیام را می‌بینید، سیستم اعلان‌های تلگرام به درستی کار می‌کند!\n\n"
            "✅ ربات به درستی پیکربندی شده است\n"
            "✅ شما با ربات ارتباط برقرار کرده‌اید\n"
            "✅ اعلان‌های گروهی به شما ارسال خواهد شد"
        )
        
        logger.info(f"🧪 Testing Telegram notification for user {user_id} (telegram_id: {telegram_id})")
        result = await telegram_service.send_message(str(telegram_id), test_message)
        
        return {
            "success": result,
            "user_id": user_id,
            "telegram_id": telegram_id,
            "telegram_username": getattr(user, 'telegram_username', None),
            "message": "Test notification sent" if result else "Failed to send notification",
            "hint": "If failed, user may need to start the bot first by searching @Bahamm_bot in Telegram and clicking START"
        }
    except Exception as e:
        logger.error(f"Error testing Telegram notification: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return {
            "error": str(e),
            "traceback": traceback.format_exc()
        }

@admin_router.get("/secondary-groups")
async def get_secondary_groups(
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=1000),
    db: Session = Depends(get_db),
    response: Response = None
):
    """Get secondary group buys list - groups created by invited users.
    Also include implicit secondary groups: leader was a follower in another group
    and this new group has at least one follower (non-leader member).
    """
    # Prevent caching to ensure fresh data in admin panel
    if response:
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    
    try:
        logger.info("=== SECONDARY GROUPS LIST ENDPOINT CALLED ===")
        # Clear cache for debugging
        clear_admin_cache()
        
        q = db.query(GroupOrder).order_by(GroupOrder.created_at.desc())
        groups = q.offset(skip).limit(limit).all()
        
        def _to_aware_utc(dt):
            try:
                if dt is None:
                    return None
                return dt if getattr(dt, "tzinfo", None) else dt.replace(tzinfo=TEHRAN_TZ)
            except Exception:
                return dt
        
        rows = []
        for g in groups:
            # Determine explicit kind from basket_snapshot
            kind = "primary"
            try:
                if getattr(g, 'basket_snapshot', None):
                    _meta = json.loads(g.basket_snapshot)
                    if isinstance(_meta, dict):
                        kind = str((_meta.get("kind") or "primary")).lower()
            except Exception:
                kind = "primary"
            
            logger.info(f"SecondaryGroups check - Group {g.id}: kind={kind}, leader_id={g.leader_id}, snapshot={getattr(g, 'basket_snapshot', None)[:100] if getattr(g, 'basket_snapshot', None) else 'None'}")
            
            leader = db.query(User).filter(User.id == g.leader_id).first()
            
            # Orders in this group (exclude settlement)
            group_orders = db.query(Order).filter(
                Order.group_order_id == g.id,
                Order.is_settlement_payment == False
            ).all()
            
            # Followers are non-leader members
            followers_count = sum(1 for o in group_orders if getattr(o, 'user_id', None) != getattr(g, 'leader_id', None))
            
            # REMOVED: Implicit-secondary detection was incorrectly marking regular groups as secondary
            # Only explicit secondary groups (with kind="secondary" in basket_snapshot) should be shown here
            # This was causing regular primary groups with Telegram user leaders to incorrectly appear in secondary list
            
            # Include only explicit secondary groups (explicit kind == "secondary")
            if kind != "secondary":
                logger.info(f"SecondaryGroups: Skipping group {g.id} - kind is '{kind}', not 'secondary'")
                continue
            
            participants_count = len(group_orders) if group_orders else 1
            paid_count = sum(1 for o in group_orders if (getattr(o, 'payment_ref_id', None) is not None or getattr(o, 'paid_at', None) is not None))
            
            # Determine status
            now_utc = datetime.now(TEHRAN_TZ)
            expires_at_aware = _to_aware_utc(getattr(g, 'expires_at', None))
            is_expired = expires_at_aware is not None and now_utc > expires_at_aware
            
            status_value = None
            try:
                status_str = g.status.value if hasattr(g.status, 'value') else str(g.status)
                if status_str == 'GROUP_FINALIZED':
                    status_value = "موفق"
                elif status_str == 'GROUP_FAILED':
                    status_value = "ناموفق"
            except Exception:
                pass
            
            if not status_value:
                if is_expired:
                    status_value = "منقضی"
                elif followers_count == 0:
                    status_value = "منتظر عضو"
                else:
                    status_value = "ثانویه"
            
            # Leader info using get_user_display_info helper
            leader_name, leader_phone = get_user_display_info(leader) if leader else ("نامشخص", "")
            
            rows.append({
                "id": g.id,
                "leader_phone": leader_phone,
                "leader_name": leader_name,
                "participants": participants_count,
                "paid": paid_count,
                "status": status_value,
                "created_at": _to_aware_utc(g.created_at).isoformat() if g.created_at else None,
                "expires_at": expires_at_aware.isoformat() if expires_at_aware else None,
                "kind": "ثانویه"
            })
        
        return rows
        
    except Exception as e:
        logger.error(f"Error in secondary groups endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@admin_router.post("/group-buys/{group_buy_id}/request-refund")
async def request_refund_for_group(
    group_buy_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Request refund for a secondary group by providing card number"""
    try:
        data = await request.json()
        card_number = data.get("card_number", "").strip()
        if not card_number:
            raise HTTPException(status_code=400, detail="شماره کارت الزامی است")
        
        # Validate card number format (basic validation)
        clean_card = card_number.replace("-", "").replace(" ", "")
        if len(clean_card) < 16 or not clean_card.isdigit():
            raise HTTPException(status_code=400, detail="شماره کارت معتبر نیست")
        
        # Get group order
        group_order = db.query(GroupOrder).filter(GroupOrder.id == group_buy_id).first()
        if not group_order:
            raise HTTPException(status_code=404, detail="Group not found")
        
        # Check if refund is due
        if not group_order.refund_due_amount or group_order.refund_due_amount <= 0:
            raise HTTPException(status_code=400, detail="هیچ مبلغی برای بازپرداخت وجود ندارد")
        
        # Check if already requested
        if group_order.refund_requested_at:
            raise HTTPException(status_code=400, detail="درخواست بازپرداخت قبلاً ثبت شده است")
        
        # Save card number and mark as requested
        group_order.refund_card_number = card_number
        group_order.refund_requested_at = datetime.now(TEHRAN_TZ)
        
        db.commit()
        
        return {
            "ok": True,
            "message": "درخواست بازپرداخت ثبت شد",
            "refund_amount": group_order.refund_due_amount,
            "card_number": card_number[-4:]  # Only show last 4 digits
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Request refund error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@admin_router.post("/group-buys/{group_buy_id}/calculate-secondary-refund")
async def calculate_secondary_group_refund(
    group_buy_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Manually calculate refund for secondary groups (for hardcoded groups)"""
    try:
        data = await request.json()
        member_count = int(data.get("member_count", 1))  # Default to 1 member
        
        # Get group order
        group_order = db.query(GroupOrder).filter(GroupOrder.id == group_buy_id).first()
        if not group_order:
            raise HTTPException(status_code=404, detail="Group not found")
        
        # Check if it's a known secondary group
        is_secondary_group = group_buy_id in [103, 104, 105, 108, 115, 117, 121, 124, 129, 132, 134, 136, 138, 140]
        if not is_secondary_group:
            raise HTTPException(status_code=400, detail="This is not a secondary group")
        
        # Use hardcoded secondary group data
        SECONDARY_GROUPS_DATA = {
            103: {"total_amount": 6000},
            104: {"total_amount": 6000},
            105: {"total_amount": 6000},
            108: {"total_amount": 3000},
            115: {"total_amount": 3500},
            117: {"total_amount": 8500},
            121: {"total_amount": 6000},
            124: {"total_amount": 6500},
            129: {"total_amount": 9500},
            132: {"total_amount": 9500},
            134: {"total_amount": 9500},
            136: {"total_amount": 9500},
            138: {"total_amount": 9500},
            140: {"total_amount": 9500},
        }
        
        group_data = SECONDARY_GROUPS_DATA.get(group_buy_id)
        if not group_data:
            raise HTTPException(status_code=400, detail="No data available for this secondary group")
        
        total_basket_value = group_data["total_amount"]
        
        # Calculate refund: (total_basket_value ÷ 4) × member_count
        # But cap at maximum 4 members (so max refund = total_basket_value)
        if total_basket_value <= 0:
            refund_amount = 0
        else:
            discount_per_member = total_basket_value / 4
            effective_members = min(member_count, 4)  # Cap at 4 members
            refund_amount = discount_per_member * effective_members
            refund_amount = min(refund_amount, total_basket_value)  # Don't refund more than they paid
        
        # Update group order with refund amount
        group_order.refund_due_amount = int(refund_amount)
        group_order.settlement_required = False
        group_order.settlement_amount = 0
        
        db.commit()
        
        logger.info(f"Secondary group {group_buy_id}: Set refund_due_amount to {refund_amount:,} تومان for {member_count} members")
        
        return {
            "ok": True,
            "group_id": group_buy_id,
            "member_count": member_count,
            "total_basket_value": total_basket_value,
            "refund_amount": int(refund_amount),
            "message": f"Refund calculated: {int(refund_amount):,} تومان"
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Calculate secondary refund error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")