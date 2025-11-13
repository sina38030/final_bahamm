from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
from sqlalchemy.engine.url import make_url
from sqlalchemy import event

# Load .env file if it exists
if os.path.exists('.env'):
    load_dotenv()

# Get the database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

# If DATABASE_URL is set to a wrong/incorrect path, ignore it
if DATABASE_URL and "OneDrive" in DATABASE_URL and "bahamm.db" in DATABASE_URL:
    print(f"Warning: Ignoring incorrect DATABASE_URL from environment: {DATABASE_URL}")
    DATABASE_URL = None

# Force database path to the project root bahamm1.db (one level above backend)
if not DATABASE_URL:
    # Get the directory containing this file (backend/app), then go up two levels to project root
    current_file_dir = os.path.dirname(os.path.abspath(__file__))  # backend/app
    backend_dir = os.path.dirname(current_file_dir)  # backend
    project_root = os.path.dirname(backend_dir)  # project root
    db_path = os.path.join(project_root, 'bahamm1.db')
    # Normalize Windows backslashes to forward slashes for SQLAlchemy URL
    db_path = db_path.replace('\\', '/')
    DATABASE_URL = f"sqlite:///{db_path}"
    print(f"Using database: {DATABASE_URL}")

# Fix common URL mistake: change postgres:// to postgresql://
# SQLAlchemy requires postgresql:// but many services provide postgres:// URLs
if DATABASE_URL and DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
    print("Notice: Changed 'postgres://' to 'postgresql://' in DATABASE_URL")

# If DATABASE_URL points to a non-existent SQLite file, try project root bahamm1.db
try:
    if DATABASE_URL and DATABASE_URL.startswith('sqlite'):
        url = make_url(DATABASE_URL)
        db_fs_path = url.database or ''
        if db_fs_path and not os.path.exists(db_fs_path):
            current_file_dir = os.path.dirname(os.path.abspath(__file__))  # backend/app
            backend_dir = os.path.dirname(current_file_dir)  # backend
            project_root = os.path.dirname(backend_dir)  # project root
            candidate = os.path.join(project_root, 'bahamm1.db').replace('\\', '/')
            if os.path.exists(candidate):
                print(f"Warning: SQLite path not found: {db_fs_path} -> switching to project root DB: {candidate}")
                DATABASE_URL = f"sqlite:///{candidate}"
except Exception as _e:
    print(f"Warning: could not validate/adjust DATABASE_URL: {_e}")

print(f"Connecting to database with URL: {DATABASE_URL}")

# Create the engine
if DATABASE_URL and DATABASE_URL.startswith('sqlite'):
    # SQLite in web apps should generally avoid connection pooling and allow cross-thread access
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=NullPool,
    )
    # Apply SQLite PRAGMAs for performance on each new connection
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        try:
            cursor = dbapi_connection.cursor()
            # WAL improves write concurrency; NORMAL reduces fsyncs while staying reasonably safe
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            # Negative cache_size sets cache in KB; e.g., -20000 = ~20MB page cache
            cursor.execute("PRAGMA cache_size=-20000")
            cursor.execute("PRAGMA temp_store=MEMORY")
            # Enable mmap to speed reads on larger DBs where supported
            cursor.execute("PRAGMA mmap_size=268435456")  # 256MB
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
        except Exception:
            # Fail open; PRAGMAs are best-effort
            try:
                cursor.close()
            except Exception:
                pass
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
