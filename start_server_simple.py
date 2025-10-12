#!/usr/bin/env python3
"""
Simple FastAPI Backend Server for Bahamm App
Run this script to start the backend on localhost:8001
"""

import uvicorn
import os
import sys
from pathlib import Path

def main():
    # Get the absolute path to the project directory
    script_dir = Path(__file__).resolve().parent
    backend_dir = script_dir / "backend"

    # Set environment variables for the database
    db_path = script_dir / "bahamm1.db"
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path.as_posix()}"

    # Add backend directory to Python path
    sys.path.insert(0, str(backend_dir))

    # Change to backend directory
    os.chdir(str(backend_dir))

    print("=" * 50)
    print("🚀 Starting Bahamm FastAPI Backend Server")
    print("=" * 50)
    print(f"📂 Project Directory: {script_dir}")
    print(f"📂 Backend Directory: {backend_dir}")
    print(f"🗄️  Database: {db_path}")
    print(f"🌐 Server URL: http://localhost:8001")
    print(f"📖 API Docs: http://localhost:8001/docs")
    print(f"🔍 Health Check: http://localhost:8001/health")
    print("=" * 50)
    print("✨ Server is starting... Press Ctrl+C to stop")
    print("=" * 50)

    try:
        # Start the FastAPI server WITHOUT reload for stability
        uvicorn.run(
            "app.main:app",
            host="127.0.0.1",
            port=8001,
            reload=False,  # Changed to False for stability
            log_level="info",
            access_log=True
        )
    except KeyboardInterrupt:
        print("\n" + "=" * 50)
        print("🛑 Server stopped by user")
        print("=" * 50)
    except Exception as e:
        print(f"\n❌ Error starting server: {e}")
        print("=" * 50)
        print("💡 Troubleshooting tips:")
        print("1. Make sure you have installed all dependencies")
        print("2. Check if port 8001 is already in use")
        print("3. Ensure bahamm1.db exists in the project root")
        print("=" * 50)

if __name__ == "__main__":
    main()
