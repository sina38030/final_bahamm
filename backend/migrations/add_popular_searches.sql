-- Create table for popular searches
CREATE TABLE IF NOT EXISTS popular_searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    search_term VARCHAR(120) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index to quickly fetch by sort order
CREATE INDEX IF NOT EXISTS idx_popular_searches_sort ON popular_searches (sort_order);

-- Index to filter by active status
CREATE INDEX IF NOT EXISTS idx_popular_searches_active ON popular_searches (is_active);

-- Insert default popular searches
INSERT INTO popular_searches (search_term, sort_order, is_active) VALUES
    ('ماشین اصلاح', 0, 1),
    ('هدفون بی سیم', 1, 1),
    ('گوشی موبایل', 2, 1),
    ('لپ تاپ', 3, 1),
    ('لوازم آشپزخانه', 4, 1),
    ('لباس مردانه', 5, 1);

