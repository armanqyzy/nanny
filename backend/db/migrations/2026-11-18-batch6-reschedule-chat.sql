-- Batch 6: moving a booking to other dates, and chat messages that point at a booking.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS rescheduled_from_start DATE,
  ADD COLUMN IF NOT EXISTS rescheduled_from_end DATE,
  ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reschedule_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL;
