const db = require('../config/db');
const { notifyUser, queueBookingReminder, clearBookingReminderJobs } = require('../services/alertService');

function overlapsTime(startA, endA, startB, endB) {
  if (!startA || !endA || !startB || !endB) return true;
  return startA < endB && endA > startB;
}

async function findBookingConflicts({ sitterId, startDate, endDate, startTime, endTime, excludeBookingId = null }) {
  const params = [sitterId, startDate, endDate];
  let sql = `
    SELECT b.id, b.start_date, b.end_date, b.start_time, b.end_time, p.name AS pet_name
      FROM bookings b
      JOIN pets p ON p.id = b.pet_id
     WHERE b.sitter_id = $1
       AND b.status = 'confirmed'
       AND daterange(b.start_date, b.end_date, '[]') && daterange($2::date, $3::date, '[]')
  `;

  if (excludeBookingId) {
    params.push(excludeBookingId);
    sql += ` AND b.id <> $${params.length}`;
  }

  const { rows } = await db.query(sql, params);
  return rows.filter((row) => overlapsTime(startTime, endTime, row.start_time, row.end_time));
}

async function create(req, res) {
  const { sitter_id, pet_id, service, start_date, end_date, start_time, end_time, notes } = req.body;
  if (!sitter_id || !pet_id || !service || !start_date || !end_date) {
    return res.status(400).json({ error: 'sitter_id, pet_id, service, start_date, end_date are required' });
  }

  if (new Date(start_date) > new Date(end_date)) {
    return res.status(400).json({ error: 'start_date must be before or equal to end_date' });
  }

  if ((start_time && !end_time) || (!start_time && end_time)) {
    return res.status(400).json({ error: 'Provide both start_time and end_time, or leave both empty' });
  }

  if (start_time && end_time && start_time >= end_time) {
    return res.status(400).json({ error: 'end_time must be later than start_time' });
  }

  const { rows: petRows } = await db.query(
    'SELECT id, owner_id FROM pets WHERE id = $1',
    [pet_id]
  );
  if (!petRows[0] || petRows[0].owner_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only create bookings for your own pets' });
  }

  // price calculation: (days) * sitter.price_per_day
  const { rows: sRows } = await db.query(
    `SELECT id, price_per_day, is_available, review_status, is_verified
       FROM sitters
      WHERE id = $1`,
    [sitter_id]
  );
  if (!sRows[0]) return res.status(404).json({ error: 'Sitter not found' });
  if (!sRows[0].is_available || sRows[0].review_status !== 'approved' || !sRows[0].is_verified) {
    return res.status(400).json({ error: 'This sitter is not available for public booking' });
  }

  const conflicts = await findBookingConflicts({
    sitterId: sitter_id,
    startDate: start_date,
    endDate: end_date,
    startTime: start_time || null,
    endTime: end_time || null,
  });
  if (conflicts.length) {
    return res.status(409).json({ error: 'This sitter is not available for the selected date and time.' });
  }

  const days = Math.max(
    1,
    Math.ceil((new Date(end_date) - new Date(start_date)) / 86400000) + 1
  );
  const total = days * Number(sRows[0].price_per_day);

  const { rows } = await db.query(
    `INSERT INTO bookings
       (owner_id, sitter_id, pet_id, service, start_date, end_date, start_time, end_time, total_price, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [req.user.id, sitter_id, pet_id, service, start_date, end_date, start_time || null, end_time || null, total, notes || null]
  );

  const { rows: infoRows } = await db.query(
    `SELECT u.id AS sitter_user_id, p.name AS pet_name
       FROM sitters s
       JOIN users u ON u.id = s.user_id
       JOIN pets p ON p.id = $2
      WHERE s.id = $1`,
    [sitter_id, pet_id]
  );
  if (infoRows[0]) {
    await notifyUser({
      userId: infoRows[0].sitter_user_id,
      type: 'booking_request',
      title: 'New booking request',
      body: `${req.user.full_name || 'A pet owner'} requested ${service} for ${infoRows[0].pet_name}.`,
      meta: { booking_id: rows[0].id },
      emailSubject: 'New booking request on Nanny',
      emailText: `${req.user.full_name || 'A pet owner'} requested ${service} for ${infoRows[0].pet_name}. Open Nanny to review the request.`,
      smsText: `Nanny: new booking request for ${infoRows[0].pet_name}.`,
    }, { io: req.app.get('io') });
  }
  res.status(201).json(rows[0]);
}

async function myBookings(req, res) {
  // as owner
  const owner = await db.query(
    `SELECT b.*, p.name AS pet_name, u.full_name AS sitter_name, u.avatar_url AS sitter_avatar,
            u.id AS sitter_user_id, r.id AS review_id, (r.id IS NOT NULL) AS has_review
       FROM bookings b
       JOIN pets p      ON p.id = b.pet_id
       JOIN sitters s   ON s.id = b.sitter_id
       JOIN users u     ON u.id = s.user_id
       LEFT JOIN reviews r ON r.booking_id = b.id
      WHERE b.owner_id = $1
      ORDER BY b.start_date DESC`,
    [req.user.id]
  );

  // as sitter
  const sitter = await db.query(
    `SELECT b.*, p.name AS pet_name, u.full_name AS owner_name, u.avatar_url AS owner_avatar
       FROM bookings b
       JOIN pets p   ON p.id = b.pet_id
       JOIN sitters s ON s.id = b.sitter_id
       JOIN users u   ON u.id = b.owner_id
      WHERE s.user_id = $1
      ORDER BY b.start_date DESC`,
    [req.user.id]
  );

  res.json({ asOwner: owner.rows, asSitter: sitter.rows });
}

async function updateStatus(req, res) {
  const { status } = req.body;
  if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'invalid status' });
  }

  const { rows: bookingRows } = await db.query(
    `SELECT b.*, s.user_id AS sitter_user_id
       FROM bookings b
       JOIN sitters s ON s.id = b.sitter_id
      WHERE b.id = $1`,
    [req.params.id]
  );
  const booking = bookingRows[0];
  if (!booking) return res.status(404).json({ error: 'Booking not found or not yours' });

  const isOwner = booking.owner_id === req.user.id;
  const isSitter = booking.sitter_user_id === req.user.id;
  if (!isOwner && !isSitter) {
    return res.status(404).json({ error: 'Booking not found or not yours' });
  }

  const allowedTransitions = {
    owner: {
      pending: ['cancelled'],
      confirmed: ['cancelled'],
      completed: [],
      cancelled: [],
    },
    sitter: {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    },
  };

  const actor = isSitter ? 'sitter' : 'owner';
  const allowed = allowedTransitions[actor][booking.status] || [];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `You cannot change booking from ${booking.status} to ${status}` });
  }

  const { rows } = await db.query(
    `UPDATE bookings
        SET status = $1
      WHERE id = $2
     RETURNING *`,
    [status, req.params.id]
  );

  const { rows: detailsRows } = await db.query(
    `SELECT b.id, b.owner_id, b.status, b.service, p.name AS pet_name,
            owner.full_name AS owner_name, sitter_user.id AS sitter_user_id, sitter_user.full_name AS sitter_name
       FROM bookings b
       JOIN pets p ON p.id = b.pet_id
       JOIN users owner ON owner.id = b.owner_id
       JOIN sitters s ON s.id = b.sitter_id
       JOIN users sitter_user ON sitter_user.id = s.user_id
      WHERE b.id = $1`,
    [rows[0].id]
  );
  const details = detailsRows[0];
  const io = req.app.get('io');
  if (details && status === 'confirmed') {
    await notifyUser({
      userId: details.owner_id,
      type: 'booking_confirmed',
      title: 'Booking confirmed',
      body: `${details.sitter_name} confirmed your booking for ${details.pet_name}.`,
      meta: { booking_id: details.id },
      emailSubject: 'Your booking was confirmed',
      emailText: `${details.sitter_name} confirmed your booking for ${details.pet_name}. Open Nanny to see the full details.`,
      smsText: `Nanny: ${details.sitter_name} confirmed booking for ${details.pet_name}.`,
    }, { io });
    await clearBookingReminderJobs(details.id);
    await queueBookingReminder({
      bookingId: details.id,
      userId: details.owner_id,
      petName: details.pet_name,
      service: details.service,
      startDate: rows[0].start_date,
      startTime: rows[0].start_time,
    });
  }
  if (details && status === 'cancelled' && req.user.id === details.sitter_user_id) {
    await notifyUser({
      userId: details.owner_id,
      type: 'booking_rejected',
      title: 'Sitter declined booking',
      body: `${details.sitter_name} declined your booking request for ${details.pet_name}.`,
      meta: { booking_id: details.id },
      emailSubject: 'Your booking was declined',
      emailText: `${details.sitter_name} declined your booking request for ${details.pet_name}. You can choose another sitter in Nanny.`,
      smsText: `Nanny: ${details.sitter_name} declined booking for ${details.pet_name}.`,
    }, { io });
    await clearBookingReminderJobs(details.id);
  }
  res.json(rows[0]);
}

async function rebook(req, res) {
  const bookingId = Number(req.params.id);
  const { start_date, end_date, start_time, end_time, notes } = req.body;
  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }

  const { rows: originalRows } = await db.query(
    `SELECT *
       FROM bookings
      WHERE id = $1
        AND owner_id = $2`,
    [bookingId, req.user.id]
  );
  const original = originalRows[0];
  if (!original) return res.status(404).json({ error: 'Booking not found' });

  if (new Date(start_date) > new Date(end_date)) {
    return res.status(400).json({ error: 'start_date must be before or equal to end_date' });
  }

  const effectiveStartTime = start_time || original.start_time || null;
  const effectiveEndTime = end_time || original.end_time || null;
  if ((effectiveStartTime && !effectiveEndTime) || (!effectiveStartTime && effectiveEndTime)) {
    return res.status(400).json({ error: 'Provide both start_time and end_time, or leave both empty' });
  }
  if (effectiveStartTime && effectiveEndTime && effectiveStartTime >= effectiveEndTime) {
    return res.status(400).json({ error: 'end_time must be later than start_time' });
  }

  const conflicts = await findBookingConflicts({
    sitterId: original.sitter_id,
    startDate: start_date,
    endDate: end_date,
    startTime: start_time || original.start_time || null,
    endTime: end_time || original.end_time || null,
  });
  if (conflicts.length) {
    return res.status(409).json({ error: 'This sitter is not available for the selected date and time.' });
  }

  const { rows: sitterRows } = await db.query('SELECT price_per_day FROM sitters WHERE id = $1', [original.sitter_id]);
  const days = Math.max(1, Math.ceil((new Date(end_date) - new Date(start_date)) / 86400000) + 1);
  const total = days * Number(sitterRows[0]?.price_per_day || 0);

  const { rows } = await db.query(
    `INSERT INTO bookings
       (owner_id, sitter_id, pet_id, service, start_date, end_date, start_time, end_time, total_price, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      req.user.id,
      original.sitter_id,
      original.pet_id,
      original.service,
      start_date,
      end_date,
      start_time || original.start_time || null,
      end_time || original.end_time || null,
      total,
      notes || original.notes || null,
    ]
  );

  res.status(201).json(rows[0]);
}

module.exports = { create, myBookings, updateStatus, rebook };
