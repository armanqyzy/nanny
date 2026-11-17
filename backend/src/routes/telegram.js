const router = require('express').Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const telegram = require('../services/telegramService');

// Telegram calls this for every message sent to the bot.
router.post('/webhook', asyncHandler(async (req, res) => {
  if (!telegram.isTelegramEnabled() || req.get('X-Telegram-Bot-Api-Secret-Token') !== telegram.webhookSecret()) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  // Answer at once; Telegram retries slow webhooks.
  res.json({ ok: true });
  telegram.handleUpdate(req.body).catch((err) => console.error('[telegram] update failed:', err.message));
}));

router.get('/status', auth, asyncHandler(async (req, res) => {
  const { rows } = await db.query('SELECT telegram_chat_id FROM users WHERE id = $1', [req.user.id]);
  let botUsername = null;
  if (telegram.isTelegramEnabled()) {
    botUsername = await telegram.getBotUsername().catch(() => null);
  }
  res.json({
    enabled: Boolean(botUsername),
    connected: Boolean(rows[0]?.telegram_chat_id),
    bot_username: botUsername,
  });
}));

router.post('/link', auth, asyncHandler(async (req, res) => {
  if (!telegram.isTelegramEnabled()) return res.status(503).json({ error: 'Telegram notifications are not set up yet.' });
  const url = await telegram.createLinkUrl(req.user.id);
  res.json({ url });
}));

router.delete('/link', auth, asyncHandler(async (req, res) => {
  const { rows } = await db.query('SELECT telegram_chat_id FROM users WHERE id = $1', [req.user.id]);
  const oldChat = rows[0]?.telegram_chat_id;
  await db.query('UPDATE users SET telegram_chat_id = NULL WHERE id = $1', [req.user.id]);
  if (oldChat) telegram.sendTelegramMessage(oldChat, 'Уведомления Nanny отключены.').catch(() => {});
  res.json({ ok: true });
}));

router.post('/test', auth, asyncHandler(async (req, res) => {
  const { rows } = await db.query('SELECT telegram_chat_id FROM users WHERE id = $1', [req.user.id]);
  if (!rows[0]?.telegram_chat_id) return res.status(400).json({ error: 'Telegram is not connected.' });
  await telegram.sendTelegramMessage(rows[0].telegram_chat_id, 'Тестовое уведомление Nanny: всё работает 🐾');
  res.json({ ok: true });
}));

module.exports = router;
