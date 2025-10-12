#!/usr/bin/env python3
"""
Standalone FastAPI server startup script
This runs independently of Cursor and stays running
"""

import uvicorn
import os
import sys
from pathlib import Path

def main():
    # Get the backend directory (where this script is located)
    backend_dir = Path(__file__).parent.absolute()
    
    # Change to backend directory
    os.chdir(backend_dir)
    
    # Add backend directory to Python path
    sys.path.insert(0, str(backend_dir))
    
    print("=" * 60)
    print("🚀 Starting FastAPI Backend Server")
    print("=" * 60)
    print(f"📁 Backend Directory: {backend_dir}")
    print(f"🗄️  Database: bahamm.db.bak")
    print(f"🌐 URL: http://127.0.0.1:8001")
    print(f"📱 SMS: Melipayamak API Enabled")
    print("=" * 60)
    print("✅ Server will run independently of Cursor")
    print("✅ Close Cursor anytime - server stays running")
    print("✅ Press Ctrl+C to stop the server")
    print("=" * 60)
    
    try:
        # Start the server
        uvicorn.run(
            "app.main:app",
            host="127.0.0.1",
            port=8001,
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n" + "=" * 60)
        print("🛑 Server stopped by user")
        print("=" * 60)
    except Exception as e:
        print(f"\n❌ Error starting server: {e}")
        input("Press Enter to exit...")

if __name__ == "__main__":
    main()
