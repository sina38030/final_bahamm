-- Add shipping_address and delivery_slot fields to orders table

ALTER TABLE orders 
ADD COLUMN shipping_address TEXT NULL;

ALTER TABLE orders 
ADD COLUMN delivery_slot VARCHAR(100) NULL;


