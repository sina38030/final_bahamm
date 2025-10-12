-- Migration: Add Telegram authentication fields to users table
-- Created: 2025-10-11
-- Description: Adds fields to support Telegram Mini App authentication

-- Add telegram_id column (unique identifier from Telegram)
ALTER TABLE users ADD COLUMN telegram_id VARCHAR(50) UNIQUE;

-- Add telegram_username column (Telegram username if available)
ALTER TABLE users ADD COLUMN telegram_username VARCHAR(100);

-- Add telegram_photo_url column (profile photo URL from Telegram)
ALTER TABLE users ADD COLUMN telegram_photo_url VARCHAR(500);

-- Add telegram_language_code column (user's language preference from Telegram)
ALTER TABLE users ADD COLUMN telegram_language_code VARCHAR(10);

-- Create index on telegram_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);

