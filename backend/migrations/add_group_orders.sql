-- Migration: Add Group Orders functionality
-- This migration adds the new group orders system

-- Create group_orders table
CREATE TABLE IF NOT EXISTS group_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    leader_id INTEGER NOT NULL,
    invite_token VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'GROUP_FORMING',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    leader_paid_at DATETIME,
    expires_at DATETIME,
    finalized_at DATETIME,
    allow_consolidation BOOLEAN DEFAULT 0,
    leader_address_id INTEGER,
    FOREIGN KEY (leader_id) REFERENCES users(id),
    FOREIGN KEY (leader_address_id) REFERENCES user_addresses(id)
);

-- Add new columns to orders table
ALTER TABLE orders ADD COLUMN order_type VARCHAR(10) DEFAULT 'ALONE';
ALTER TABLE orders ADD COLUMN group_order_id INTEGER;
ALTER TABLE orders ADD COLUMN paid_at DATETIME;
ALTER TABLE orders ADD COLUMN ship_to_leader_address BOOLEAN DEFAULT 0;

-- Add foreign key constraint for group_order_id (SQLite doesn't support adding FK constraints directly)
-- We'll handle this in the application code

-- Drop old group_buys and group_buy_participants tables if they exist
DROP TABLE IF EXISTS group_buy_participants;
DROP TABLE IF EXISTS group_buys;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_orders_leader_id ON group_orders(leader_id);
CREATE INDEX IF NOT EXISTS idx_group_orders_invite_token ON group_orders(invite_token);
CREATE INDEX IF NOT EXISTS idx_group_orders_status ON group_orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_group_order_id ON orders(group_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type); 