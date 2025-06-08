from sqlalchemy import Column, Integer, String, Float, ForeignKey, Boolean, DateTime, Date, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, UTC
import enum

from app.database import Base

class UserType(enum.Enum):
    CUSTOMER = 'CUSTOMER'
    MERCHANT = 'MERCHANT'

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
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    is_phone_verified = Column(Boolean, default=False)  # Added phone verification status

    # Relationships
    stores = relationship("Store", back_populates="merchant")
    orders = relationship("Order", back_populates="user")
    favorites = relationship("Favorite", back_populates="user")
    checkins = relationship("DailyCheckin", back_populates="user")
    sent_messages = relationship("ChatMessage", foreign_keys="ChatMessage.sender_id", back_populates="sender")
    received_messages = relationship("ChatMessage", foreign_keys="ChatMessage.receiver_id", back_populates="receiver")
    games_played = relationship("UserGame", back_populates="user")
    group_buys_created = relationship("GroupBuy", back_populates="creator")
    group_buy_participants = relationship("GroupBuyParticipant", back_populates="user")
    phone_verifications = relationship("PhoneVerification", back_populates="user")
    reviews = relationship("Review", back_populates="user")
    addresses = relationship("UserAddress", back_populates="user", cascade="all, delete-orphan")

class PhoneVerification(Base):
    __tablename__ = "phone_verifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    verification_code = Column(String(5), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
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
    
    # Relationships
    store = relationship("Store", back_populates="products")
    category = relationship("Category", back_populates="products")
    subcategory = relationship("SubCategory", back_populates="products")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")
    options = relationship("ProductOption", back_populates="product", cascade="all, delete-orphan")
    order_items = relationship("OrderItem", back_populates="product")
    group_buys = relationship("GroupBuy", back_populates="product")
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
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    total_amount = Column(Float, nullable=False)
    status = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    
    # Relationships
    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

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

class GroupBuy(Base):
    __tablename__ = "group_buys"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    invite_code = Column(String(20), unique=True, nullable=False)
    status = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    expires_at = Column(DateTime, nullable=False)
    
    # Relationships
    product = relationship("Product", back_populates="group_buys")
    creator = relationship("User", back_populates="group_buys_created")
    participants = relationship("GroupBuyParticipant", back_populates="group_buy", cascade="all, delete-orphan")

class GroupBuyParticipant(Base):
    __tablename__ = "group_buy_participants"

    id = Column(Integer, primary_key=True, index=True)
    group_buy_id = Column(Integer, ForeignKey("group_buys.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime, default=lambda: datetime.now(UTC))
    
    # Relationships
    group_buy = relationship("GroupBuy", back_populates="participants")
    user = relationship("User", back_populates="group_buy_participants")

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
    played_at = Column(DateTime, default=lambda: datetime.now(UTC))
    
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
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    
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
    timestamp = Column(DateTime, default=lambda: datetime.now(UTC))
    
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
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    
    # Relationships
    user = relationship("User", back_populates="reviews")
    product = relationship("Product", back_populates="reviews")

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
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))

    # Relationships
    user = relationship("User", back_populates="addresses")