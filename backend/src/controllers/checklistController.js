const db = require('../config/db');
const { createNotification } = require('../services/notificationService');

// Care checklist inside a booking.
// Owner: adds and removes items while the booking is pending or confirmed.
// Sitter: ticks items off while the booking is confirmed.
// Both see the list and get live updates over the socket.

const MAX_ITEMS = 30;
const EDITABLE_STATUSES = ['pending', 'confirmed'];

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function loadBooking(bookingId, userId) {
  if (!Number.isInteger(bookingId) || bookingId <= 0) throw new HttpError(404, 'Booking not found');
  const { rows } = await db.query(
    `SELECT b.id, b.owner_id, b.status, s.user_id AS sitter_user_id, p.name AS pet_name
       FROM bookings b
       JOIN sitters s ON s.id = b.sitter_id
       JOIN pets p ON p.id = b.pet_id
      WHERE b.id = $1`,
    [bookingId]
  );
  const booking = rows[0];
  if (!booking || ![booking.owner_id, booking.sitter_user_id].includes(userId)) {
    throw new HttpError(404, 'Booking not found');
  }
  return booking;
}

async function listItems(bookingId) {
  const { rows } = await db.query(
    `SELECT id, booking_id, title, to_char(due_time, 'HH24:MI') AS due_time,
            is_done, done_at, done_by, created_at
       FROM booking_checklist_items
      WHERE booking_id = $1
      ORDER BY due_time NULLS LAST, id`,
    [bookingId]
  );
  return rows;
}

function broadcast(req, booking, items) {
  const io = req.app.get('io');
  if (!io) return;
  const payload = { booking_id: booking.id, items };
  io.to(`user:${booking.owner_id}`).emit('checklist:update', payload);
  io.to(`user:${booking.sitter_user_id}`).emit('checklist:update', payload);
}

function sendError(res, err) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  throw err;
}

function parseItemId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid item id');
  return id;
}

async function list(req, res) {
  try {
    const booking = await loadBooking(Number(req.params.id), req.user.id);
    res.json(await listItems(booking.id));
  } catch (err) {
    sendError(res, err);
  }
}

async function add(req, res) {
  try {
    const booking = await loadBooking(Number(req.params.id), req.user.id);
    if (booking.owner_id !== req.user.id) throw new HttpError(403, 'Only the owner can add checklist items');
    if (!EDITABLE_STATUSES.includes(booking.status)) {
      throw new HttpError(400, 'Checklist can be changed only before the booking is completed');
    }

    const title = String(req.body?.title || '').trim();
    if (!title) throw new HttpError(400, 'Write what the sitter should do');
    if (title.length > 160) throw new HttpError(400, 'Checklist item is too long (max 160 characters)');

    let dueTime = req.body?.due_time ? String(req.body.due_time).slice(0, 5) : null;
    if (dueTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(dueTime)) throw new HttpError(400, 'Invalid time');
    if (!dueTime) dueTime = null;

    const { rows: countRows } = await db.query(
      'SELECT COUNT(*)::int AS n FROM booking_checklist_items WHERE booking_id = $1',
      [booking.id]
    );
    if (countRows[0].n >= MAX_ITEMS) throw new HttpError(400, `Up to ${MAX_ITEMS} items per booking`);

    await db.query(
      `INSERT INTO booking_checklist_items (booking_id, title, due_time, created_by)
       VALUES ($1, $2, $3, $4)`,
      [booking.id, title, dueTime, req.user.id]
    );

    const items = await listItems(booking.id);
    broadcast(req, booking, items);

    if (booking.status === 'confirmed') {
      createNotification({
        userId: booking.sitter_user_id,
        type: 'checklist',
        title: `Новый пункт в чек-листе: ${booking.pet_name}`,
        body: dueTime ? `${dueTime} · ${title}` : title,
        meta: { booking_id: booking.id },
      }, { io: req.app.get('io') }).catch((err) => console.error('[checklist] notify failed:', err.message));
    }

    res.status(201).json(items);
  } catch (err) {
    sendError(res, err);
  }
}

async function toggle(req, res) {
  try {
    const booking = await loadBooking(Number(req.params.id), req.user.id);
    if (booking.sitter_user_id !== req.user.id) throw new HttpError(403, 'Only the sitter can tick checklist items');
    if (booking.status !== 'confirmed') throw new HttpError(400, 'Checklist can be ticked only for a confirmed booking');

    const itemId = parseItemId(req.params.itemId);
    const isDone = Boolean(req.body?.is_done);

    const { rows } = await db.query(
      `UPDATE booking_checklist_items
          SET is_done = $1,
              done_at = CASE WHEN $1 THEN NOW() ELSE NULL END,
              done_by = CASE WHEN $1 THEN $2::int ELSE NULL END
        WHERE id = $3 AND booking_id = $4
        RETURNING id, title, is_done`,
      [isDone, req.user.id, itemId, booking.id]
    );
    if (!rows[0]) throw new HttpError(404, 'Checklist item not found');

    const items = await listItems(booking.id);
    broadcast(req, booking, items);

    if (isDone) {
      const doneCount = items.filter((item) => item.is_done).length;
      createNotification({
        userId: booking.owner_id,
        type: 'checklist',
        title: `Выполнено: ${rows[0].title}`,
        body: `${booking.pet_name}: ${doneCount} из ${items.length} пунктов чек-листа готово.`,
        meta: { booking_id: booking.id },
      }, { io: req.app.get('io') }).catch((err) => console.error('[checklist] notify failed:', err.message));
    }

    res.json(items);
  } catch (err) {
    sendError(res, err);
  }
}

async function remove(req, res) {
  try {
    const booking = await loadBooking(Number(req.params.id), req.user.id);
    if (booking.owner_id !== req.user.id) throw new HttpError(403, 'Only the owner can remove checklist items');
    if (!EDITABLE_STATUSES.includes(booking.status)) {
      throw new HttpError(400, 'Checklist can be changed only before the booking is completed');
    }

    const itemId = parseItemId(req.params.itemId);
    const { rowCount } = await db.query(
      'DELETE FROM booking_checklist_items WHERE id = $1 AND booking_id = $2',
      [itemId, booking.id]
    );
    if (!rowCount) throw new HttpError(404, 'Checklist item not found');

    const items = await listItems(booking.id);
    broadcast(req, booking, items);
    res.json(items);
  } catch (err) {
    sendError(res, err);
  }
}

module.exports = { list, add, toggle, remove };
