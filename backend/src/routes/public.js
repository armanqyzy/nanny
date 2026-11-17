const router = require('express').Router();
const db = require('../config/db');
const asyncHandler = require('../middleware/asyncHandler');

// GET /api/public/home — real numbers and latest visible reviews for the landing page.
router.get('/home', asyncHandler(async (_req, res) => {
  const { rows: statRows } = await db.query(
    `SELECT
        (SELECT COUNT(*)::int FROM bookings WHERE status = 'completed') AS completed_bookings,
        (SELECT COUNT(*)::int FROM reviews WHERE is_hidden = FALSE) AS review_count,
        (SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0) FROM reviews WHERE is_hidden = FALSE) AS avg_rating,
        (SELECT COUNT(*)::int FROM sitters WHERE is_verified = TRUE AND review_status = 'approved') AS verified_sitters`
  );

  const { rows: reviews } = await db.query(
    `SELECT r.id, r.rating, r.body, r.created_at,
            -- only the first name and initial of the author, for privacy
            split_part(u.full_name, ' ', 1) ||
              CASE WHEN split_part(u.full_name, ' ', 2) <> '' THEN ' ' || left(split_part(u.full_name, ' ', 2), 1) || '.' ELSE '' END
              AS author,
            su.full_name AS sitter_name, su.avatar_url AS sitter_avatar, s.id AS sitter_id
       FROM reviews r
       JOIN users u ON u.id = r.author_id
       JOIN sitters s ON s.id = r.sitter_id
       JOIN users su ON su.id = s.user_id
      WHERE r.is_hidden = FALSE
      ORDER BY r.created_at DESC
      LIMIT 8`
  );

  const stats = statRows[0] || {};
  res.json({
    stats: {
      completed_bookings: Number(stats.completed_bookings || 0),
      review_count: Number(stats.review_count || 0),
      avg_rating: Number(stats.avg_rating || 0),
      verified_sitters: Number(stats.verified_sitters || 0),
    },
    reviews,
  });
}));

module.exports = router;
