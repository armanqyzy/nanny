const db = require('../config/db');

async function getBookingAudience(bookingId) {
  const { rows } = await db.query(
    `SELECT b.id, b.owner_id, s.user_id AS sitter_user_id, p.name AS pet_name
       FROM bookings b
       JOIN sitters s ON s.id = b.sitter_id
       JOIN pets p ON p.id = b.pet_id
      WHERE b.id = $1`,
    [bookingId]
  );
  return rows[0] || null;
}

async function createBookingUpdate({ bookingId, senderId, updateType, body, photo_url, status_label }) {
  const booking = await getBookingAudience(bookingId);
  if (!booking) throw new Error('Booking not found');
  if (booking.sitter_user_id !== senderId) throw new Error('Only the sitter can send pet updates');

  const { rows } = await db.query(
    `INSERT INTO booking_updates (booking_id, sender_id, update_type, body, photo_url, status_label)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [bookingId, senderId, updateType, body || null, photo_url || null, status_label || null]
  );

  return {
    update: {
      ...rows[0],
      pet_name: booking.pet_name,
    },
    booking,
  };
}

async function listBookingUpdates(bookingId, userId) {
  const booking = await getBookingAudience(bookingId);
  if (!booking) throw new Error('Booking not found');
  if (![booking.owner_id, booking.sitter_user_id].includes(userId)) throw new Error('Booking not found');

  const { rows } = await db.query(
    `SELECT bu.*, u.full_name AS sender_name
       FROM booking_updates bu
       JOIN users u ON u.id = bu.sender_id
      WHERE bu.booking_id = $1
      ORDER BY bu.created_at ASC`,
    [bookingId]
  );
  return rows;
}

module.exports = {
  createBookingUpdate,
  listBookingUpdates,
};
