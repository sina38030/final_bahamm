from typing import List, Optional, Any, Union
from datetime import datetime, date
from pydantic import BaseModel, EmailStr, validator, Field
from enum import Enum

# Enum for user types
class UserTypeEnum(str, Enum):
    CUSTOMER = 'CUSTOMER'
    MERCHANT = 'MERCHANT'

# Base models (shared properties)
class CategoryBase(BaseModel):
    name: str
    slug: Optional[str] = None
    image_url: Optional[str] = None

class SubCategoryBase(BaseModel):
    name: str
    category_id: int
    slug: Optional[str] = None
    image_url: Optional[str] = None

class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    base_price: float
    market_price: float
    option1_name: Optional[str] = None
    option2_name: Optional[str] = None
    shipping_cost: float = 0

class ProductOptionBase(BaseModel):
    option1_value: Optional[str] = None
    option2_value: Optional[str] = None
    stock: int = 0
    price_adjustment: float = 0

class ProductImageBase(BaseModel):
    image_url: str
    is_main: bool = False

class StoreBase(BaseModel):
    name: str
    description: Optional[str] = None

class UserBase(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    user_type: Optional[UserTypeEnum] = None
    phone_number: Optional[str] = Field(None, pattern=r'^\+?1?\d{9,15}$')
    telegram_id: Optional[str] = None
    telegram_username: Optional[str] = None
    telegram_photo_url: Optional[str] = None
    telegram_language_code: Optional[str] = None

# Creation models
class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None

class SubCategoryCreate(SubCategoryBase):
    pass

class SubCategoryUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[int] = None

class ProductOptionCreate(ProductOptionBase):
    pass

class ProductImageCreate(ProductImageBase):
    pass

class StoreCreate(StoreBase):
    pass

class ProductCreate(ProductBase):
    store_id: int
    category_id: int
    subcategory_id: Optional[int] = None
    options: Optional[List[ProductOptionCreate]] = []
    images: Optional[List[ProductImageCreate]] = []

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    base_price: Optional[float] = None
    market_price: Optional[float] = None
    option1_name: Optional[str] = None
    option2_name: Optional[str] = None
    shipping_cost: Optional[float] = None
    store_id: Optional[int] = None
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None

class UserCreate(UserBase):
    password: Optional[str] = None

# API response models
class Category(CategoryBase):
    id: int

    class Config:
        from_attributes = True

class SubCategory(SubCategoryBase):
    id: int
    
    class Config:
        from_attributes = True

class ProductOption(ProductOptionBase):
    id: int
    product_id: int

    class Config:
        from_attributes = True

class ProductImage(ProductImageBase):
    id: int
    product_id: int

    class Config:
        from_attributes = True

class Store(StoreBase):
    id: int
    merchant_id: int

    class Config:
        from_attributes = True

class Product(ProductBase):
    id: int
    store_id: int
    category_id: int
    subcategory_id: Optional[int] = None
    options: List[ProductOption] = []
    images: List[ProductImage] = []
    
    # Computed fields (helpers for the frontend)
    store_name: Optional[str] = None
    category_name: Optional[str] = None
    subcategory_name: Optional[str] = None
    main_image: Optional[str] = None

    @validator('main_image', pre=True, always=True)
    def set_main_image(cls, v, values):
        if 'images' in values and values['images']:
            for img in values['images']:
                if img.is_main:
                    return img.image_url
            # If no main image is set, use the first one
            if values['images']:
                return values['images'][0].image_url
        return v
        
    class Config:
        from_attributes = True

class User(UserBase):
    id: int
    coins: int
    created_at: datetime
    is_phone_verified: Optional[bool] = False

    class Config:
        from_attributes = True

class UserCoinsResponse(BaseModel):
    coins: int

# Product response schemas
class ProductResponse(BaseModel):
    id: int
    name: str
    base_price: float
    discount_price: Optional[float] = None
    discount: Optional[float] = None
    shipping_cost: float = 0
    description: Optional[str] = None
    category: str
    category_slug: Optional[str] = None
    subcategory: Optional[str] = None
    subcategory_slug: Optional[str] = None
    image: str
    in_stock: Optional[bool] = True

    @validator('image', pre=True, always=True)
    def set_image(cls, v, values):
        # Return main_image if it exists
        if isinstance(v, str):
            return v
        return None

    @validator('category', pre=True, always=True)
    def set_category(cls, v, values):
        # Use category_name if it exists
        if isinstance(v, str):
            return v
        return "Unknown"

    @validator('subcategory', pre=True, always=True)
    def set_subcategory(cls, v, values):
        # Use subcategory_name if it exists
        if isinstance(v, str):
            return v
        return None

    @validator('discount_price', pre=True, always=True)
    def set_discount_price(cls, v, values):
        if v is not None:
            return v
        # Use market_price as discount_price if available
        if 'market_price' in values and values['market_price'] < values.get('base_price', 0):
            return values['market_price']
        return None

    @validator('discount', pre=True, always=True)
    def set_discount(cls, v, values):
        if v is not None:
            return v
        if 'base_price' in values and 'discount_price' in values and values['discount_price']:
            if values['base_price'] > 0:
                return round((values['base_price'] - values['discount_price']) / values['base_price'] * 100)
        return None

    class Config:
        from_attributes = True

class ProductDetailResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    base_price: float
    discount_price: Optional[float] = None
    discount: Optional[float] = None
    shipping_cost: float = 0
    category: str
    category_slug: Optional[str] = None
    subcategory: Optional[str] = None
    subcategory_slug: Optional[str] = None
    image: str
    images: List[str] = []
    in_stock: Optional[bool] = True
    group_buy_options: Optional[dict] = None
    store_id: Optional[int] = None
    store_name: Optional[str] = None

    @validator('image', pre=True, always=True)
    def set_image(cls, v, values):
        # Return main_image if it exists
        if isinstance(v, str):
            return v
        return None

    @validator('images', pre=True, always=True)
    def set_images(cls, v, values):
        if isinstance(v, list) and all(isinstance(img, str) for img in v):
            return v
        elif 'images' in values and values['images']:
            return [img.image_url for img in values['images']]
        return []

    @validator('category', pre=True, always=True)
    def set_category(cls, v, values):
        # Use category_name if it exists
        if isinstance(v, str):
            return v
        elif 'category_name' in values:
            return values['category_name']
        return "Unknown"

    @validator('subcategory', pre=True, always=True)
    def set_subcategory(cls, v, values):
        # Use subcategory_name if it exists
        if isinstance(v, str):
            return v
        elif 'subcategory_name' in values:
            return values['subcategory_name']
        return None

    @validator('discount_price', pre=True, always=True)
    def set_discount_price(cls, v, values):
        if v is not None:
            return v
        # Use market_price as discount_price if available
        if 'market_price' in values and values['market_price'] < values.get('base_price', 0):
            return values['market_price']
        return None

    @validator('discount', pre=True, always=True)
    def set_discount(cls, v, values):
        if v is not None:
            return v
        if 'base_price' in values and 'discount_price' in values and values['discount_price']:
            if values['base_price'] > 0:
                return round((values['base_price'] - values['discount_price']) / values['base_price'] * 100)
        return None

    @validator('store_name', pre=True, always=True)
    def set_store_name(cls, v, values):
        if isinstance(v, str):
            return v
        elif 'store' in values and values['store']:
            return values['store'].name
        return None

    @validator('store_id', pre=True, always=True)
    def set_store_id(cls, v, values):
        if v is not None:
            return v
        elif 'store' in values and values['store']:
            return values['store'].id
        return None

    @validator('group_buy_options', pre=True, always=True)
    def set_group_buy_options(cls, v, values):
        if v is not None:
            return v
        if 'market_price' in values:
            return {
                "twoPersonPrice": values['market_price'],
                "fourPersonPrice": round(values['market_price'] * 0.9, 2)  # 10% additional discount for 4 people
            }
        return None

    class Config:
        from_attributes = True

class ProductOptionsResponse(BaseModel):
    options: List[ProductOption] = []

    class Config:
        from_attributes = True

# Request models for specific operations
class GroupBuyJoin(BaseModel):
    invite_code: str
    user_id: Optional[int] = None

class GroupBuyCreate(BaseModel):
    product_id: int
    participants: int = 2

class PurchaseCreate(BaseModel):
    product_id: int
    option_id: int
    quantity: int
    is_group_purchase: bool = False

class OrderBase(BaseModel):
    total_amount: float
    status: str

class OrderCreate(OrderBase):
    user_id: int

class Order(OrderBase):
    id: int
    user_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class OrderSubmit(BaseModel):
    product_id: int
    quantity: int
    address: str
    used_coins: int = 0
    payment_method: str
    is_group_purchase: bool = False
    selected_option1_id: Optional[int] = None
    selected_option2_id: Optional[int] = None

class FavoriteAdd(BaseModel):
    product_id: int
    user_id: Optional[int] = None

class FavoriteRemove(BaseModel):
    product_id: int
    user_id: Optional[int] = None

class ChatMessageSend(BaseModel):
    product_id: int
    receiver_id: int
    message: str

class ChatMessage(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    product_id: int
    message: str
    timestamp: datetime
    
    class Config:
        from_attributes = True

class SupportMessage(BaseModel):
    id: int
    sender: str
    message: str
    timestamp: datetime
    delivered: bool | None = None
    seen: bool | None = None
    class Config:
        from_attributes = True

class DailyCheckinStatus(BaseModel):
    current_streak: int
    can_checkin: bool

class DailyCheckinResult(BaseModel):
    new_streak: int
    coins_earned: int

class RecommendationResponse(BaseModel):
    id: int
    name: str
    base_price: float
    image_url: Optional[str] = None

    class Config:
        from_attributes = True

class ReviewBase(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None
    display_name: Optional[str] = None
    created_at: Optional[datetime] = None

class ReviewCreate(ReviewBase):
    user_id: int = 1  # Default to user 1 if not provided
    approved: Optional[bool] = None  # If provided, use it; otherwise backend defaults to False
    # product_id is passed as path parameter, not in body

class ReviewResponse(ReviewBase):
    id: int
    product_id: int
    user_id: int
    created_at: datetime
    approved: bool = False
    first_name: Optional[str] = None
    last_name: Optional[str] = None

    class Config:
        from_attributes = True

class GroupBuyResponse(BaseModel):
    message: str
    order_id: int
    group_buy_id: Optional[int] = None
    invite_code: Optional[str] = None

class JoinGroupBuyRequest(BaseModel):
    invite_code: str
    user_id: Optional[int] = None # user_id will be taken from token if None

# Schemas for GroupBuy model itself
class GroupBuyBase(BaseModel):
    product_id: int
    status: str = "ACTIVE" 
    expires_at: datetime

class GroupBuyCreate(GroupBuyBase):
    # creator_id will be set from the token in the service/route
    pass

class GroupBuyDB(GroupBuyBase):
    id: int
    creator_id: int
    invite_code: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class GroupBuyReferralDetailResponse(BaseModel):
    invite_code: str
    status: str
    expires_at: datetime
    creator_first_name: Optional[str] = None
    product: ProductDetailResponse

    class Config:
        from_attributes = True

class UserAddressBase(BaseModel):
    title: Optional[str] = None
    full_address: str
    postal_code: str
    receiver_name: str
    phone_number: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_default: Optional[bool] = False

class UserAddressCreate(UserAddressBase):
    pass

class UserAddressUpdate(BaseModel):
    title: Optional[str] = None
    full_address: Optional[str] = None
    postal_code: Optional[str] = None
    receiver_name: Optional[str] = None
    phone_number: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_default: Optional[bool] = None

class UserAddress(UserAddressBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class GamificationResponse(BaseModel):
    daily_reward: int
    games_available: int
    special_discount: str
    flash_sale: str

# Phone authentication schemas
class PhoneVerificationRequest(BaseModel):
    phone_number: str = Field(pattern=r'^\+?1?\d{9,15}$')
    user_type: UserTypeEnum

class PhoneVerificationResponse(BaseModel):
    message: str
    expires_in: int
    test_code: Optional[str] = None
    fallback_mode: Optional[bool] = None

class VerifyCodeRequest(BaseModel):
    phone_number: str = Field(pattern=r'^\+?1?\d{9,15}$')
    verification_code: str = Field(min_length=5, max_length=5)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[int] = None
    phone_number: Optional[str] = None
    user_type: Optional[str] = None
    telegram_id: Optional[str] = None

# Profile update schema (used for complete-profile endpoint)
class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None

# Payment schemas
class PaymentRequest(BaseModel):
    amount: int  # مبلغ به ریال
    description: str
    mobile: Optional[str] = None
    email: Optional[str] = None
    order_id: Optional[int] = None

class PaymentResponse(BaseModel):
    success: bool
    authority: Optional[str] = None
    payment_url: Optional[str] = None
    error: Optional[str] = None

class PaymentVerification(BaseModel):
    authority: str
    amount: Optional[int] = None

class PaymentVerificationResponse(BaseModel):
    success: bool
    ref_id: Optional[Union[str, int]] = None
    status: Optional[str] = None
    error: Optional[str] = None
    # Group order information for redirect logic
    group_order_id: Optional[int] = None
    invite_token: Optional[str] = None

# Transactions schemas
class TransactionDirection(str, Enum):
    IN_ = 'IN'   # Money/coins to user
    OUT = 'OUT'  # Money/coins from user

class TransactionType(str, Enum):
    PAYMENT = 'PAYMENT'                 # Order payment
    SETTLEMENT = 'SETTLEMENT'           # Settlement payment by leader
    REFUND_PAYOUT = 'REFUND_PAYOUT'     # Refund paid to leader's bank
    COINS_EARNED = 'COINS_EARNED'       # Coins credited (e.g., daily reward)

class TransactionItem(BaseModel):
    id: str
    type: TransactionType
    direction: TransactionDirection
    amount: int  # Tomans for money, coins count for coins
    currency: str | None = 'TOMAN'  # 'TOMAN' for money, 'COIN' for coins entries
    status: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    timestamp: datetime
    # Optional related entities
    order_id: Optional[int] = None
    group_order_id: Optional[int] = None
    payment_ref_id: Optional[str] = None

class TransactionsResponse(BaseModel):
    items: List[TransactionItem]
    total: int
    page: int
    page_size: int

# Popular Search schemas
class PopularSearchBase(BaseModel):
    search_term: str
    sort_order: int = 0
    is_active: bool = True

class PopularSearchCreate(PopularSearchBase):
    pass

class PopularSearchUpdate(BaseModel):
    search_term: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None

class PopularSearchResponse(PopularSearchBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Telegram authentication schemas
class TelegramLoginRequest(BaseModel):
    init_data: str
    init_data_unsafe: dict