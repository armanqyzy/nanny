const {
  listNotifications,
  readNotification,
  readAllNotifications,
} = require('../services/notificationService');

async function list(req, res) {
  res.json(await listNotifications(req.user.id));
}

async function markRead(req, res) {
  const row = await readNotification(req.user.id, Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'Notification not found' });
  res.json(row);
}

async function markAllRead(req, res) {
  const updated = await readAllNotifications(req.user.id);
  res.json({ ok: true, updated });
}

module.exports = { list, markRead, markAllRead };
