-- Add missing fields to categories table
ALTER TABLE categories ADD COLUMN description TEXT;
ALTER TABLE categories ADD COLUMN is_active BOOLEAN DEFAULT 1;
ALTER TABLE categories ADD COLUMN created_at DATETIME;

-- Update existing categories to have default values
UPDATE categories SET description = NULL WHERE description IS NULL;
UPDATE categories SET is_active = 1 WHERE is_active IS NULL;
UPDATE categories SET created_at = datetime('now') WHERE created_at IS NULL; 