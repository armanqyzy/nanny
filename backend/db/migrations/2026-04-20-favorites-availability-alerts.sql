CREATE TABLE IF NOT EXISTS favorite_sitters (
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sitter_id INTEGER NOT NULL REFERENCES sitters(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (owner_id, sitter_id)
);

CREATE TABLE IF NOT EXISTS notification_jobs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  type VARCHAR(40) NOT NULL,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'sms')),
  destination TEXT NOT NULL,
  title VARCHAR(160) NOT NULL,
  body TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'cancelled')),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_favorite_sitters_owner_created
  ON favorite_sitters(owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_jobs_due
  ON notification_jobs(status, due_at)
  WHERE processed_at IS NULL;
