from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///C:/Users/User/OneDrive/Desktop/final_project/bahamm1.db"
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
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Telegram Mini App Configuration
    # Required for verifying Telegram WebApp authentication
    # Get your bot token from @BotFather on Telegram
    TELEGRAM_BOT_TOKEN: str = ""

    class Config:
        env_file = ".env"
        extra = "allow"  # Allow extra fields to prevent validation errors

@lru_cache()
def get_settings():
    return Settings() 