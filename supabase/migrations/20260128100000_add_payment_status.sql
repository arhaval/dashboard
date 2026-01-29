-- =============================================================================
-- Add payment_status enum and status column to payments table
-- =============================================================================

-- Create payment status enum
CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- Add status column to payments table with default PENDING
ALTER TABLE payments ADD COLUMN status payment_status DEFAULT 'PENDING' NOT NULL;

-- Create index for payment status filtering
CREATE INDEX idx_payments_status ON payments(status);
