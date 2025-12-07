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
    SMS_FORCE_TEST_MODE: bool = False

    # Payment Gateway Configuration (ZarinPal)
    ZARINPAL_MERCHANT_ID: str = "2cea1309-4a05-4f02-82ce-9a6d183db8a4"  # Real merchant ID
    ZARINPAL_SANDBOX: bool = False
    # Auto-detect: use production URL by default, can be overridden with env var for local dev
    FRONTEND_URL: str = "https://bahamm.ir"  # Can use env var for local dev: http://localhost:3000
    # Payment callback URL - must route to backend's /api/payment/callback
    # Production: https://bahamm.ir/backend/api (nginx proxies to backend)
    # Local: http://localhost:8001/api (direct to backend)
    # Can be overridden via environment variable
    PAYMENT_CALLBACK_BASE_URL: Optional[str] = None  # Will be auto-detected if None
    
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

    def get_frontend_public_url(self) -> str:
        """Return the public-facing frontend base URL (no backend path).

        This normalizes FRONTEND_URL in case it was misconfigured to include
        backend proxy segments like '/backend' or '/backend/api'.
        """
        base = (self.FRONTEND_URL or "").strip()
        if not base:
            # Fallback to safe default if not configured
            return "http://localhost:3000"
        # Strip trailing slash for consistent concatenation
        if base.endswith('/'):
            base = base[:-1]
        lowered = base.lower()
        # Remove common backend proxy suffixes if present
        for marker in ("/backend/api", "/backend"):
            idx = lowered.rfind(marker)
            if idx != -1:
                base = base[:idx]
                break
        # Ensure we always have a valid URL
        if not base:
            return "http://localhost:3000"
        return base
    
    # Telegram Mini App Configuration
    # Required for verifying Telegram WebApp authentication
    # Get your bot token from @BotFather on Telegram
    TELEGRAM_BOT_TOKEN: str = "8413343514:AAFiyFNsJUSuEh0aLG9dZxSnSHwAyRPK09E"
    TELEGRAM_BOT_USERNAME: str = "Bahamm_bot"  # Your bot username (without @)
    TELEGRAM_MINIAPP_NAME: str = "bahamm"  # Your mini app name configured in BotFather
    
    # Telegram API Proxy (required for servers in regions where Telegram is blocked)
    # Format: http://host:port or socks5://host:port or socks5://user:pass@host:port
    # Leave empty to connect directly (works in most regions)
    TELEGRAM_API_PROXY: Optional[str] = None

    class Config:
        env_file = ".env"
        extra = "allow"  # Allow extra fields to prevent validation errors

@lru_cache()
def get_settings():
    return Settings()

def clear_settings_cache():
    """Clear the settings cache - useful for testing or config reloads"""
    get_settings.cache_clear()
