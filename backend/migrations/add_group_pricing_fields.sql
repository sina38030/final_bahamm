-- Add group pricing fields to products table
ALTER TABLE products ADD COLUMN weight REAL DEFAULT 0;
ALTER TABLE products ADD COLUMN rating REAL DEFAULT 0;
ALTER TABLE products ADD COLUMN sales_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN free_count INTEGER DEFAULT 3;
ALTER TABLE products ADD COLUMN price_single REAL;
ALTER TABLE products ADD COLUMN price_with_1_friend REAL;
ALTER TABLE products ADD COLUMN price_with_2_friends REAL;
ALTER TABLE products ADD COLUMN price_with_3_friends REAL;
ALTER TABLE products ADD COLUMN price_with_4_friends REAL;
ALTER TABLE products ADD COLUMN price_with_5_friends REAL;
ALTER TABLE products ADD COLUMN price_with_6_friends REAL;
ALTER TABLE products ADD COLUMN price_with_7_friends REAL;
ALTER TABLE products ADD COLUMN price_with_8_friends REAL;
ALTER TABLE products ADD COLUMN price_with_9_friends REAL;
ALTER TABLE products ADD COLUMN price_with_10_friends REAL; 