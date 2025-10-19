from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional

class Settings(BaseSettings):
    # Use relative path from project root - works on both Windows and Linux
    DATABASE_URL: str = "sqlite:///./bahamm1.db"
    SECRET_KEY: str = "dev-secret-key-for-bahamm-app-2025"
    ALGORITHM: str = "HS256"
    # Default token lifetime set long to keep users logged in until explicit logout
    # You can override via env var ACCESS_TOKEN_EXPIRE_MINUTES
    # 525600 minutes = 365 days
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 525600

    SMS_PROVIDER: str = "melipayamak"
    MELIPAYAMAK_API_KEY: str = "60292d2280404143914d559366fa43f9"

    # Payment Gateway Configuration (ZarinPal)
    ZARINPAL_MERCHANT_ID: str = "2cea1309-4a05-4f02-82ce-9a6d183db8a4"  # Real merchant ID
    ZARINPAL_SANDBOX: bool = False
    FRONTEND_URL: str = "https://bahamm.ir"  # Production domain for payment callbacks
    # Payment callback URL - must route to frontend's /payment/callback page
    # Production: https://bahamm.ir/payment/callback
    # Local: http://localhost:3000/payment/callback
    # Can be overridden via environment variable
    PAYMENT_CALLBACK_BASE_URL: Optional[str] = None  # Will be auto-detected if None
    
    @property
    def get_payment_callback_base_url(self) -> str:
        """Auto-detect callback URL based on FRONTEND_URL"""
        if self.PAYMENT_CALLBACK_BASE_URL:
            return self.PAYMENT_CALLBACK_BASE_URL
        
        # Auto-detect: if localhost, use direct backend URL
        if "localhost" in self.FRONTEND_URL or "127.0.0.1" in self.FRONTEND_URL:
            return "http://localhost:8001/api"
        else:
            # Production: use nginx proxy path
            return f"{self.FRONTEND_URL}/backend/api"
    
    # Telegram Mini App Configuration
    # Required for verifying Telegram WebApp authentication
    # Get your bot token from @BotFather on Telegram
    TELEGRAM_BOT_TOKEN: str = "8413343514:AAFiyFNsJUSuEh0aLG9dZxSnSHwAyRPK09E"
    TELEGRAM_BOT_USERNAME: str = "Bahamm_bot"  # Your bot username (without @)
    TELEGRAM_MINIAPP_NAME: str = "bahamm"  # Your mini app name configured in BotFather

    class Config:
        env_file = ".env"
        extra = "allow"  # Allow extra fields to prevent validation errors

@lru_cache()
def get_settings():
    return Settings() 