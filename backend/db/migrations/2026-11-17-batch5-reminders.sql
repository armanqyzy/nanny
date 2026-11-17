-- Batch 5: one-time reminder to a sitter about a request they have not answered yet.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS pending_reminder_sent_at TIMESTAMPTZ;
