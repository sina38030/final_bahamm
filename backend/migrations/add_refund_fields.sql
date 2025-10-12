-- Migration: Add refund payout fields for group leaders

-- Add new columns to group_orders table for refund payouts
ALTER TABLE group_orders ADD COLUMN refund_due_amount INTEGER DEFAULT 0;
ALTER TABLE group_orders ADD COLUMN refund_card_number VARCHAR(32) DEFAULT NULL;
ALTER TABLE group_orders ADD COLUMN refund_requested_at DATETIME DEFAULT NULL;
ALTER TABLE group_orders ADD COLUMN refund_paid_at DATETIME DEFAULT NULL;

-- Helpful index for admin refunds queue
CREATE INDEX IF NOT EXISTS idx_group_orders_refunds ON group_orders(refund_due_amount, refund_paid_at);


