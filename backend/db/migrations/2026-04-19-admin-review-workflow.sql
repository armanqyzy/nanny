ALTER TABLE sitters
  ADD COLUMN IF NOT EXISTS review_status VARCHAR(24) NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sitters_review_status_check'
  ) THEN
    ALTER TABLE sitters
      ADD CONSTRAINT sitters_review_status_check
      CHECK (review_status IN ('new','in_review','approved','changes_requested','rejected'));
  END IF;
END $$;

UPDATE sitters
SET review_status = CASE WHEN is_verified THEN 'approved' ELSE 'new' END
WHERE review_status IS NULL OR review_status = '';

CREATE TABLE IF NOT EXISTS sitter_review_events (
  id SERIAL PRIMARY KEY,
  sitter_id INTEGER NOT NULL REFERENCES sitters(id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(40) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
