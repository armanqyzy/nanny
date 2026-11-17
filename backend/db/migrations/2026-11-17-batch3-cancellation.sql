-- Batch 3: cancellation reason and refund policy. Applied automatically on server start.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(10),
  ADD COLUMN IF NOT EXISTS cancel_reason VARCHAR(40),
  ADD COLUMN IF NOT EXISTS cancel_comment TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_percent INTEGER,
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2);
