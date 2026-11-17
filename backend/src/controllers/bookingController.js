const db = require('../config/db');
const { notifyUser, queueBookingReminder, clearBookingReminderJobs } = require('../services/alertService');
const { chargeCard } = require('../services/paymentService');
const { findDaysOffInRange } = require('./sitterController');
const { OWNER_REASONS, SITTER_REASONS, refundFor, paymentStatusAfterRefund } = require('../services/cancellationPolicy');
const { serviceRu, cancelReasonRu, money } = require('../utils/ruText');

function overlapsTime(startA, endA, startB, endB) {
  if (!startA || !endA || !startB || !endB) return true;
  return startA < endB && endA > startB;
}

const APP_TIME_ZONE = 'Asia/Almaty';

function todayInAppTimeZone() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function nowTimeInAppTimeZone() {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date());
}

function toDateString(value) {
  if (!value) return '';
  if (value instanceof Date) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: APP_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(value);
  }
  return String(value).slice(0, 10);
}

// Returns an error message if the booking starts in the past, otherwise null.
function pastDateError(startDate, startTime) {
  const today = todayInAppTimeZone();
  if (toDateString(startDate) < today) return 'You cannot book a date in the past.';
  if (toDateString(startDate) === today && startTime && String(startTime).slice(0, 5) <= nowTimeInAppTimeZone()) {
    return 'This start time has already passed today. Choose a later time.';
  }
  return null;
}

// Price per day for the chosen service; falls back to the sitter's general daily price.
async function getDailyPrice(sitterId, service, fallbackPrice) {
  const { rows } = await db.query(
    'SELECT price FROM sitter_services WHERE sitter_id = $1 AND service = $2 LIMIT 1',
    [sitterId, service]
  );
  const price = rows[0]?.price ?? fallbackPrice;
  return Number(price || 0);
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

// Checks one booking (one pet, one date range). Returns { error, status } or { total }.
async function checkBookingItem(req, item, sitterRow) {
  const { sitter_id, pet_id, service, start_date, end_date, start_time, end_time } = item;

  if (new Date(start_date) > new Date(end_date)) {
    return { status: 400, error: 'start_date must be before or equal to end_date' };
  }
  if ((start_time && !end_time) || (!start_time && end_time)) {
    return { status: 400, error: 'Provide both start_time and end_time, or leave both empty' };
  }
  if (start_time && end_time && start_time >= end_time) {
    return { status: 400, error: 'end_time must be later than start_time' };
  }
  const pastError = pastDateError(start_date, start_time);
  if (pastError) return { status: 400, error: pastError };

  const { rows: petRows } = await db.query('SELECT id, owner_id, is_archived, name FROM pets WHERE id = $1', [pet_id]);
  if (!petRows[0] || petRows[0].owner_id !== req.user.id || petRows[0].is_archived) {
    return { status: 403, error: 'You can only create bookings for your own pets' };
  }

  // Same pet, same sitter, same dates and time already requested: do not create a duplicate.
  const { rows: duplicateRows } = await db.query(
    `SELECT id FROM bookings
      WHERE owner_id = $1 AND sitter_id = $2 AND pet_id = $3
        AND start_date = $4::date AND end_date = $5::date
        AND start_time IS NOT DISTINCT FROM $6::time
        AND end_time IS NOT DISTINCT FROM $7::time
        AND status IN ('pending', 'confirmed')
      LIMIT 1`,
    [req.user.id, sitter_id, pet_id, start_date, end_date, start_time || null, end_time || null]
  );
  if (duplicateRows[0]) {
    return { status: 409, error: `You already have this booking request for ${petRows[0].name} on ${start_date}. Check your bookings page.` };
  }

  const conflicts = await findBookingConflicts({
    sitterId: sitter_id, startDate: start_date, endDate: end_date,
    startTime: start_time || null, endTime: end_time || null,
  });
  if (conflicts.length) {
    return { status: 409, error: `This sitter is not available on ${start_date} at the selected time.` };
  }

  const daysOff = await findDaysOffInRange(sitter_id, start_date, end_date);
  if (daysOff.length) {
    return { status: 409, error: `The sitter does not work on: ${daysOff.join(', ')}. Choose other dates.` };
  }

  const days = Math.max(1, Math.ceil((new Date(end_date) - new Date(start_date)) / 86400000) + 1);
  const total = days * await getDailyPrice(sitter_id, service, sitterRow.price_per_day);
  return { total, petName: petRows[0].name };
}

// Dates for a weekly schedule: every chosen weekday (0 = Sunday) for N weeks from start_date.
function expandWeeklySchedule(startDate, weekdays, weeks) {
  const dates = [];
  const start = new Date(`${startDate}T00:00:00Z`);
  for (let offset = 0; offset < weeks * 7; offset += 1) {
    const day = new Date(start.getTime() + offset * 86400000);
    if (weekdays.includes(day.getUTCDay())) dates.push(day.toISOString().slice(0, 10));
  }
  return dates;
}

async function create(req, res) {
  const { sitter_id, pet_id, pet_ids, service, start_date, end_date, start_time, end_time, notes, repeat } = req.body;
  if (!sitter_id || !pet_id || !service || !start_date || !end_date) {
    return res.status(400).json({ error: 'sitter_id, pet_id, service, start_date, end_date are required' });
  }

  const { rows: sRows } = await db.query(
    'SELECT id, price_per_day, is_available, review_status, is_verified FROM sitters WHERE id = $1',
    [sitter_id]
  );
  if (!sRows[0]) return res.status(404).json({ error: 'Sitter not found' });
  if (!sRows[0].is_available || sRows[0].review_status !== 'approved' || !sRows[0].is_verified) {
    return res.status(400).json({ error: 'This sitter is not available for public booking' });
  }

  // Several pets and/or a weekly schedule become several bookings that share one group id.
  const pets = [...new Set([pet_id, ...(Array.isArray(pet_ids) ? pet_ids : [])].map(Number))];
  let ranges = [{ start_date, end_date }];
  if (repeat?.weekdays?.length && repeat?.weeks) {
    const dates = expandWeeklySchedule(start_date, repeat.weekdays, repeat.weeks);
    if (!dates.length) return res.status(400).json({ error: 'The chosen weekdays do not fall into the schedule.' });
    ranges = dates.map((day) => ({ start_date: day, end_date: day }));
  }
  const items = [];
  pets.forEach((pid) => ranges.forEach((range) => items.push({
    sitter_id, pet_id: pid, service, start_time, end_time, ...range,
  })));
  if (items.length > 40) return res.status(400).json({ error: 'Too many bookings at once (max 40). Shorten the schedule.' });

  // Check everything first, so either all bookings are created or none.
  const checked = [];
  for (const item of items) {
    const result = await checkBookingItem(req, item, sRows[0]);
    if (result.error) return res.status(result.status).json({ error: result.error });
    checked.push({ item, total: result.total, petName: result.petName });
  }

  const groupId = checked.length > 1 ? `g${Date.now()}${Math.floor(Math.random() * 1000)}` : null;
  const created = [];
  for (const { item, total } of checked) {
    const { rows } = await db.query(
      `INSERT INTO bookings
         (owner_id, sitter_id, pet_id, service, start_date, end_date, start_time, end_time, total_price, notes, group_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [req.user.id, sitter_id, item.pet_id, service, item.start_date, item.end_date,
        start_time || null, end_time || null, total, notes || null, groupId]
    );
    created.push(rows[0]);
  }

  const { rows: infoRows } = await db.query(
    'SELECT u.id AS sitter_user_id FROM sitters s JOIN users u ON u.id = s.user_id WHERE s.id = $1',
    [sitter_id]
  );
  // The login token holds only id and role, so look the owner's name up for the message.
  const { rows: ownerRows } = await db.query('SELECT full_name FROM users WHERE id = $1', [req.user.id]);
  const ownerName = ownerRows[0]?.full_name || 'Владелец';
  if (infoRows[0]) {
    const petNames = [...new Set(checked.map((c) => c.petName))].join(', ');
    const what = created.length > 1 ? `${serviceRu(service)} (${created.length} дн.)` : serviceRu(service);
    await notifyUser({
      userId: infoRows[0].sitter_user_id,
      type: 'booking_request',
      title: 'Новая заявка',
      body: `${ownerName} просит: ${what} для ${petNames}. Подтвердите или отклоните заявку.`,
      meta: { booking_id: created[0].id, group_id: groupId },
      emailSubject: 'Новая заявка в Nanny',
      emailText: `${ownerName} просит: ${what} для ${petNames}. Откройте Nanny, чтобы ответить на заявку.`,
      smsText: `Nanny: новая заявка для ${petNames}.`,
    }, { io: req.app.get('io') });
  }

  // A single booking keeps the old response shape; several bookings return a list.
  if (created.length === 1) return res.status(201).json(created[0]);
  return res.status(201).json({ group_id: groupId, bookings: created });
}

// Requests nobody confirmed before their last day can never happen any more.
async function expireStalePendingBookings() {
  await db.query(
    `UPDATE bookings
        SET status = 'cancelled', cancelled_by = 'system', cancel_reason = 'expired', cancelled_at = NOW()
      WHERE status = 'pending'
        AND end_date < $1::date`,
    [todayInAppTimeZone()]
  );
}

// Reminds a sitter once about a request that starts today or tomorrow and is still unanswered.
// Without it, a missed request silently expires and the owner is left without care.
async function remindPendingRequests(io) {
  const today = todayInAppTimeZone();
  const { rows } = await db.query(
    `UPDATE bookings b
        SET pending_reminder_sent_at = NOW()
       FROM sitters s, pets p, users owner
      WHERE b.sitter_id = s.id AND p.id = b.pet_id AND owner.id = b.owner_id
        AND b.status = 'pending'
        AND b.pending_reminder_sent_at IS NULL
        AND b.start_date BETWEEN $1::date AND ($1::date + 1)
     RETURNING b.id, b.start_date, b.start_time, b.service, s.user_id AS sitter_user_id,
               p.name AS pet_name, owner.full_name AS owner_name`,
    [today]
  );
  for (const booking of rows) {
    const when = toDateString(booking.start_date) === today ? 'сегодня' : 'завтра';
    await notifyUser({
      userId: booking.sitter_user_id,
      type: 'booking_pending_reminder',
      title: 'Заявка ждёт ответа',
      body: `${booking.owner_name} ждёт ответа: ${serviceRu(booking.service)} для ${booking.pet_name} ${when}${booking.start_time ? ` в ${String(booking.start_time).slice(0, 5)}` : ''}. Подтвердите или отклоните заявку, иначе она отменится.`,
      meta: { booking_id: booking.id },
      emailSubject: 'Заявка ждёт вашего ответа',
      emailText: `${booking.owner_name} ждёт ответа: ${serviceRu(booking.service)} для ${booking.pet_name} ${when}. Откройте Nanny и подтвердите или отклоните заявку.`,
    }, { io }).catch((err) => console.error('[reminder] failed:', err.message));
  }
  return rows.length;
}

async function myBookings(req, res) {
  await expireStalePendingBookings();
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

  if (status === 'confirmed') {
    if (toDateString(booking.end_date) < todayInAppTimeZone()) {
      return res.status(400).json({ error: 'This booking is already in the past and cannot be confirmed.' });
    }
    const conflicts = await findBookingConflicts({
      sitterId: booking.sitter_id,
      startDate: toDateString(booking.start_date),
      endDate: toDateString(booking.end_date),
      startTime: booking.start_time || null,
      endTime: booking.end_time || null,
      excludeBookingId: booking.id,
    });
    if (conflicts.length) {
      return res.status(409).json({ error: 'You already have a confirmed booking at this time. Cancel or finish it first.' });
    }
  }

  if (status === 'completed' && toDateString(booking.start_date) > todayInAppTimeZone()) {
    return res.status(400).json({ error: 'A booking cannot be completed before it starts.' });
  }

  let rows;
  if (status === 'cancelled') {
    const reasons = actor === 'sitter' ? SITTER_REASONS : OWNER_REASONS;
    const reason = req.body.reason;
    const comment = (req.body.comment || '').trim();
    if (!reason || !reasons.includes(reason)) {
      return res.status(400).json({ error: 'Please choose a cancellation reason.' });
    }
    if (reason === 'other' && comment.length < 3) {
      return res.status(400).json({ error: 'Please describe the reason in a few words.' });
    }
    const refund = refundFor({
      actor,
      paymentStatus: booking.payment_status,
      totalPrice: booking.total_price,
      startDate: toDateString(booking.start_date),
      today: todayInAppTimeZone(),
    });
    ({ rows } = await db.query(
      `UPDATE bookings
          SET status = 'cancelled',
              cancelled_by = $2,
              cancel_reason = $3,
              cancel_comment = NULLIF($4, ''),
              cancelled_at = NOW(),
              refund_percent = $5,
              refund_amount = $6,
              payment_status = $7
        WHERE id = $1
       RETURNING *`,
      [
        req.params.id,
        actor,
        reason,
        comment,
        refund.paid ? refund.percent : null,
        refund.paid ? refund.amount : null,
        refund.paid ? paymentStatusAfterRefund(refund.percent) : booking.payment_status,
      ]
    ));
  } else {
    ({ rows } = await db.query(
      `UPDATE bookings SET status = $1::varchar WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    ));
  }

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
      title: 'Бронирование подтверждено',
      body: `${details.sitter_name} подтвердил(а) бронирование для ${details.pet_name}. Теперь его можно оплатить.`,
      meta: { booking_id: details.id },
      emailSubject: 'Бронирование подтверждено',
      emailText: `${details.sitter_name} подтвердил(а) бронирование для ${details.pet_name}. Подробности в Nanny.`,
      smsText: `Nanny: ${details.sitter_name} подтвердил(а) бронь для ${details.pet_name}.`,
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
  if (details && status === 'completed') {
    await notifyUser({
      userId: details.owner_id,
      type: 'booking_completed',
      title: 'Уход завершён',
      body: `${details.sitter_name} завершил(а) уход за ${details.pet_name}. Оцените ситтера или забронируйте снова.`,
      meta: { booking_id: details.id, action: 'completed' },
      emailSubject: 'Уход завершён',
      emailText: `${details.sitter_name} завершил(а) уход за ${details.pet_name}. В Nanny можно оставить отзыв или забронировать снова.`,
    }, { io });
  }
  if (details && status === 'cancelled') {
    const updated = rows[0];
    const reasonText = updated.cancel_comment ? `${cancelReasonRu(updated.cancel_reason)} («${updated.cancel_comment}»)` : cancelReasonRu(updated.cancel_reason);
    const refundText = updated.refund_percent != null
      ? ` Возврат: ${updated.refund_percent}% (${money(updated.refund_amount)}).`
      : '';
    if (actor === 'sitter') {
      await notifyUser({
        userId: details.owner_id,
        type: 'booking_rejected',
        title: 'Ситтер отменил бронирование',
        body: `${details.sitter_name} отменил(а) бронирование для ${details.pet_name}. Причина: ${reasonText}.${refundText}`,
        meta: { booking_id: details.id },
        emailSubject: 'Ситтер отменил бронирование',
        emailText: `${details.sitter_name} отменил(а) бронирование для ${details.pet_name}. Причина: ${reasonText}.${refundText} В Nanny можно выбрать другого ситтера.`,
        smsText: `Nanny: ${details.sitter_name} отменил(а) бронь для ${details.pet_name}.`,
      }, { io });
    } else {
      await notifyUser({
        userId: details.sitter_user_id,
        type: 'booking_cancelled',
        title: 'Владелец отменил бронирование',
        body: `${details.owner_name} отменил(а) бронирование для ${details.pet_name}. Причина: ${reasonText}.`,
        meta: { booking_id: details.id },
        emailSubject: 'Бронирование отменено',
        emailText: `${details.owner_name} отменил(а) бронирование для ${details.pet_name}. Причина: ${reasonText}.`,
        smsText: `Nanny: ${details.owner_name} отменил(а) бронь для ${details.pet_name}.`,
      }, { io });
    }
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

  const rebookPastError = pastDateError(start_date, effectiveStartTime);
  if (rebookPastError) return res.status(400).json({ error: rebookPastError });

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

  const rebookDaysOff = await findDaysOffInRange(original.sitter_id, start_date, end_date);
  if (rebookDaysOff.length) {
    return res.status(409).json({ error: `The sitter does not work on: ${rebookDaysOff.join(', ')}. Choose other dates.` });
  }

  const { rows: sitterRows } = await db.query('SELECT price_per_day FROM sitters WHERE id = $1', [original.sitter_id]);
  const days = Math.max(1, Math.ceil((new Date(end_date) - new Date(start_date)) / 86400000) + 1);
  const total = days * await getDailyPrice(original.sitter_id, original.service, sitterRows[0]?.price_per_day);

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

// POST /api/bookings/:id/pay — owner pays a confirmed booking (demo provider, no real charge).
async function pay(req, res) {
  const bookingId = Number(req.params.id);
  const { rows } = await db.query(
    `SELECT b.*, s.user_id AS sitter_user_id, p.name AS pet_name
       FROM bookings b
       JOIN sitters s ON s.id = b.sitter_id
       JOIN pets p ON p.id = b.pet_id
      WHERE b.id = $1 AND b.owner_id = $2`,
    [bookingId, req.user.id]
  );
  const booking = rows[0];
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.payment_status === 'paid') return res.status(409).json({ error: 'This booking is already paid.' });
  if (booking.status !== 'confirmed') {
    return res.status(400).json({ error: 'You can pay only after the sitter confirms the booking.' });
  }

  let payment;
  try {
    payment = await chargeCard({
      amount: Number(booking.total_price),
      orderReference: `booking_${booking.id}`,
      paymentCard: req.body?.payment || {},
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const { rows: updated } = await db.query(
    `UPDATE bookings
        SET payment_status = 'paid', payment_reference = $1, payment_last4 = $2, paid_at = NOW()
      WHERE id = $3 AND payment_status <> 'paid'
      RETURNING *`,
    [payment.payment_reference, payment.payment_last4, booking.id]
  );
  if (!updated[0]) return res.status(409).json({ error: 'This booking is already paid.' });

  await notifyUser({
    userId: booking.sitter_user_id,
    type: 'booking_paid',
    title: 'Бронирование оплачено',
    body: `Владелец оплатил бронирование для ${booking.pet_name} (${money(booking.total_price)}).`,
    meta: { booking_id: booking.id },
  }, { io: req.app.get('io') }).catch(() => {});

  res.json(updated[0]);
}

// The owner moves a pending or confirmed booking to other dates before it starts.
// A confirmed booking goes back to "pending" so the sitter agrees to the new time.
// A paid booking keeps the same number of days, so the price (and the payment) stay the same.
async function reschedule(req, res) {
  const { start_date, end_date, start_time = null, end_time = null } = req.body;
  const { rows } = await db.query(
    `SELECT b.*, s.user_id AS sitter_user_id, s.price_per_day, p.name AS pet_name, u.full_name AS owner_name
       FROM bookings b
       JOIN sitters s ON s.id = b.sitter_id
       JOIN pets p ON p.id = b.pet_id
       JOIN users u ON u.id = b.owner_id
      WHERE b.id = $1 AND b.owner_id = $2`,
    [req.params.id, req.user.id]
  );
  const booking = rows[0];
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (!['pending', 'confirmed'].includes(booking.status)) {
    return res.status(400).json({ error: 'Перенести можно только ожидающее или подтверждённое бронирование.' });
  }
  if (pastDateError(booking.start_date, booking.start_time)) {
    return res.status(400).json({ error: 'Бронирование уже началось, перенести его нельзя.' });
  }
  if (start_date > end_date) return res.status(400).json({ error: 'Дата окончания не может быть раньше даты начала.' });
  if ((start_time && !end_time) || (!start_time && end_time)) {
    return res.status(400).json({ error: 'Укажите и время начала, и время окончания, или оставьте оба пустыми.' });
  }
  if (start_time && end_time && start_time >= end_time) {
    return res.status(400).json({ error: 'Время окончания должно быть позже времени начала.' });
  }
  const pastError = pastDateError(start_date, start_time);
  if (pastError) return res.status(400).json({ error: 'Новая дата уже прошла. Выберите дату в будущем.' });

  const dayCount = (from, to) => Math.round((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000) + 1;
  const oldDays = dayCount(toDateString(booking.start_date), toDateString(booking.end_date));
  const newDays = dayCount(start_date, end_date);
  const paid = booking.payment_status === 'paid';
  if (paid && newDays !== oldDays) {
    return res.status(400).json({ error: `Бронирование уже оплачено, поэтому новые даты должны занимать столько же дней (${oldDays}).` });
  }
  const sameSlot = start_date === toDateString(booking.start_date) && end_date === toDateString(booking.end_date)
    && String(start_time || '') === String(booking.start_time || '').slice(0, 5) && String(end_time || '') === String(booking.end_time || '').slice(0, 5);
  if (sameSlot) return res.status(400).json({ error: 'Выберите даты или время, отличные от текущих.' });

  const conflicts = await findBookingConflicts({
    sitterId: booking.sitter_id, startDate: start_date, endDate: end_date,
    startTime: start_time, endTime: end_time, excludeBookingId: booking.id,
  });
  if (conflicts.length) return res.status(409).json({ error: 'Ситтер занят в это время. Выберите другие даты или время.' });
  const daysOff = await findDaysOffInRange(booking.sitter_id, start_date, end_date);
  if (daysOff.length) return res.status(409).json({ error: `У ситтера выходной: ${daysOff.join(', ')}. Выберите другие даты.` });

  const total = paid ? Number(booking.total_price) : newDays * await getDailyPrice(booking.sitter_id, booking.service, booking.price_per_day);
  const { rows: updated } = await db.query(
    `UPDATE bookings
        SET rescheduled_from_start = start_date, rescheduled_from_end = end_date,
            start_date = $2, end_date = $3, start_time = $4, end_time = $5, total_price = $6,
            status = 'pending', rescheduled_at = NOW(), reschedule_count = reschedule_count + 1,
            pending_reminder_sent_at = NULL
      WHERE id = $1
     RETURNING *`,
    [booking.id, start_date, end_date, start_time, end_time, total]
  );
  await clearBookingReminderJobs(booking.id);

  const fmt = (d) => d.split('-').reverse().join('.');
  await notifyUser({
    userId: booking.sitter_user_id,
    type: 'booking_rescheduled',
    title: 'Просьба перенести бронирование',
    body: `${booking.owner_name} просит перенести ${serviceRu(booking.service)} для ${booking.pet_name}: `
      + `с ${fmt(toDateString(booking.start_date))} на ${fmt(start_date)}${start_time ? ` в ${start_time}` : ''}. Подтвердите новую дату или отклоните.`,
    meta: { booking_id: booking.id },
    emailSubject: 'Просьба перенести бронирование',
    emailText: `${booking.owner_name} просит перенести бронирование для ${booking.pet_name} на ${fmt(start_date)}. Откройте Nanny, чтобы ответить.`,
  }, { io: req.app.get('io') });

  res.json(updated[0]);
}

// Shows what a cancellation would mean before the user confirms it.
async function cancelPreview(req, res) {
  const { rows } = await db.query(
    `SELECT b.*, s.user_id AS sitter_user_id
       FROM bookings b
       JOIN sitters s ON s.id = b.sitter_id
      WHERE b.id = $1`,
    [req.params.id]
  );
  const booking = rows[0];
  if (!booking || (booking.owner_id !== req.user.id && booking.sitter_user_id !== req.user.id)) {
    return res.status(404).json({ error: 'Booking not found or not yours' });
  }
  const actor = booking.sitter_user_id === req.user.id ? 'sitter' : 'owner';
  const refund = refundFor({
    actor,
    paymentStatus: booking.payment_status,
    totalPrice: booking.total_price,
    startDate: toDateString(booking.start_date),
    today: todayInAppTimeZone(),
  });
  res.json({
    actor,
    reasons: actor === 'sitter' ? SITTER_REASONS : OWNER_REASONS,
    paid: refund.paid,
    refund_percent: refund.percent,
    refund_amount: refund.amount,
    total_price: Number(booking.total_price),
    days_before: refund.daysBefore,
  });
}

module.exports = { create, myBookings, updateStatus, rebook, expireStalePendingBookings, pay, cancelPreview, remindPendingRequests, reschedule, todayInAppTimeZone, toDateString };
