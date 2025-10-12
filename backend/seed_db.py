#!/usr/bin/env python3
"""
Simple script to initialize the PostgreSQL database and seed it with sample data.
This script will connect directly to the database container to avoid connection issues.
"""

from app.database import engine, Base
from scripts.seed_products import main as seed_main

def main():
    """Initialize and seed the database"""
    print("Creating database tables...")
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("Tables created successfully.")
        
        # Seed the database
        print("Seeding the database with sample data...")
        seed_main()
        print("Database seeded successfully.")
    except Exception as e:
        print(f"Error initializing database: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main()) 