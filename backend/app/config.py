from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/bahamm"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    SMS_PROVIDER: str = "melipayamak"
    MELIPAYAMAK_API_KEY: str = ""

    # Payment Gateway Configuration (ZarinPal)
    ZARINPAL_MERCHANT_ID: str = "2cea1309-4a05-4f02-82ce-9a6d183db8a4"  # Real merchant ID
    ZARINPAL_SANDBOX: bool = False
    FRONTEND_URL: str = "http://localhost:3002"

    class Config:
        env_file = ".env"
        extra = "allow"  # Allow extra fields to prevent validation errors

@lru_cache()
def get_settings():
    return Settings() 