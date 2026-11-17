const db = require('../config/db');
const { recalculateSitterFraudScore } = require('../utils/fraud');
const { createNotification } = require('../services/notificationService');

// POST /api/reviews  { booking_id, rating, body }
async function create(req, res) {
  const { booking_id, rating, body } = req.body;
  if (!booking_id || !rating || !body) {
    return res.status(400).json({ error: 'booking_id, rating and body are required' });
  }
  if (body.length < 30) return res.status(400).json({ error: 'review must be at least 30 characters' });
  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'rating must be 1..5' });

  // Ensure the booking belongs to the author and is completed
  const { rows: bk } = await db.query(
    'SELECT id, sitter_id, status, end_date FROM bookings WHERE id=$1 AND owner_id=$2',
    [booking_id, req.user.id]
  );
  if (!bk[0]) return res.status(404).json({ error: 'Booking not found' });
  if (bk[0].status !== 'completed') {
    return res.status(400).json({ error: 'Review allowed only after booking is completed' });
  }
  // A sitter could mark care "completed" early; the owner judges it only once the care period is over.
  const { todayInAppTimeZone, toDateString } = require('./bookingController');
  const endDate = toDateString(bk[0].end_date);
  if (endDate > todayInAppTimeZone()) {
    const [y, m, d] = endDate.split('-');
    return res.status(400).json({ error: `Отзыв можно оставить после окончания ухода (${d}.${m}.${y}).` });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO reviews (booking_id, author_id, sitter_id, rating, body)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [booking_id, req.user.id, bk[0].sitter_id, rating, body]
    );

    // Update sitter aggregate rating
    await db.query(
      `UPDATE sitters
          SET rating = sub.avg_r,
              rating_count = sub.cnt
         FROM (
           SELECT AVG(rating)::numeric(3,2) AS avg_r, COUNT(*) AS cnt
             FROM reviews
            WHERE sitter_id = $1 AND is_hidden = FALSE
         ) sub
        WHERE id = $1`,
      [bk[0].sitter_id]
    );
    await recalculateSitterFraudScore(bk[0].sitter_id);
    const { rows: sitterRows } = await db.query(
      `SELECT u.id AS user_id
         FROM sitters s
         JOIN users u ON u.id = s.user_id
        WHERE s.id = $1`,
      [bk[0].sitter_id]
    );
    if (sitterRows[0]) {
      await createNotification({
        userId: sitterRows[0].user_id,
        type: 'new_review',
        title: 'Новый отзыв',
        body: `Вам оставили отзыв: ${'★'.repeat(Number(rating) || 0)} (${rating} из 5).`,
        meta: { booking_id, sitter_id: bk[0].sitter_id },
      }, { io: req.app.get('io') });
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Review already exists for this booking' });
    throw err;
  }
}

// GET /api/reviews/sitter/:sitterId
async function listForSitter(req, res) {
  const { rows } = await db.query(
    `SELECT r.*, u.full_name AS author, u.avatar_url
       FROM reviews r
       JOIN users u ON u.id = r.author_id
      WHERE r.sitter_id=$1 AND r.is_hidden=FALSE
      ORDER BY r.created_at DESC`,
    [req.params.sitterId]
  );
  res.json(rows);
}

// PUT /api/reviews/:id/reply { reply } — the reviewed sitter answers a review (can edit the answer).
async function reply(req, res) {
  const text = String(req.body?.reply || '').trim();
  if (text.length < 2) return res.status(400).json({ error: 'Reply is too short' });
  if (text.length > 1000) return res.status(400).json({ error: 'Reply is too long (max 1000 characters)' });

  const { rows } = await db.query(
    `UPDATE reviews r
        SET sitter_reply = $1, sitter_replied_at = NOW()
       FROM sitters s
      WHERE r.id = $2 AND s.id = r.sitter_id AND s.user_id = $3
      RETURNING r.id, r.sitter_reply, r.sitter_replied_at`,
    [text, req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Review not found or it is not about you' });
  res.json(rows[0]);
}

module.exports = { create, listForSitter, reply };
