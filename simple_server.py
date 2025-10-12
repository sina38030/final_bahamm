#!/usr/bin/env python3
"""
Simple server to test the API
"""

import uvicorn
import os
import sys

# Add current directory to path
sys.path.insert(0, os.getcwd())

if __name__ == "__main__":
    print("Starting simple server...")
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8001,
        reload=False,  # Disable reload for testing
        log_level="info"
    )