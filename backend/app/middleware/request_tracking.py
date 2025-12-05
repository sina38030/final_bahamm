"""
Request tracking middleware to monitor slow requests and prevent 524 timeouts
"""
import time
import asyncio
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from app.utils.logging import get_logger

logger = get_logger(__name__)

# Track active requests globally
active_requests = 0
slow_request_count = 0

class RequestTrackingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to track request duration and warn about slow requests
    that might cause Cloudflare 524 timeouts (100s limit)
    """
    
    async def dispatch(self, request: Request, call_next):
        global active_requests, slow_request_count
        
        active_requests += 1
        start_time = time.time()
        path = request.url.path
        method = request.method
        
        # Log high concurrency
        if active_requests > 8:
            logger.warning(f"⚠️ HIGH CONCURRENCY: {active_requests} active requests")
        
        try:
            # Set a task timeout to prevent hanging requests
            # Cloudflare times out at 100s, so we abort at 90s
            response = await asyncio.wait_for(
                call_next(request),
                timeout=90.0  # 90 seconds - leaves 10s buffer before Cloudflare timeout
            )
            
            duration = time.time() - start_time
            
            # Log slow requests
            if duration > 30:
                slow_request_count += 1
                logger.warning(
                    f"🐌 SLOW REQUEST ({duration:.2f}s): {method} {path} "
                    f"[Active: {active_requests}, Total slow: {slow_request_count}]"
                )
            elif duration > 60:
                logger.error(
                    f"🚨 VERY SLOW REQUEST ({duration:.2f}s): {method} {path} "
                    f"[Active: {active_requests}]"
                )
            elif duration > 5:
                logger.info(f"Slow request ({duration:.2f}s): {method} {path}")
            
            return response
            
        except asyncio.TimeoutError:
            duration = time.time() - start_time
            logger.error(
                f"❌ REQUEST TIMEOUT ({duration:.2f}s): {method} {path} "
                f"- Aborted to prevent Cloudflare 524 error"
            )
            # Return 504 Gateway Timeout
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=504,
                content={
                    "detail": "Request took too long to process. Please try again.",
                    "timeout": True
                }
            )
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"❌ REQUEST ERROR ({duration:.2f}s): {method} {path} - {str(e)}")
            raise
        finally:
            active_requests -= 1


def get_request_stats():
    """Return current request statistics"""
    return {
        "active_requests": active_requests,
        "slow_request_count": slow_request_count
    }

