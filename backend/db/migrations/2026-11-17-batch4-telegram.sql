-- Batch 4: Telegram notifications. Applied automatically on server start.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT,
  ADD COLUMN IF NOT EXISTS telegram_link_token VARCHAR(64),
  ADD COLUMN IF NOT EXISTS telegram_link_expires TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_users_telegram_link_token ON users (telegram_link_token);
