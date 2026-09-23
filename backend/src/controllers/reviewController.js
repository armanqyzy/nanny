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
    'SELECT id, sitter_id, status FROM bookings WHERE id=$1 AND owner_id=$2',
    [booking_id, req.user.id]
  );
  if (!bk[0]) return res.status(404).json({ error: 'Booking not found' });
  if (bk[0].status !== 'completed') {
    return res.status(400).json({ error: 'Review allowed only after booking is completed' });
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
        title: 'New review',
        body: `You received a new ${rating}-star review.`,
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

module.exports = { create, listForSitter };
