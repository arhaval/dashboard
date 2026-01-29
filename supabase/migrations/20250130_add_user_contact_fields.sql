-- Add contact and payment fields to users table
-- Run this migration in Supabase SQL Editor

ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS iban TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN users.phone IS 'Phone number (mobile)';
COMMENT ON COLUMN users.iban IS 'Bank IBAN for payments';
COMMENT ON COLUMN users.bank_name IS 'Bank name';
COMMENT ON COLUMN users.address IS 'Address';
COMMENT ON COLUMN users.notes IS 'Admin notes about the user';
