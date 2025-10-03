#!/usr/bin/env python3
"""
Simple script to start the FastAPI backend server
"""

import uvicorn
import os
import sys

# Set the current directory to the backend directory
backend_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(backend_dir)
sys.path.insert(0, backend_dir)

print(f"Starting backend from: {backend_dir}")
print("Backend will be available at: http://127.0.0.1:8001")

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8001,
        reload=True,
        log_level="info"
    )
