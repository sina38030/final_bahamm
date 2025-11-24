#!/usr/bin/env python3
from app.database import get_db
from app.models import PopularSearch

db = next(get_db())

# Clear existing data
db.query(PopularSearch).delete()
db.commit()

# Insert proper Persian data
persian_searches = [
    PopularSearch(search_term='ماشین اصلاح', sort_order=0, is_active=True),
    PopularSearch(search_term='هدفون بی سیم', sort_order=1, is_active=True),
    PopularSearch(search_term='گوشی موبایل', sort_order=2, is_active=True),
    PopularSearch(search_term='لپ تاپ', sort_order=3, is_active=True),
    PopularSearch(search_term='لوازم آشپزخانه', sort_order=4, is_active=True),
    PopularSearch(search_term='لباس مردانه', sort_order=5, is_active=True),
]

for search in persian_searches:
    db.add(search)
db.commit()

searches = db.query(PopularSearch).all()
print(f'Inserted {len(searches)} Persian searches')
for s in searches:
    print(f'  - ID: {s.id}, Term: {s.search_term}, Order: {s.sort_order}')

db.close()

