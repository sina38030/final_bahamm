#!/usr/bin/env python3
"""
Standalone script to run FastAPI backend with bahamm.db database
This ensures the backend uses the correct database file
"""

import uvicorn
import os
import sys
from pathlib import Path

def main():
    # Get the backend directory
    backend_dir = Path(__file__).resolve().parent
    project_root = backend_dir.parent
    
    # Set working directory to backend
    os.chdir(backend_dir)
    sys.path.insert(0, str(backend_dir))
    
    # Set the DATABASE_URL environment variable to use bahamm1.db at project root
    project_root_db = project_root / "bahamm1.db"
    os.environ["DATABASE_URL"] = f"sqlite:///{project_root_db}"
    
    print("=" * 50)
    print("Starting FastAPI Backend with bahamm1.db")
    print("=" * 50)
    print(f"Working directory: {backend_dir}")
    print(f"Database path: {project_root_db}")
    print(f"Database URL: {os.environ['DATABASE_URL']}")
    print(f"Backend will be available at: http://127.0.0.1:8001")
    print(f"API docs will be available at: http://127.0.0.1:8001/docs")
    print("=" * 50)
    
    # Verify database exists
    if not project_root_db.exists():
        print(f"WARNING: Database file not found at {project_root_db}")
        print("The application will create a new database file.")
    else:
        print(f"✓ Database file found: {project_root_db}")
    
    print("\nStarting server...")
    print("Press Ctrl+C to stop the server")
    print("-" * 50)
    
    try:
        uvicorn.run(
            "main:app",
            host="127.0.0.1",
            port=8001,
            reload=True,
            log_level="info",
            access_log=True
        )
    except KeyboardInterrupt:
        print("\n" + "=" * 50)
        print("Server stopped by user")
        print("=" * 50)
    except Exception as e:
        print(f"\nError starting server: {e}")
        print("Make sure all dependencies are installed:")
        print("pip install fastapi uvicorn sqlalchemy")

if __name__ == "__main__":
    main()
