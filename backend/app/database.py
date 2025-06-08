from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Get the database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

# Fix common URL mistake: change postgres:// to postgresql://
# SQLAlchemy requires postgresql:// but many services provide postgres:// URLs
if DATABASE_URL and DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
    print("Notice: Changed 'postgres://' to 'postgresql://' in DATABASE_URL")

print(f"Connecting to database with URL: {DATABASE_URL}")

# Create the engine
engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
