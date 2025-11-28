#!/usr/bin/env python3
from app.database import get_db
from app.models import PopularSearch
import os

print(f'Current directory: {os.getcwd()}')
print(f'Database URL from env: {os.environ.get("DATABASE_URL", "Not set")}')

db = next(get_db())
searches = db.query(PopularSearch).all()
print(f'Found {len(searches)} searches in database:')
for s in searches[:5]:  # Show first 5
    print(f'  ID: {s.id}, Term: {repr(s.search_term)}, Active: {s.is_active}')
db.close()






