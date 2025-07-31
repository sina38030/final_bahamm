from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app import models
from app.routes import init_routes
from app.utils.logging import get_logger

# Initialize root logger
logger = get_logger(__name__)

models.Base.metadata.create_all(bind=engine)
logger.info("Database tables created")

# Create main app
app = FastAPI(
    title="Bahamm App API",
    description="API for the Bahamm App",
    version="1.0.0"
)

# Create sub-app for API routes
api_app = FastAPI()

api_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("Initializing API routes")
init_routes(api_app)
logger.info("API routes initialized successfully")

# Mount the API app under /api
app.mount("/api", api_app)

# Add CORS to main app as well
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
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