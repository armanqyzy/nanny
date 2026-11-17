const { createBookingUpdate, listBookingUpdates } = require('../services/petUpdateService');
const { createNotification } = require('../services/notificationService');

function socketEventName(type) {
  if (type === 'photo') return 'pet:photo';
  if (type === 'status') return 'pet:status';
  return 'pet:update';
}

async function list(req, res) {
  try {
    const rows = await listBookingUpdates(Number(req.params.id), req.user.id);
    res.json(rows);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
}

async function create(req, res) {
  const { update_type = 'update', body, photo_url, status_label } = req.body;

  try {
    const payload = await createBookingUpdate({
      bookingId: Number(req.params.id),
      senderId: req.user.id,
      updateType: update_type,
      body,
      photo_url,
      status_label,
    });

    const io = req.app.get('io');
    if (io) {
      const eventName = socketEventName(update_type);
      io.to(`user:${payload.booking.owner_id}`).emit(eventName, payload.update);
      io.to(`user:${payload.booking.sitter_user_id}`).emit(eventName, payload.update);
    }

    // The owner gets every update in the bell and in Telegram (photos arrive as real photos there).
    const pet = payload.booking.pet_name || 'питомцу';
    const text = payload.update.body || payload.update.status_label || '';
    createNotification({
      userId: payload.booking.owner_id,
      type: 'pet_update',
      title: update_type === 'photo' ? `Новое фото: ${pet}` : `Новости о ${pet}`,
      body: text || (update_type === 'photo' ? 'Ситтер прислал фото.' : 'Ситтер прислал обновление.'),
      meta: { booking_id: payload.booking.id, photo_url: payload.update.photo_url || null },
    }, { io }).catch((err) => console.error('[pet update] notify failed:', err.message));

    res.status(201).json(payload.update);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

module.exports = { list, create };
