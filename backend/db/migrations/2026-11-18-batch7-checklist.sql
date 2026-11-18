-- Batch 7: care checklist inside a booking. The owner lists what has to be done
-- ("feed at 9:00", "pill in the evening"), the sitter ticks items off during the booking.
CREATE TABLE IF NOT EXISTS booking_checklist_items (
    id          SERIAL PRIMARY KEY,
    booking_id  INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    title       VARCHAR(160) NOT NULL,
    due_time    TIME,
    is_done     BOOLEAN NOT NULL DEFAULT FALSE,
    done_at     TIMESTAMPTZ,
    done_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_checklist_booking
  ON booking_checklist_items(booking_id);
