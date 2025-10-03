-- Create table for delivery slots configuration
CREATE TABLE IF NOT EXISTS delivery_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    delivery_date DATE NOT NULL,
    start_time VARCHAR(5) NOT NULL,
    end_time VARCHAR(5) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    capacity INTEGER NULL,
    is_day_off BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index to quickly fetch by date range
CREATE INDEX IF NOT EXISTS idx_delivery_slots_date ON delivery_slots (delivery_date);

-- Unique constraint to avoid duplicate slots per date/time
CREATE UNIQUE INDEX IF NOT EXISTS uq_delivery_slots_date_range
ON delivery_slots (delivery_date, start_time, end_time);


