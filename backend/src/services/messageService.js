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

async function createMessage({ senderId, receiverId, body, audio_url, image_url, file_url }) {
  const hasContent = [body, audio_url, image_url, file_url].some((value) => String(value || '').trim());
  if (!receiverId || !hasContent) {
    throw new Error('receiver_id and at least one message content field are required');
  }

  const { rows } = await db.query(
    `INSERT INTO messages (sender_id, receiver_id, body, audio_url, image_url, file_url)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [senderId, receiverId, body || null, audio_url || null, image_url || null, file_url || null]
  );

  return normalizeMessage(rows[0]);
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
    `SELECT m.*
       FROM messages m
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
  if (!rows[0]) throw new Error('Message not found');

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

  if (!rows[0]) throw new Error('Message not found or not allowed');
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
