const {
  createMessage,
  getThreads,
  getConversationHistory,
  markConversationRead,
  markMessageDelivered,
  deleteMessageForSelf,
  deleteMessageForEveryone,
  deleteConversation,
} = require('../services/messageService');
const { notifyUser } = require('../services/alertService');
const db = require('../config/db');

// GET /api/messages/threads — list conversations of current user
async function threads(req, res) {
  res.json(await getThreads(req.user.id));
}

// GET /api/messages/:otherId — full history with a specific user
async function history(req, res) {
  const other = Number(req.params.otherId);
  const rows = await getConversationHistory(req.user.id, other);
  const delivered = await markConversationRead(req.user.id, other);

  const io = req.app.get('io');
  if (io && delivered.length) {
    delivered.forEach((message) => {
      io.to(`user:${message.sender_id}`).emit('message:delivered', {
        message_id: message.id,
        sender_id: message.sender_id,
        receiver_id: message.receiver_id,
      });
      io.to(`user:${message.receiver_id}`).emit('message:delivered', {
        message_id: message.id,
        sender_id: message.sender_id,
        receiver_id: message.receiver_id,
      });
    });
  }

  res.json(rows);
}

// POST /api/messages { receiver_id, body } — also broadcasts via socket.io
async function send(req, res) {
  const { receiver_id, body, audio_url, image_url, file_url } = req.body;
  const message = await createMessage({
    senderId: req.user.id,
    receiverId: receiver_id,
    body,
    audio_url,
    image_url,
    file_url,
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`user:${receiver_id}`).emit('message:new', message);
    io.to(`user:${req.user.id}`).emit('message:new', message);
  }

  const { rows: senderRows } = await db.query('SELECT full_name FROM users WHERE id = $1', [req.user.id]);
  await notifyUser({
    userId: receiver_id,
    type: 'new_message',
    title: 'New message',
    body: `New message from ${senderRows[0]?.full_name || 'Nanny user'}.`,
    meta: { message_id: message.id, sender_id: req.user.id },
    emailSubject: 'You have a new message on Nanny',
    emailText: `New message from ${senderRows[0]?.full_name || 'Nanny user'}: ${message.preview || 'Open the app to view it.'}`,
    smsText: `Nanny: new message from ${senderRows[0]?.full_name || 'someone'}.`,
  }, { io });

  res.status(201).json(message);
}

async function supportContact(_req, res) {
  const { rows } = await db.query(
    `SELECT id, full_name, avatar_url, role, address, phone
       FROM users
      WHERE role = 'admin'
      ORDER BY id ASC
      LIMIT 1`
  );
  if (!rows[0]) return res.status(404).json({ error: 'Support admin not found' });
  res.json(rows[0]);
}

async function markDelivered(req, res) {
  const { message_id } = req.body;
  if (!message_id) return res.status(400).json({ error: 'message_id is required' });

  const matched = await markMessageDelivered(Number(message_id), req.user.id);
  if (!matched) {
    return res.json({ ok: true, delivered: false });
  }

  const io = req.app.get('io');
  if (io) {
    io.to(`user:${matched.sender_id}`).emit('message:delivered', {
      message_id: matched.id,
      sender_id: matched.sender_id,
      receiver_id: matched.receiver_id,
    });
    io.to(`user:${matched.receiver_id}`).emit('message:delivered', {
      message_id: matched.id,
      sender_id: matched.sender_id,
      receiver_id: matched.receiver_id,
    });
  }

  res.json({ ok: true, delivered: true });
}

async function removeMessage(req, res) {
  const scope = req.body?.scope || req.query?.scope || 'self';
  const io = req.app.get('io');

  if (scope === 'everyone') {
    const message = await deleteMessageForEveryone(Number(req.params.id), req.user.id);
    if (io) {
      io.to(`user:${message.sender_id}`).emit('message:deleted', {
        message_id: message.id,
        scope: 'everyone',
        message,
      });
      io.to(`user:${message.receiver_id}`).emit('message:deleted', {
        message_id: message.id,
        scope: 'everyone',
        message,
      });
    }
    return res.json({ ok: true, scope: 'everyone', message });
  }

  const message = await deleteMessageForSelf(Number(req.params.id), req.user.id);
  if (io) {
    io.to(`user:${req.user.id}`).emit('message:deleted', {
      message_id: message.id,
      scope: 'self',
      user_id: req.user.id,
    });
  }
  return res.json({ ok: true, scope: 'self', message_id: message.id });
}

async function removeConversation(req, res) {
  const otherId = Number(req.params.otherId);
  await deleteConversation(req.user.id, otherId);
  res.json({ ok: true, other_user_id: otherId });
}

module.exports = {
  threads,
  history,
  send,
  markDelivered,
  removeMessage,
  removeConversation,
  supportContact,
};
