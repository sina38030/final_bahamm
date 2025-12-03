-- Adds is_invited_checkout flag to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_invited_checkout BOOLEAN DEFAULT 0;

