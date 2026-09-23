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

  return rows[0];
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
