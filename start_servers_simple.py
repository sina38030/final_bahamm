#!/usr/bin/env python3
"""
Simple server starter script
"""

import subprocess
import time
import sys
import os

def main():
    print("🚀 Starting servers...")

    # Start backend
    print("📡 Starting backend on port 8002...")
    backend_proc = subprocess.Popen([
        sys.executable, "-m", "uvicorn",
        "app.main:app",
        "--host", "127.0.0.1",
        "--port", "8002",
        "--reload"
    ], cwd=os.path.dirname(__file__))

    # Wait a bit
    time.sleep(2)

    # Start frontend
    print("🌐 Starting frontend on port 3001...")
    frontend_proc = subprocess.Popen([
        "npm", "run", "dev"
    ], cwd=os.path.join(os.path.dirname(__file__), "frontend"))

    print("✅ Servers starting...")
    print("📡 Backend: http://127.0.0.1:8002")
    print("🌐 Frontend: http://127.0.0.1:3001")
    print("⏹️  Press Ctrl+C to stop")

    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        print("\n🛑 Stopping servers...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("✅ Servers stopped")

if __name__ == "__main__":
    main()
