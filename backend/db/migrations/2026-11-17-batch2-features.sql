-- Batch 2 features. Also applied automatically on server start (src/config/ensureSchema.js).

-- Pets with booking history are archived instead of deleted
ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- Pet medical card: vaccinations and when the next dose is due
CREATE TABLE IF NOT EXISTS pet_vaccinations (
  id          SERIAL PRIMARY KEY,
  pet_id      INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  name        VARCHAR(120) NOT NULL,
  given_on    DATE,
  next_due    DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pet_vaccinations_pet_idx ON pet_vaccinations (pet_id);

-- Bookings created together (several pets or a repeating schedule) share a group id
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS group_id VARCHAR(40);

-- Audit log of admin actions
CREATE TABLE IF NOT EXISTS admin_actions (
  id          SERIAL PRIMARY KEY,
  admin_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(60) NOT NULL,
  target_type VARCHAR(40),
  target_id   INTEGER,
  details     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS admin_actions_created_idx ON admin_actions (created_at DESC);
