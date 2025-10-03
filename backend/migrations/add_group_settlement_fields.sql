-- Migration: Add Group Settlement Fields
-- This migration adds fields to track expected friends and settlement status

-- Add new columns to group_orders table
ALTER TABLE group_orders ADD COLUMN expected_friends INTEGER DEFAULT NULL;
ALTER TABLE group_orders ADD COLUMN settlement_required BOOLEAN DEFAULT 0;
ALTER TABLE group_orders ADD COLUMN settlement_amount INTEGER DEFAULT 0;
ALTER TABLE group_orders ADD COLUMN settlement_paid_at DATETIME DEFAULT NULL;

-- Add new columns to orders table  
ALTER TABLE orders ADD COLUMN is_settlement_payment BOOLEAN DEFAULT 0;

-- Create index for settlement queries
CREATE INDEX IF NOT EXISTS idx_group_orders_settlement ON group_orders(settlement_required, settlement_paid_at);
