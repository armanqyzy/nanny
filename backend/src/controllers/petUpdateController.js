const { createBookingUpdate, listBookingUpdates } = require('../services/petUpdateService');

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

    res.status(201).json(payload.update);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

module.exports = { list, create };
