#!/usr/bin/env python3
"""Check where backend expects database"""
import os
import sys

# Simulate backend's path resolution
backend_app_file = "C:/Projects/final_bahamm/backend/app/database.py"
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(backend_app_file)))
project_root = os.path.dirname(backend_dir)
db_path = os.path.join(project_root, 'bahamm1.db')

# Normalize
db_path_normalized = db_path.replace('\\', '/')

DATABASE_URL = f"sqlite:///{db_path_normalized}"

print(f"Backend directory: {backend_dir}")
print(f"Project root: {project_root}")
print(f"Expected DB path: {db_path}")
print(f"Normalized: {db_path_normalized}")
print(f"DATABASE_URL: {DATABASE_URL}")
print(f"\nDoes DB exist at this path? {os.path.exists(db_path)}")

# Also check where backend is actually running from
print(f"\nCurrent working directory: {os.getcwd()}")
cwd_db = os.path.join(os.getcwd(), 'bahamm1.db')
print(f"DB in CWD? {os.path.exists(cwd_db)}")

