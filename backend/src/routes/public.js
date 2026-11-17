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

const { matchDistricts, matchServices } = require('../utils/searchWords');

// GET /api/public/search?q=... — quick search for the header: sitters and shop products.
router.get('/search', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 60);
  if (q.length < 2) return res.json({ sitters: [], products: [] });
  const lower = q.toLowerCase();
  const like = `%${q}%`;
  const districts = matchDistricts(lower);
  const services = matchServices(lower);

  const { rows: sitters } = await db.query(
    `SELECT s.id, u.full_name, u.avatar_url, s.district, s.rating, s.rating_count, s.price_per_day
       FROM sitters s
       JOIN users u ON u.id = s.user_id
      WHERE s.review_status = 'approved' AND s.is_verified = TRUE AND u.is_blocked = FALSE
        AND (u.full_name ILIKE $1 OR s.description ILIKE $1 OR s.district ILIKE $1
             OR s.district = ANY($2::text[])
             OR EXISTS (SELECT 1 FROM sitter_services ss WHERE ss.sitter_id = s.id AND ss.service = ANY($3::text[])))
      ORDER BY s.rating DESC, s.rating_count DESC
      LIMIT 5`,
    [like, districts, services]
  );
  const { rows: products } = await db.query(
    `SELECT id, title, price, image_url, category
       FROM products
      WHERE is_active = TRUE AND (title ILIKE $1 OR description ILIKE $1 OR category ILIKE $1)
      ORDER BY title
      LIMIT 5`,
    [like]
  );
  res.json({ sitters, products });
}));

module.exports = router;
