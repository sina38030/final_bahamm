#!/usr/bin/env python3
"""
Standalone FastAPI Server Runner
This script will run the FastAPI backend server independently on your laptop.
"""

import os
import sys
import subprocess
import time
from pathlib import Path

def main():
    print("🚀 Starting FastAPI Backend Server...")
    print("=" * 50)
    
    # Get the directory where this script is located
    script_dir = Path(__file__).parent.absolute()
    backend_dir = script_dir / "backend"
    
    print(f"Script location: {script_dir}")
    print(f"Backend directory: {backend_dir}")
    
    # Check if backend directory exists
    if not backend_dir.exists():
        print(f"❌ ERROR: Backend directory not found at {backend_dir}")
        input("Press Enter to exit...")
        return 1
    
    # Check if main.py exists
    main_py = backend_dir / "main.py"
    if not main_py.exists():
        print(f"❌ ERROR: main.py not found at {main_py}")
        input("Press Enter to exit...")
        return 1
    
    print("✅ All files found!")
    print("")
    
    # Change to backend directory
    os.chdir(backend_dir)
    print(f"Changed to directory: {os.getcwd()}")
    print("")
    
    # Try different ports
    ports = [8001, 8002, 8003, 8004, 8005]
    
    for port in ports:
        print(f"🔄 Trying to start server on port {port}...")
        try:
            # Start the server
            cmd = [
                sys.executable, "-m", "uvicorn", 
                "main:app", 
                "--host", "127.0.0.1", 
                "--port", str(port),
                "--reload"
            ]
            
            print(f"Running command: {' '.join(cmd)}")
            print("")
            print(f"🌟 Server starting on http://localhost:{port}")
            print("🌟 Admin panel: http://localhost:{}/api/admin/dashboard".format(port))
            print("🌟 Health check: http://localhost:{}/health".format(port))
            print("")
            print("Press Ctrl+C to stop the server")
            print("=" * 50)
            
            # Run the server - this will block until stopped
            subprocess.run(cmd, check=True)
            break
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to start on port {port}: {e}")
            if port == ports[-1]:
                print("❌ All ports failed!")
                input("Press Enter to exit...")
                return 1
            else:
                print(f"🔄 Trying next port...")
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Server stopped by user")
            break
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            input("Press Enter to exit...")
            return 1
    
    print("\n✅ Server shutdown complete")
    input("Press Enter to exit...")
    return 0

if __name__ == "__main__":
    sys.exit(main())



















