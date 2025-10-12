-- Add position fields for products on home and landing pages
ALTER TABLE products ADD COLUMN home_position INTEGER;
ALTER TABLE products ADD COLUMN landing_position INTEGER;

