from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
import sqlite3
from app import models
from app.routes import init_routes
from app.utils.logging import get_logger

# Initialize root logger
logger = get_logger(__name__)

try:
    models.Base.metadata.create_all(bind=engine)
    logger.info("Database tables created")
    # Ensure optional columns exist when using SQLite (display_name on reviews)
    try:
        from sqlalchemy.engine import Engine
        if isinstance(engine, Engine) and str(engine.url).startswith("sqlite"):
            conn = sqlite3.connect(engine.url.database or ":memory:")
            cur = conn.cursor()
            cur.execute("PRAGMA table_info(reviews)")
            cols = {row[1] for row in cur.fetchall()}
            if "display_name" not in cols:
                logger.info("Adding display_name column to reviews table")
                cur.execute("ALTER TABLE reviews ADD COLUMN display_name VARCHAR(100)")
                conn.commit()
            conn.close()
    except Exception as mig_e:
        logger.warning(f"Optional column migration failed: {mig_e}")
except Exception as e:
    logger.warning(f"Could not create database tables: {e}")
    logger.info("Continuing without creating tables...")

# Create main app
app = FastAPI(
    title="Bahamm App API",
    description="API for the Bahamm App",
    version="1.0.0"
)

# Create main app with CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://bahamm.ir",
        "https://www.bahamm.ir",
        "https://app.bahamm.ir",
        "http://bahamm.ir",
        "http://www.bahamm.ir",
        "http://app.bahamm.ir",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create sub-app for API routes
api_app = FastAPI()

# Add CORS to API sub-app to allow frontend (localhost:3000) to call /api
api_app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://bahamm.ir",
        "https://www.bahamm.ir",
        "https://app.bahamm.ir",
        "http://bahamm.ir",
        "http://www.bahamm.ir",
        "http://app.bahamm.ir",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("Initializing API routes (mounted under /api)")
init_routes(api_app)
logger.info("API routes initialized successfully on /api")

# Mount static files for uploaded assets (e.g., product images) - BEFORE API mount
try:
    BASE_DIR = Path(__file__).resolve().parent  # backend/app/
    uploads_dir = BASE_DIR / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    logger.info(f"🔧 Mounting static files: {uploads_dir}")
    # Serve at /static
    app.mount("/static", StaticFiles(directory=str(uploads_dir)), name="static")
    logger.info(f"✅ Static uploads directory mounted at /static -> {uploads_dir}")
except Exception as _e:
    logger.error(f"❌ Failed to mount static directory: {_e}")

# Mount the API app under /api
app.mount("/api", api_app)

# Add CORS to main app as well
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://bahamm.ir",
        "https://www.bahamm.ir",
        "https://app.bahamm.ir",
        "http://bahamm.ir",
        "http://www.bahamm.ir",
        "http://app.bahamm.ir",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    logger.debug("Root endpoint called")
    return {"message": "Welcome to the Bahamm App"}

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "Bahamm Backend"}

@api_app.get("/")
async def api_root():
    logger.debug("API root endpoint called")
    return {"message": "Welcome to the Bahamm API"}

@api_app.get("/health")
async def api_health():
    return {"status": "healthy", "service": "Bahamm API"} 