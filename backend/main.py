import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import ORJSONResponse
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from sqlalchemy import text

from app.database import engine
from app import models
from app.routes import init_routes
from app.utils.logging import get_logger
from app.services.group_expiry import group_expiry_service


# ---------- Logging ----------
logger = get_logger(__name__)

# ---------- Database ----------
models.Base.metadata.create_all(bind=engine)
logger.info("Database tables created")

try:
    with engine.connect() as conn:
        # Enforce FK constraints in SQLite
        conn.execute(text("PRAGMA foreign_keys=ON"))

        # Ensure `is_active` exists
        res = conn.execute(text("PRAGMA table_info(products)"))
        cols = [row[1] for row in res]

        if "is_active" not in cols:
            conn.execute(text("ALTER TABLE products ADD COLUMN is_active BOOLEAN DEFAULT 1"))
            logger.info("Added products.is_active column")

        # Helper: add column if missing
        def add_col_if_missing(col: str, ddl: str):
            if col not in cols:
                try:
                    conn.execute(text(f"ALTER TABLE products ADD COLUMN {col} {ddl}"))
                    logger.info(f"Added products.{col} column")
                except Exception as e2:
                    logger.error(f"Failed to add products.{col}: {e2}")

        # Refresh cols & add more if needed
        res = conn.execute(text("PRAGMA table_info(products)"))
        cols = [row[1] for row in res]
        add_col_if_missing("weight_grams", "INTEGER")
        add_col_if_missing("weight_tolerance_grams", "INTEGER")
        add_col_if_missing("sales_seed_offset", "INTEGER DEFAULT 0")
        add_col_if_missing("sales_seed_baseline", "INTEGER DEFAULT 0")
        add_col_if_missing("sales_seed_set_at", "DATETIME")
        add_col_if_missing("rating_seed_sum", "FLOAT DEFAULT 0")
        add_col_if_missing("rating_baseline_sum", "FLOAT DEFAULT 0")
        add_col_if_missing("rating_baseline_count", "INTEGER DEFAULT 0")
        add_col_if_missing("rating_seed_set_at", "DATETIME")

        # Ensure app_settings table exists
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        """))

        # Useful indexes
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_product_options_product ON product_options(product_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)"))

except Exception as e:
    logger.error(f"Failed DB schema checks: {e}")


# ---------- Lifespan ----------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up application...")
    asyncio.create_task(group_expiry_service.run_periodic_check(interval_minutes=10))
    logger.info("Group expiry service started")

    yield

    logger.info("Shutting down application...")
    group_expiry_service.stop()
    logger.info("Group expiry service stopped")


# ---------- Main App ----------
app = FastAPI(
    title="Bahamm App API",
    description="API for the Bahamm App",
    version="1.0.0",
    lifespan=lifespan,
    default_response_class=ORJSONResponse,
)

# ---------- Sub App (API) ----------
api_app = FastAPI(default_response_class=ORJSONResponse)

api_app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("Initializing API routes")
init_routes(api_app)
logger.info("API routes initialized successfully")

# ---------- Static Uploads ----------
try:
    BASE_DIR = Path(__file__).resolve().parent  # backend/
    uploads_dir = BASE_DIR / "app" / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)

    logger.info(f"Mounting static files: {uploads_dir}")
    app.mount("/static", StaticFiles(directory=str(uploads_dir)), name="static")
    logger.info(f"Static directory mounted at /static -> {uploads_dir}")

except Exception as e:
    logger.error(f"Failed to mount static dir: {e}")

# ---------- Mount API ----------
app.mount("/api", api_app)

# ---------- Middlewares ----------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=500, compresslevel=5)
api_app.add_middleware(GZipMiddleware, minimum_size=500, compresslevel=5)


# ---------- Routes ----------
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
