from sqlalchemy import Column, Integer, String, Float, ForeignKey, Boolean, DateTime, Date, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timezone, timedelta
import enum

from app.database import Base

# Tehran timezone: UTC+3:30
TEHRAN_TZ = timezone(timedelta(hours=3, minutes=30))

class Banner(Base):
    __tablename__ = "banners"

    id = Column(Integer, primary_key=True, index=True)
    image_url = Column(String(255), nullable=False)
    title = Column(String(120), nullable=True)
    description = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(TEHRAN_TZ))

class UserType(enum.Enum):
    CUSTOMER = 'CUSTOMER'
    MERCHANT = 'MERCHANT'
    ADMIN = 'ADMIN'

class OrderType(enum.Enum):
    ALONE = 'ALONE'
    GROUP = 'GROUP'

class OrderState(enum.Enum):
    ALONE_PAID = 'ALONE_PAID'           # Alone buy completed - shows in Orders page
    GROUP_PENDING = 'GROUP_PENDING'     # Group leader paid deposit - shows in Group Buys page
    GROUP_SUCCESS = 'GROUP_SUCCESS'     # At least one friend paid - shows in Orders page
    GROUP_EXPIRED = 'GROUP_EXPIRED'     # 24h timeout, no friends paid - hidden from both pages

class GroupOrderStatus(enum.Enum):
    GROUP_FORMING = 'GROUP_FORMING'     # Equivalent to GROUP_PENDING
    GROUP_FINALIZED = 'GROUP_FINALIZED' # Equivalent to GROUP_SUCCESS  
    GROUP_FAILED = 'GROUP_FAILED'       # Equivalent to GROUP_EXPIRED

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(80), nullable=True)  # Added first_name field
    last_name = Column(String(80), nullable=True)   # Added last_name field
    email = Column(String(120), unique=True, nullable=True)  # Made nullable for phone auth
    phone_number = Column(String(20), unique=True, nullable=True)  # Added phone number
    password = Column(String(255), nullable=True)  # Made nullable for phone auth
    user_type = Column(Enum(UserType), nullable=False)
    coins = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(TEHRAN_TZ))
    is_phone_verified = Column(Boolean, default=False)  # Added phone verification status
    
    # Telegram Mini App authentication fields
    telegram_id = Column(String(50), unique=True, nullable=True, index=True)
    telegram_username = Column(String(100), nullable=True)
    telegram_photo_url = Column(String(500), nullable=True)
    telegram_language_code = Column(String(10), nullable=True)

    # Relationships
    stores = relationship("Store", back_populates="merchant")
    orders = relationship("Order", back_populates="user")
    favorites = relationship("Favorite", back_populates="user")
    checkins = relationship("DailyCheckin", back_populates="user")
    sent_messages = relationship("ChatMessage", foreign_keys="ChatMessage.sender_id", back_populates="sender")
    received_messages = relationship("ChatMessage", foreign_keys="ChatMessage.receiver_id", back_populates="receiver")
    games_played = relationship("UserGame", back_populates="user")
    group_orders_led = relationship("GroupOrder", foreign_keys="GroupOrder.leader_id")
    phone_verifications = relationship("PhoneVerification", back_populates="user")
    reviews = relationship("Review", back_populates="user")
    addresses = relationship("UserAddress", back_populates="user", cascade="all, delete-orphan")

class PhoneVerification(Base):
    __tablename__ = "phone_verifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    verification_code = Column(String(5), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(TEHRAN_TZ))
    is_used = Column(Boolean, default=False)

    # Relationships
    user = relationship("User", back_populates="phone_verifications")

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    image_url = Column(String(255), nullable=True)
    
    # Relationships
    products = relationship("Product", back_populates="category")
    subcategories = relationship("SubCategory", back_populates="category", cascade="all, delete-orphan")

class SubCategory(Base):
    __tablename__ = "subcategories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    image_url = Column(String(255), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    
    # Relationships
    category = relationship("Category", back_populates="subcategories")
    products = relationship("Product", back_populates="subcategory")

class Store(Base):
    __tablename__ = "stores"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    description = Column(Text)
    merchant_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    merchant = relationship("User", back_populates="stores")
    products = relationship("Product", back_populates="store")

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    description = Column(Text)
    base_price = Column(Float, nullable=False)
    market_price = Column(Float, nullable=False)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    subcategory_id = Column(Integer, ForeignKey("subcategories.id"), nullable=True)
    option1_name = Column(String(50))
    option2_name = Column(String(50))
    shipping_cost = Column(Float, default=0)
    is_active = Column(Boolean, default=True)

    # Display attributes and seeds
    # Weight stored in grams; tolerance in grams
    weight_grams = Column(Integer, nullable=True)
    weight_tolerance_grams = Column(Integer, nullable=True)
    # Sales seeding: displayed_sales = sales_seed_offset + (real_sales_total - sales_seed_baseline)
    sales_seed_offset = Column(Integer, default=0)
    sales_seed_baseline = Column(Integer, default=0)
    sales_seed_set_at = Column(DateTime, nullable=True)
    # Rating seeding using seed-sum combined with real reviews delta
    rating_seed_sum = Column(Float, default=0)
    rating_baseline_sum = Column(Float, default=0)
    rating_baseline_count = Column(Integer, default=0)
    rating_seed_set_at = Column(DateTime, nullable=True)
    
    # Manual positioning for curated layouts
    # Lower numbers appear first; NULL means not curated
    home_position = Column(Integer, nullable=True)
    landing_position = Column(Integer, nullable=True)
    
    # Friend pricing fields
    friend_1_price = Column(Float, default=0)
    friend_2_price = Column(Float, default=0)
    friend_3_price = Column(Float, default=0)
    
    # Relationships
    store = relationship("Store", back_populates="products")
    category = relationship("Category", back_populates="products")
    subcategory = relationship("SubCategory", back_populates="products")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")
    options = relationship("ProductOption", back_populates="product", cascade="all, delete-orphan")
    order_items = relationship("OrderItem", back_populates="product")
    favorites = relationship("Favorite", back_populates="product")
    chat_messages = relationship("ChatMessage", back_populates="product")
    reviews = relationship("Review", back_populates="product")

class ProductOption(Base):
    __tablename__ = "product_options"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    option1_value = Column(String(50))
    option2_value = Column(String(50))
    stock = Column(Integer, default=0)
    price_adjustment = Column(Float, default=0)
    
    # Relationships
    product = relationship("Product", back_populates="options")

class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    image_url = Column(String(255), nullable=False)
    is_main = Column(Boolean, default=False)
    
    # Relationships
    product = relationship("Product", back_populates="images")

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Allow NULL for guest orders
    total_amount = Column(Float, nullable=False)
    status = Column(String(20), nullable=False)  # Legacy field - still required by database
    state = Column(Enum(OrderState), nullable=True)  # New state machine field
    created_at = Column(DateTime, default=lambda: datetime.now(TEHRAN_TZ))
    expires_at = Column(DateTime, nullable=True)  # For GROUP_PENDING orders (24h timeout)
    
    # Order type and group order fields
    order_type = Column(Enum(OrderType), nullable=False, default=OrderType.ALONE)
    group_order_id = Column(Integer, ForeignKey("group_orders.id"), nullable=True)  # Link to group order
    
    # Payment tracking fields
    payment_authority = Column(String(100), nullable=True)  # ZarinPal authority
    payment_ref_id = Column(String(100), nullable=True)     # ZarinPal reference ID
    paid_at = Column(DateTime, nullable=True)  # When payment was completed
    
    # Shipping consolidation
    ship_to_leader_address = Column(Boolean, default=False)  # Whether to ship to leader's address
    # Metadata flags
    is_invited_checkout = Column(Boolean, default=False)  # Track if order was created via invite link
    is_settlement_payment = Column(Boolean, default=False)  # If this is a settlement payment for price difference
    
    # Delivery information
    shipping_address = Column(Text, nullable=True)  # Full shipping address
    delivery_slot = Column(String(100), nullable=True)  # Selected delivery time slot
    
    # Relationships
    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    group_order = relationship("GroupOrder", back_populates="orders")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    base_price = Column(Float, nullable=False)
    
    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

class GroupOrder(Base):
    __tablename__ = "group_orders"

    id = Column(Integer, primary_key=True, index=True)
    leader_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    invite_token = Column(String(50), unique=True, nullable=False)
    status = Column(Enum(GroupOrderStatus), nullable=False, default=GroupOrderStatus.GROUP_FORMING)
    created_at = Column(DateTime, default=lambda: datetime.now(TEHRAN_TZ))
    leader_paid_at = Column(DateTime, nullable=True)  # When leader completed payment
    expires_at = Column(DateTime, nullable=True)  # 24 hours from leader_paid_at
    finalized_at = Column(DateTime, nullable=True)  # When group was finalized
    # Snapshot of the leader's basket at initiation (JSON string)
    basket_snapshot = Column(Text, nullable=True)
    
    # Settlement tracking fields (leader owes when fewer friends joined)
    expected_friends = Column(Integer, nullable=True)  # Number of friends leader expected
    settlement_required = Column(Boolean, default=False)  # If leader needs to pay difference
    settlement_amount = Column(Integer, default=0)  # Amount leader needs to pay (in tomans)
    settlement_paid_at = Column(DateTime, nullable=True)  # When settlement was completed
    
    # Refund payout tracking fields (leader overpaid when more friends joined)
    refund_due_amount = Column(Integer, default=0)  # Amount to refund to leader (in tomans)
    refund_card_number = Column(String(32), nullable=True)  # Leader's bank card number for payout
    refund_requested_at = Column(DateTime, nullable=True)
    refund_paid_at = Column(DateTime, nullable=True)
    
    # Shipping consolidation settings
    allow_consolidation = Column(Boolean, default=False)  # Leader's choice
    leader_address_id = Column(Integer, ForeignKey("user_addresses.id"), nullable=True)
    
    # Relationships
    leader = relationship("User", foreign_keys=[leader_id])
    leader_address = relationship("UserAddress", foreign_keys=[leader_address_id])
    orders = relationship("Order", back_populates="group_order", cascade="all, delete-orphan")

class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(80), nullable=False)
    description = Column(Text)
    coin_reward = Column(Integer, nullable=False)
    
    # Relationships
    user_games = relationship("UserGame", back_populates="game")

class UserGame(Base):
    __tablename__ = "user_games"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    score = Column(Integer)
    played_at = Column(DateTime, default=lambda: datetime.now(TEHRAN_TZ))
    
    # Relationships
    user = relationship("User", back_populates="games_played")
    game = relationship("Game", back_populates="user_games")

class DailyCheckin(Base):
    __tablename__ = "daily_checkins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    streak = Column(Integer, default=1)
    
    # Relationships
    user = relationship("User", back_populates="checkins")

class DailyReward(Base):
    __tablename__ = "daily_rewards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    coins_rewarded = Column(Integer, nullable=False)
    date = Column(Date, nullable=False)

class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(TEHRAN_TZ))
    
    # Relationships
    user = relationship("User", back_populates="favorites")
    product = relationship("Product", back_populates="favorites")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(TEHRAN_TZ))
    
    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_messages")
    product = relationship("Product", back_populates="chat_messages")

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # Rating between 1-5
    comment = Column(Text)
    # Optional display name to show with the review (e.g., fake or user-provided)
    display_name = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(TEHRAN_TZ))
    approved = Column(Boolean, default=False, nullable=False)  # Review approval status
    
    # Relationships
    user = relationship("User", back_populates="reviews")
    product = relationship("Product", back_populates="reviews")

class SupportMessage(Base):
    __tablename__ = "support_messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(TEHRAN_TZ))

class UserAddress(Base):
    __tablename__ = "user_addresses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(100), nullable=True)
    full_address = Column(Text, nullable=False)
    postal_code = Column(String(10), nullable=False)
    receiver_name = Column(String(100), nullable=False)
    phone_number = Column(String(20), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(TEHRAN_TZ))

    # Relationships
    user = relationship("User", back_populates="addresses")

class DeliverySlot(Base):
    __tablename__ = "delivery_slots"

    id = Column(Integer, primary_key=True, index=True)
    # Date of delivery (Tehran date). We store as Date and consider TZ at app layer
    delivery_date = Column(Date, nullable=False, index=True)
    # 24h format strings like "12:00" and "14:00"
    start_time = Column(String(5), nullable=False)
    end_time = Column(String(5), nullable=False)
    # Whether this slot is available to users
    is_active = Column(Boolean, default=True)
    # Optional capacity if needed in the future; null means unlimited
    capacity = Column(Integer, nullable=True)
    # Soft off for the whole day can be represented by creating a sentinel slot; alternatively use is_day_off
    is_day_off = Column(Boolean, default=False)
    # Audit fields
    created_at = Column(DateTime, default=lambda: datetime.now(TEHRAN_TZ))
    updated_at = Column(DateTime, default=lambda: datetime.now(TEHRAN_TZ))

class PopularSearch(Base):
    __tablename__ = "popular_searches"

    id = Column(Integer, primary_key=True, index=True)
    search_term = Column(String(120), nullable=False)
    sort_order = Column(Integer, default=0)  # Lower numbers appear first
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(TEHRAN_TZ))
    updated_at = Column(DateTime, default=lambda: datetime.now(TEHRAN_TZ), onupdate=lambda: datetime.now(TEHRAN_TZ))