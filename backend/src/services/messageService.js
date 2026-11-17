const db = require('../config/db');

function buildMessagePreview(message) {
  if (message.deleted_for_everyone) return 'Message deleted';
  if (message.body) return message.body;
  if (message.image_url) return 'Photo';
  if (message.audio_url) return 'Voice message';
  if (message.file_url) return 'File';
  return 'Message';
}

function normalizeMessage(row) {
  if (row.deleted_for_everyone) {
    return {
      ...row,
      body: 'Message deleted for everyone',
      audio_url: null,
      image_url: null,
      file_url: null,
      preview: 'Message deleted',
    };
  }

  return {
    ...row,
    preview: buildMessagePreview(row),
  };
}

const MAX_BODY_LENGTH = 4000;
const MAX_MEDIA_LENGTH = 7 * 1024 * 1024; // data URL characters (~5 MB file)

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function validateMedia(value, label) {
  if (value == null || value === '') return;
  if (typeof value !== 'string') throw httpError(400, `${label} is invalid`);
  const allowed = value.startsWith('data:') || /^https?:\/\//i.test(value) || value.startsWith('/uploads/');
  if (!allowed) throw httpError(400, `${label} is invalid`);
  if (value.length > MAX_MEDIA_LENGTH) throw httpError(413, 'Attachment is too large. Maximum size is 5 MB.');
}

// Short booking info shown on a message that was written about a specific booking.
const BOOKING_INFO_SQL = `
  SELECT b.id AS booking_id, b.service AS booking_service, b.start_date AS booking_start_date,
         b.end_date AS booking_end_date, b.status AS booking_status, p.name AS booking_pet_name
    FROM bookings b JOIN pets p ON p.id = b.pet_id
   WHERE b.id = $1`;

async function attachBooking(message) {
  if (!message?.booking_id) return message;
  const { rows } = await db.query(BOOKING_INFO_SQL, [message.booking_id]);
  return rows[0] ? { ...message, ...rows[0] } : message;
}

// A message may point at a booking only if both people in the chat are part of that booking.
async function bookingBelongsToPair(bookingId, userA, userB) {
  const { rows } = await db.query(
    `SELECT b.owner_id, s.user_id AS sitter_user_id FROM bookings b JOIN sitters s ON s.id = b.sitter_id WHERE b.id = $1`,
    [bookingId]
  );
  const row = rows[0];
  if (!row) return false;
  const pair = [Number(userA), Number(userB)].sort().join(':');
  return pair === [row.owner_id, row.sitter_user_id].sort().join(':');
}

async function createMessage({ senderId, receiverId, body, audio_url, image_url, file_url, booking_id }) {
  receiverId = Number(receiverId);
  const text = typeof body === 'string' ? body.trim() : '';
  const hasContent = [text, audio_url, image_url, file_url].some((value) => String(value || '').trim());
  if (!Number.isInteger(receiverId) || receiverId <= 0 || !hasContent) {
    throw httpError(400, 'receiver_id and at least one message content field are required');
  }
  if (receiverId === Number(senderId)) {
    throw httpError(400, 'You cannot send a message to yourself');
  }
  if (text.length > MAX_BODY_LENGTH) {
    throw httpError(400, `Message is too long. Maximum is ${MAX_BODY_LENGTH} characters.`);
  }
  validateMedia(audio_url, 'audio_url');
  validateMedia(image_url, 'image_url');
  validateMedia(file_url, 'file_url');

  const { rows: receiverRows } = await db.query('SELECT id, is_blocked FROM users WHERE id = $1', [receiverId]);
  if (!receiverRows[0]) throw httpError(404, 'This user does not exist anymore');
  if (receiverRows[0].is_blocked) throw httpError(403, 'This user is blocked and cannot receive messages');

  const bookingId = Number(booking_id) || null;
  if (bookingId && !(await bookingBelongsToPair(bookingId, senderId, receiverId))) {
    throw httpError(403, 'This booking is not between you and this user');
  }

  const { rows } = await db.query(
    `INSERT INTO messages (sender_id, receiver_id, body, audio_url, image_url, file_url, booking_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [senderId, receiverId, text || null, audio_url || null, image_url || null, file_url || null, bookingId]
  );

  return attachBooking(normalizeMessage(rows[0]));
}

async function getThreads(userId) {
  const { rows } = await db.query(
    `
    WITH visible_messages AS (
      SELECT
        m.*,
        CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END AS other_id
      FROM messages m
      LEFT JOIN message_hidden_for_users hidden
        ON hidden.message_id = m.id AND hidden.user_id = $1
      LEFT JOIN deleted_conversations dc
        ON dc.user_id = $1
       AND dc.other_user_id = CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END
      WHERE hidden.message_id IS NULL
        AND (m.sender_id = $1 OR m.receiver_id = $1)
        AND (dc.deleted_before IS NULL OR m.created_at > dc.deleted_before)
    ),
    last AS (
      SELECT DISTINCT ON (other_id)
        other_id, id, sender_id, receiver_id, body, audio_url, image_url, file_url,
        is_read, is_delivered, deleted_for_everyone, created_at
      FROM visible_messages
      ORDER BY other_id, created_at DESC
    )
    SELECT u.id, u.full_name, u.avatar_url, u.role, u.address, u.phone,
           l.id AS last_message_id,
           l.sender_id, l.receiver_id, l.body, l.audio_url, l.image_url, l.file_url,
           l.deleted_for_everyone, l.created_at AS last_at,
           (l.sender_id <> $1 AND NOT l.is_read) AS unread
      FROM last l
      JOIN users u ON u.id = l.other_id
     ORDER BY l.created_at DESC
    `,
    [userId]
  );

  return rows.map((row) => ({
    ...row,
    last_message: buildMessagePreview(row),
  }));
}

async function getConversationHistory(userId, otherId) {
  const { rows } = await db.query(
    `SELECT m.*, b.service AS booking_service, b.start_date AS booking_start_date, b.end_date AS booking_end_date,
            b.status AS booking_status, bp.name AS booking_pet_name
       FROM messages m
       LEFT JOIN bookings b ON b.id = m.booking_id
       LEFT JOIN pets bp ON bp.id = b.pet_id
       LEFT JOIN message_hidden_for_users hidden
         ON hidden.message_id = m.id AND hidden.user_id = $1
       LEFT JOIN deleted_conversations dc
         ON dc.user_id = $1 AND dc.other_user_id = $2
      WHERE hidden.message_id IS NULL
        AND ((m.sender_id = $1 AND m.receiver_id = $2)
          OR (m.sender_id = $2 AND m.receiver_id = $1))
        AND (dc.deleted_before IS NULL OR m.created_at > dc.deleted_before)
      ORDER BY m.created_at ASC`,
    [userId, otherId]
  );

  return rows.map(normalizeMessage);
}

async function markConversationDelivered(userId, otherId) {
  const { rows } = await db.query(
    `UPDATE messages
        SET is_delivered = TRUE
      WHERE sender_id = $1
        AND receiver_id = $2
        AND is_delivered = FALSE
        AND deleted_for_everyone = FALSE
      RETURNING id, sender_id, receiver_id`,
    [otherId, userId]
  );
  return rows;
}

async function markConversationRead(userId, otherId) {
  const { rows } = await db.query(
    `UPDATE messages
        SET is_read = TRUE,
            is_delivered = TRUE
      WHERE sender_id = $1
        AND receiver_id = $2
        AND is_read = FALSE
        AND deleted_for_everyone = FALSE
      RETURNING id, sender_id, receiver_id`,
    [otherId, userId]
  );
  return rows;
}

async function markMessageDelivered(messageId, userId) {
  const { rows } = await db.query(
    `UPDATE messages
        SET is_delivered = TRUE
      WHERE id = $1
        AND receiver_id = $2
      RETURNING id, sender_id, receiver_id`,
    [messageId, userId]
  );
  return rows[0] || null;
}

async function deleteMessageForSelf(messageId, userId) {
  const { rows } = await db.query(
    `SELECT id, sender_id, receiver_id
       FROM messages
      WHERE id = $1 AND ($2 IN (sender_id, receiver_id))`,
    [messageId, userId]
  );
  if (!rows[0]) throw httpError(404, 'Message not found');

  await db.query(
    `INSERT INTO message_hidden_for_users (message_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (message_id, user_id) DO NOTHING`,
    [messageId, userId]
  );

  return rows[0];
}

async function deleteMessageForEveryone(messageId, userId) {
  const { rows } = await db.query(
    `UPDATE messages
        SET is_deleted = TRUE,
            deleted_for_everyone = TRUE,
            body = NULL,
            audio_url = NULL,
            image_url = NULL,
            file_url = NULL
      WHERE id = $1
        AND sender_id = $2
      RETURNING *`,
    [messageId, userId]
  );

  if (!rows[0]) throw httpError(404, 'Message not found or not allowed');
  return normalizeMessage(rows[0]);
}

async function deleteConversation(userId, otherId) {
  const { rows } = await db.query(
    `INSERT INTO deleted_conversations (user_id, other_user_id, deleted_before)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id, other_user_id)
     DO UPDATE SET deleted_before = EXCLUDED.deleted_before
     RETURNING *`,
    [userId, otherId]
  );
  return rows[0];
}

module.exports = {
  buildMessagePreview,
  createMessage,
  getThreads,
  getConversationHistory,
  markConversationDelivered,
  markConversationRead,
  markMessageDelivered,
  deleteMessageForSelf,
  deleteMessageForEveryone,
  deleteConversation,
};
