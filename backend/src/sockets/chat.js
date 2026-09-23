const jwt = require('jsonwebtoken');
const { createBookingUpdate, getBookingAudience } = require('../services/petUpdateService');
const {
  createMessage,
  markMessageDelivered,
} = require('../services/messageService');
const { createNotification } = require('../services/notificationService');
const db = require('../config/db');

function emitPresence(io, userId, online) {
  io.emit('presence:update', { user_id: userId, online });
}

function isUserOnline(io, userId) {
  const room = io.sockets.adapter.rooms.get(`user:${userId}`);
  return Boolean(room && room.size > 0);
}

function registerChat(io) {
  // Socket-level authentication via JWT passed in handshake.auth.token
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const uid = socket.user.id;
    socket.join(`user:${uid}`);
    emitPresence(io, uid, true);

    socket.on('booking:join', async ({ booking_id }, ack) => {
      try {
        if (!booking_id) throw new Error('booking_id required');
        const audience = await getBookingAudience(booking_id);
        if (!audience) throw new Error('Booking not found');
        if (![audience.owner_id, audience.sitter_user_id].includes(uid)) {
          throw new Error('Not allowed to join this booking');
        }
        socket.join(`booking:${booking_id}`);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    // client-initiated send (alternative to REST POST /api/messages)
    socket.on('message:send', async ({ receiver_id, body, audio_url, image_url, file_url }, ack) => {
      try {
        const message = await createMessage({
          senderId: uid,
          receiverId: receiver_id,
          body,
          audio_url,
          image_url,
          file_url,
        });
        io.to(`user:${receiver_id}`).emit('message:new', message);
        io.to(`user:${uid}`).emit('message:new', message);
        const { rows: senderRows } = await db.query('SELECT full_name FROM users WHERE id = $1', [uid]);
        await createNotification({
          userId: receiver_id,
          type: 'new_message',
          title: 'New message',
          body: `New message from ${senderRows[0]?.full_name || 'Nanny user'}.`,
          meta: { message_id: message.id, sender_id: uid },
        }, { io });
        ack?.({ ok: true, message });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('message:typing', ({ receiver_id, is_typing = true }) => {
      if (!receiver_id) return;
      io.to(`user:${receiver_id}`).emit('message:typing', { from: uid, is_typing });
    });

    socket.on('typing', ({ receiver_id }) => {
      if (!receiver_id) return;
      io.to(`user:${receiver_id}`).emit('message:typing', { from: uid, is_typing: true });
    });

    socket.on('message:delivered', async ({ message_id }, ack) => {
      try {
        const delivered = await markMessageDelivered(message_id, uid);
        if (delivered) {
          io.to(`user:${delivered.sender_id}`).emit('message:delivered', {
            message_id: delivered.id,
            sender_id: delivered.sender_id,
            receiver_id: delivered.receiver_id,
          });
          io.to(`user:${delivered.receiver_id}`).emit('message:delivered', {
            message_id: delivered.id,
            sender_id: delivered.sender_id,
            receiver_id: delivered.receiver_id,
          });
        }
        ack?.({ ok: true, delivered: Boolean(delivered) });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('presence:check', ({ user_id }, ack) => {
      ack?.({ user_id, online: isUserOnline(io, user_id) });
    });

    async function handlePetEvent(payload, ack, expectedType) {
      try {
        const { booking_id, body, photo_url, status_label } = payload || {};
        if (!booking_id) throw new Error('booking_id required');
        const update = await createBookingUpdate({
          bookingId: booking_id,
          senderId: uid,
          updateType: expectedType,
          body,
          photo_url,
          status_label,
        });

        io.to(`booking:${booking_id}`).emit(`pet:${expectedType}`, update);
        io.to(`user:${update.owner_id}`).emit(`pet:${expectedType}`, update);
        io.to(`user:${update.sitter_user_id}`).emit(`pet:${expectedType}`, update);
        ack?.({ ok: true, update });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    }

    socket.on('pet:update', (payload, ack) => handlePetEvent(payload, ack, 'update'));
    socket.on('pet:photo', (payload, ack) => handlePetEvent(payload, ack, 'photo'));
    socket.on('pet:status', (payload, ack) => handlePetEvent(payload, ack, 'status'));

    socket.on('disconnect', () => {
      setTimeout(() => {
        emitPresence(io, uid, isUserOnline(io, uid));
      }, 0);
    });
  });
}

module.exports = registerChat;
