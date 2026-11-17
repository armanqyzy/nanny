-- Batch 1 features. Also applied automatically on server start (src/config/ensureSchema.js).

-- Booking payment (demo provider, same as the shop)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS payment_last4 VARCHAR(4),
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Days a sitter does not work
CREATE TABLE IF NOT EXISTS sitter_unavailable_days (
  id         SERIAL PRIMARY KEY,
  sitter_id  INTEGER NOT NULL REFERENCES sitters(id) ON DELETE CASCADE,
  day        DATE NOT NULL,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sitter_id, day)
);

-- Sitter reply to a review
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS sitter_reply TEXT,
  ADD COLUMN IF NOT EXISTS sitter_replied_at TIMESTAMPTZ;
