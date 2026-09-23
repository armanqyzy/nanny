ALTER TABLE users
  ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(40),
  ADD COLUMN IF NOT EXISTS emergency_contact_notes TEXT;

ALTER TABLE sitters
  ADD COLUMN IF NOT EXISTS background_check_status VARCHAR(24) NOT NULL DEFAULT 'pending';

ALTER TABLE sitters
  ADD COLUMN IF NOT EXISTS service_area_text TEXT,
  ADD COLUMN IF NOT EXISTS service_radius_km INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS work_days TEXT,
  ADD COLUMN IF NOT EXISTS work_start TIME,
  ADD COLUMN IF NOT EXISTS work_end TIME,
  ADD COLUMN IF NOT EXISTS auto_reply_templates JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'sitters_background_check_status_check'
  ) THEN
    ALTER TABLE sitters
      ADD CONSTRAINT sitters_background_check_status_check
      CHECK (background_check_status IN ('pending','submitted','manual_review','approved','rejected'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS support_tickets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(40) NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  status VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','resolved','closed')),
  subject VARCHAR(180) NOT NULL,
  body TEXT NOT NULL,
  assigned_admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_created
  ON support_tickets(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status_created
  ON support_tickets(status, created_at DESC);

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_suggested_category VARCHAR(40),
  ADD COLUMN IF NOT EXISTS ai_suggested_priority VARCHAR(20),
  ADD COLUMN IF NOT EXISTS ai_first_reply TEXT;
