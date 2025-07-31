-- Migration: Add payment tracking fields to orders table
-- Description: Add payment_authority and payment_ref_id fields for ZarinPal integration
-- Date: 2024

-- Add payment tracking fields to orders table
ALTER TABLE orders 
ADD COLUMN payment_authority VARCHAR(100) NULL COMMENT 'ZarinPal payment authority',
ADD COLUMN payment_ref_id VARCHAR(100) NULL COMMENT 'ZarinPal reference ID after successful payment';

-- Create index for faster lookups by payment authority
CREATE INDEX idx_orders_payment_authority ON orders(payment_authority);

-- Create index for faster lookups by payment reference ID
CREATE INDEX idx_orders_payment_ref_id ON orders(payment_ref_id);

-- Update any existing orders that are in pending payment status
-- (Optional: you might want to adjust this based on your current order statuses)
UPDATE orders 
SET status = 'در انتظار پرداخت' 
WHERE status = 'pending';

-- Add some sample status values if needed
-- (Optional: you can customize these based on your business requirements)
-- Common order statuses in Persian:
-- 'در انتظار پرداخت' - Waiting for payment
-- 'پرداخت شده' - Paid
-- 'پرداخت ناموفق' - Payment failed
-- 'در حال پردازش' - Processing
-- 'ارسال شده' - Shipped
-- 'تحویل داده شده' - Delivered
-- 'لغو شده' - Cancelled 