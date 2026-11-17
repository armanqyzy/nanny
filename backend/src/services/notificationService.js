const db = require('../config/db');

async function createNotification({ userId, type, title, body, meta = {} }, options = {}) {
  if (!userId || !type || !title) return null;

  const client = options.client || db;
  const { rows } = await client.query(
    `INSERT INTO notifications (user_id, type, title, body, meta)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [userId, type, title, body || null, JSON.stringify(meta)]
  );

  if (options.io) {
    options.io.to(`user:${userId}`).emit('notification:new', rows[0]);
  }

  forwardToTelegram(userId, { title, body, meta }).catch((err) => console.error('Telegram alert failed:', err.message));

  return rows[0];
}

// Every in-app notification is copied to Telegram for users who connected the bot.
async function forwardToTelegram(userId, { title, body, meta }) {
  const telegram = require('./telegramService');
  if (!telegram.isTelegramEnabled()) return;
  const { rows } = await db.query('SELECT telegram_chat_id FROM users WHERE id = $1', [userId]);
  const chatId = rows[0]?.telegram_chat_id;
  if (!chatId) return;
  const site = telegram.SITE_URL();
  const page = meta?.booking_id ? '/bookings' : (meta?.sender_id || meta?.conversation_user_id) ? '/chat' : '/dashboard';
  const lines = [`🐾 ${title}`, body, site ? `${site}${page}` : ''].filter(Boolean);
  await telegram.sendTelegramMessage(chatId, lines.join('\n\n'));
}

async function listNotifications(userId) {
  const { rows } = await db.query(
    `SELECT *
       FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 30`,
    [userId]
  );
  return rows;
}

async function readNotification(userId, notificationId) {
  const { rows } = await db.query(
    `UPDATE notifications
        SET is_read = TRUE
      WHERE id = $1
        AND user_id = $2
      RETURNING *`,
    [notificationId, userId]
  );
  return rows[0] || null;
}

async function readAllNotifications(userId) {
  const { rowCount } = await db.query(
    `UPDATE notifications
        SET is_read = TRUE
      WHERE user_id = $1
        AND is_read = FALSE`,
    [userId]
  );
  return rowCount;
}

module.exports = {
  createNotification,
  listNotifications,
  readNotification,
  readAllNotifications,
};
