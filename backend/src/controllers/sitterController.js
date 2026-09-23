const db = require('../config/db');
const { recalculateSitterFraudScore } = require('../utils/fraud');

const ALMATY_CENTER = { lat: 43.238949, lng: 76.889709 };

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function applyMapSearchFilters({ city, service, min_rating, max_price, q }, filters, params) {
  if (city) {
    params.push(city);
    filters.push(`s.city ILIKE $${params.length}`);
  }
  if (min_rating) {
    params.push(Number(min_rating));
    filters.push(`COALESCE(rs.avg_rating, 0) >= $${params.length}`);
  }
  if (max_price) {
    params.push(Number(max_price));
    filters.push(`s.price_per_day <= $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    filters.push(`(u.full_name ILIKE $${params.length} OR s.description ILIKE $${params.length})`);
  }

  let serviceClause = '';
  if (service) {
    params.push(service);
    serviceClause = ` AND EXISTS (SELECT 1 FROM sitter_services ss
                                   WHERE ss.sitter_id = s.id AND ss.service = $${params.length})`;
  }

  return serviceClause;
}

// GET /api/sitters?city=...&service=...&min_rating=...&max_price=...
async function search(req, res) {
  const { city, service, min_rating, max_price, q } = req.query;

  const filters = [
    's.is_available = TRUE',
    `s.review_status = 'approved'`,
    `s.is_verified = TRUE`,
  ];
  const params = [];

  if (city)        { params.push(city);                  filters.push(`s.city ILIKE $${params.length}`); }
  if (min_rating)  { params.push(Number(min_rating));    filters.push(`COALESCE(rs.avg_rating, 0) >= $${params.length}`); }
  if (max_price)   { params.push(Number(max_price));     filters.push(`s.price_per_day <= $${params.length}`); }
  if (q)           { params.push(`%${q}%`);              filters.push(`(u.full_name ILIKE $${params.length} OR s.description ILIKE $${params.length})`); }

  let sql = `
    SELECT s.id, s.user_id, u.full_name, u.avatar_url,
           s.description, s.experience_yrs, s.city, s.district,
           s.price_per_day,
           COALESCE(rs.avg_rating, 0)::numeric(3,2) AS rating,
           COALESCE(rs.review_count, 0)::int AS rating_count,
           s.is_verified,
           s.service_area_text, s.service_radius_km, s.work_days, s.work_start, s.work_end
      FROM sitters s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN (
        SELECT sitter_id, AVG(rating)::numeric(3,2) AS avg_rating, COUNT(*) AS review_count
          FROM reviews
         WHERE is_hidden = FALSE
         GROUP BY sitter_id
      ) rs ON rs.sitter_id = s.id
     WHERE ${filters.join(' AND ')}
  `;

  if (service) {
    params.push(service);
    sql += ` AND EXISTS (SELECT 1 FROM sitter_services ss
                          WHERE ss.sitter_id = s.id AND ss.service = $${params.length})`;
  }

  sql += ' ORDER BY s.is_verified DESC, COALESCE(rs.avg_rating, 0) DESC LIMIT 100';

  const { rows } = await db.query(sql, params);
  let favoriteIds = new Set();
  if (req.user?.id && req.user.role === 'owner') {
    const { rows: favorites } = await db.query(
      'SELECT sitter_id FROM favorite_sitters WHERE owner_id = $1',
      [req.user.id]
    );
    favoriteIds = new Set(favorites.map((row) => row.sitter_id));
  }
  res.json(rows.map((row) => ({ ...row, is_favorite: favoriteIds.has(row.id) })));
}

// GET /api/sitters/map?lat=...&lng=...&max_distance=...&min_rating=...
async function mapSearch(req, res) {
  const { city, service, min_rating, max_price, q, sort, max_distance, lat, lng } = req.query;
  const userLat = Number(lat) || ALMATY_CENTER.lat;
  const userLng = Number(lng) || ALMATY_CENTER.lng;

  const baseFilters = [
    's.is_available = TRUE',
    `s.review_status = 'approved'`,
    `s.is_verified = TRUE`,
  ];
  const baseParams = [];
  const serviceClause = applyMapSearchFilters({ city, service, min_rating, max_price, q }, baseFilters, baseParams);

  const statsSql = `
    SELECT COUNT(*)::int AS total_count,
           COUNT(*) FILTER (WHERE s.latitude IS NOT NULL AND s.longitude IS NOT NULL)::int AS with_location_count,
           COUNT(*) FILTER (WHERE s.latitude IS NULL OR s.longitude IS NULL)::int AS without_location_count
      FROM sitters s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN (
        SELECT sitter_id, AVG(rating)::numeric(3,2) AS avg_rating, COUNT(*) AS review_count
          FROM reviews
         WHERE is_hidden = FALSE
         GROUP BY sitter_id
      ) rs ON rs.sitter_id = s.id
     WHERE ${baseFilters.join(' AND ')}${serviceClause}
  `;
  const { rows: statsRows } = await db.query(statsSql, baseParams);
  const stats = statsRows[0] || { total_count: 0, with_location_count: 0, without_location_count: 0 };

  const dataFilters = [
    ...baseFilters,
    's.latitude IS NOT NULL',
    's.longitude IS NOT NULL',
  ];
  const dataParams = [...baseParams];
  const dataServiceClause = serviceClause;
  dataParams.push(userLat);
  const latIndex = dataParams.length;
  dataParams.push(userLng);
  const lngIndex = dataParams.length;

  const distanceSql = `
    6371 * 2 * ASIN(
      SQRT(
        POWER(SIN(RADIANS(s.latitude - $${latIndex}) / 2), 2) +
        COS(RADIANS($${latIndex})) * COS(RADIANS(s.latitude)) *
        POWER(SIN(RADIANS(s.longitude - $${lngIndex}) / 2), 2)
      )
    )
  `;

  let dataSql = `
    WITH candidates AS (
      SELECT s.id, s.user_id, u.full_name, u.avatar_url,
             s.description, s.experience_yrs, s.city, s.district,
             s.latitude, s.longitude, s.price_per_day,
             s.service_area_text, s.service_radius_km, s.work_start, s.work_end,
             COALESCE(rs.avg_rating, 0)::numeric(3,2) AS rating,
             COALESCE(rs.review_count, 0)::int AS rating_count,
             s.is_verified, s.is_flagged, s.fraud_score,
             (${distanceSql})::numeric(8,2) AS distance_km
        FROM sitters s
        JOIN users u ON u.id = s.user_id
        LEFT JOIN (
          SELECT sitter_id, AVG(rating)::numeric(3,2) AS avg_rating, COUNT(*) AS review_count
            FROM reviews
           WHERE is_hidden = FALSE
           GROUP BY sitter_id
        ) rs ON rs.sitter_id = s.id
       WHERE ${dataFilters.join(' AND ')}${dataServiceClause}
    )
    SELECT *
      FROM candidates
  `;

  if (max_distance) {
    dataParams.push(Number(max_distance));
    dataSql += ` WHERE distance_km <= $${dataParams.length}`;
  }

  const sortMode = sort || 'nearest';
  const orderBy = {
    nearest: 'distance_km ASC, rating DESC, price_per_day ASC NULLS LAST',
    best_rating: 'rating DESC, distance_km ASC, price_per_day ASC NULLS LAST',
    lowest_price: 'price_per_day ASC NULLS LAST, rating DESC, distance_km ASC',
  }[sortMode] || 'distance_km ASC, rating DESC, price_per_day ASC NULLS LAST';

  dataSql += ` ORDER BY ${orderBy} LIMIT 200`;

  const { rows } = await db.query(dataSql, dataParams);
  const mapped = rows.map((row) => ({
    ...row,
    distance_km: Number(Number(row.distance_km || 0).toFixed(1)),
  }));

  res.json({
    center: { lat: userLat, lng: userLng },
    filters: {
      min_rating: min_rating ? Number(min_rating) : null,
      max_distance: max_distance ? Number(max_distance) : null,
      sort: sortMode,
    },
    stats: {
      total_count: Number(stats.total_count || 0),
      with_location_count: Number(stats.with_location_count || 0),
      without_location_count: Number(stats.without_location_count || 0),
      in_radius_count: mapped.length,
    },
    sitters: mapped,
  });
}

async function getOne(req, res) {
  const { rows } = await db.query(
    `SELECT s.*, u.full_name, u.avatar_url, u.phone, u.email
       FROM sitters s
       JOIN users u ON u.id = s.user_id
      WHERE s.id = $1`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Sitter not found' });

  if (
    rows[0].review_status !== 'approved' &&
    req.user?.role !== 'admin' &&
    req.user?.id !== rows[0].user_id
  ) {
    return res.status(404).json({ error: 'Sitter not found' });
  }

  const services = await db.query(
    'SELECT id, service, price FROM sitter_services WHERE sitter_id=$1',
    [req.params.id]
  );

  const reviews = await db.query(
    `SELECT r.rating, r.body, r.created_at, u.full_name AS author
       FROM reviews r
       JOIN users u ON u.id = r.author_id
      WHERE r.sitter_id = $1 AND r.is_hidden = FALSE
      ORDER BY r.created_at DESC
      LIMIT 20`,
    [req.params.id]
  );

  let isFavorite = false;
  if (req.user?.id && req.user.role === 'owner') {
    const { rows: favoriteRows } = await db.query(
      'SELECT 1 FROM favorite_sitters WHERE owner_id = $1 AND sitter_id = $2',
      [req.user.id, req.params.id]
    );
    isFavorite = Boolean(favoriteRows[0]);
  }

  const reviewCount = reviews.rows.length;
  const averageRating = reviewCount
    ? Number((reviews.rows.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviewCount).toFixed(1))
    : 0;

  res.json({
    ...rows[0],
    rating: averageRating,
    rating_count: reviewCount,
    is_favorite: isFavorite,
    services: services.rows,
    reviews: reviews.rows,
  });
}

async function getAvailability(req, res) {
  const { start_date, end_date, start_time, end_time } = req.query;
  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }

  const { rows } = await db.query(
    `SELECT id, start_date, end_date, start_time, end_time, status
       FROM bookings
      WHERE sitter_id = $1
        AND status = 'confirmed'
        AND daterange(start_date, end_date, '[]') && daterange($2::date, $3::date, '[]')
      ORDER BY start_date ASC`,
    [req.params.id, start_date, end_date]
  );

  const conflicts = rows.filter((row) => {
    if (!start_time || !end_time || !row.start_time || !row.end_time) return true;
    return start_time < row.end_time && end_time > row.start_time;
  });

  res.json({
    available: conflicts.length === 0,
    conflicts,
    requested: {
      start_date,
      end_date,
      start_time: start_time || null,
      end_time: end_time || null,
    },
  });
}

async function listFavorites(req, res) {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Only pet owners can save favourites' });

  const { rows } = await db.query(
    `SELECT s.id, s.user_id, u.full_name, u.avatar_url, s.description, s.city, s.district,
            s.price_per_day,
            COALESCE(rs.avg_rating, 0)::numeric(3,2) AS rating,
            COALESCE(rs.review_count, 0)::int AS rating_count,
            s.is_verified, f.created_at AS favorited_at
       FROM favorite_sitters f
       JOIN sitters s ON s.id = f.sitter_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN (
         SELECT sitter_id, AVG(rating)::numeric(3,2) AS avg_rating, COUNT(*) AS review_count
           FROM reviews
          WHERE is_hidden = FALSE
          GROUP BY sitter_id
       ) rs ON rs.sitter_id = s.id
      WHERE f.owner_id = $1
        AND s.review_status = 'approved'
        AND s.is_verified = TRUE
      ORDER BY f.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
}

async function addFavorite(req, res) {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Only pet owners can save favourites' });

  const { rows } = await db.query(
    `INSERT INTO favorite_sitters (owner_id, sitter_id)
     VALUES ($1,$2)
     ON CONFLICT (owner_id, sitter_id) DO NOTHING
     RETURNING *`,
    [req.user.id, req.params.id]
  );
  res.status(201).json({ ok: true, created: Boolean(rows[0]) });
}

async function removeFavorite(req, res) {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Only pet owners can save favourites' });

  await db.query(
    'DELETE FROM favorite_sitters WHERE owner_id = $1 AND sitter_id = $2',
    [req.user.id, req.params.id]
  );
  res.json({ ok: true });
}

// sitter updates own profile
async function updateMe(req, res) {
  if (req.user.role !== 'sitter') return res.status(403).json({ error: 'Only sitters' });

  const {
    description, experience_yrs, city, district,
    price_per_day, is_available, id_document_url, latitude, longitude,
    service_area_text, service_radius_km, work_days, work_start, work_end, auto_reply_templates,
  } = req.body;

  const { rows } = await db.query(
    `UPDATE sitters SET
        description     = COALESCE($1, description),
        experience_yrs  = COALESCE($2, experience_yrs),
        city            = COALESCE($3, city),
        district        = COALESCE($4, district),
        price_per_day   = COALESCE($5, price_per_day),
        is_available    = COALESCE($6, is_available),
        id_document_url = COALESCE($7, id_document_url),
        latitude        = COALESCE($8, latitude),
        longitude       = COALESCE($9, longitude),
        service_area_text = COALESCE($10, service_area_text),
        service_radius_km = COALESCE($11, service_radius_km),
        work_days       = COALESCE($12, work_days),
        work_start      = COALESCE($13, work_start),
        work_end        = COALESCE($14, work_end),
        auto_reply_templates = COALESCE($15, auto_reply_templates)
      WHERE user_id = $16
      RETURNING *`,
    [
      description, experience_yrs, city, district, price_per_day, is_available, id_document_url, latitude, longitude,
      service_area_text, service_radius_km, work_days, work_start, work_end,
      auto_reply_templates ? JSON.stringify(auto_reply_templates) : null,
      req.user.id,
    ]
  );
  if (rows[0]) await recalculateSitterFraudScore(rows[0].id);
  res.json(rows[0]);
}

async function setServices(req, res) {
  if (req.user.role !== 'sitter') return res.status(403).json({ error: 'Only sitters' });

  const { services = [] } = req.body; // [{service, price}, ...]
  const { rows: sitter } = await db.query('SELECT id FROM sitters WHERE user_id=$1', [req.user.id]);
  if (!sitter[0]) return res.status(404).json({ error: 'Sitter profile missing' });

  await db.query('DELETE FROM sitter_services WHERE sitter_id=$1', [sitter[0].id]);
  for (const s of services) {
    await db.query(
      'INSERT INTO sitter_services (sitter_id, service, price) VALUES ($1,$2,$3)',
      [sitter[0].id, s.service, s.price]
    );
  }
  await recalculateSitterFraudScore(sitter[0].id);
  res.json({ ok: true });
}

async function getMyVerification(req, res) {
  if (req.user.role !== 'sitter') return res.status(403).json({ error: 'Only sitters' });

  const { rows } = await db.query(
    `SELECT id, review_status, admin_notes, reviewed_at, rejection_reason,
            id_document_url, background_check_status, is_verified
       FROM sitters
      WHERE user_id = $1`,
    [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Sitter profile missing' });

  const history = await db.query(
    `SELECT e.*, u.full_name AS actor_name
       FROM sitter_review_events e
       LEFT JOIN users u ON u.id = e.actor_id
      WHERE e.sitter_id = $1
      ORDER BY e.created_at DESC`,
    [rows[0].id]
  );

  res.json({
    ...rows[0],
    history: history.rows,
  });
}

async function updateMyVerification(req, res) {
  if (req.user.role !== 'sitter') return res.status(403).json({ error: 'Only sitters' });
  const { id_document_url } = req.body;
  if (!id_document_url) {
    return res.status(400).json({ error: 'Upload a verification document before submission' });
  }

  const { rows } = await db.query(
    `UPDATE sitters
        SET id_document_url = COALESCE($1, id_document_url),
            background_check_status = CASE
              WHEN COALESCE($1, id_document_url) IS NOT NULL THEN 'submitted'
              ELSE background_check_status
            END,
            review_status = CASE
              WHEN review_status = 'new' THEN 'in_review'
              ELSE review_status
            END
      WHERE user_id = $2
      RETURNING id, review_status, admin_notes, reviewed_at, rejection_reason,
                id_document_url, background_check_status, is_verified`,
    [id_document_url || null, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Sitter profile missing' });

  await db.query(
    'INSERT INTO sitter_review_events (sitter_id, actor_id, action, note) VALUES ($1,$2,$3,$4)',
    [rows[0].id, req.user.id, 'verification_submitted', 'Verification documents updated by sitter']
  );

  res.json(rows[0]);
}

async function getMyDashboard(req, res) {
  if (req.user.role !== 'sitter') return res.status(403).json({ error: 'Only sitters' });

  const { rows: sitterRows } = await db.query(
    `SELECT s.*, u.full_name, u.avatar_url, u.email, u.phone
       FROM sitters s
       JOIN users u ON u.id = s.user_id
      WHERE s.user_id = $1`,
    [req.user.id]
  );
  const sitter = sitterRows[0];
  if (!sitter) return res.status(404).json({ error: 'Sitter profile missing' });

  const services = await db.query(
    'SELECT id, service, price FROM sitter_services WHERE sitter_id = $1 ORDER BY service',
    [sitter.id]
  );

  const metrics = await db.query(
    `SELECT
        COALESCE(SUM(CASE WHEN status = 'completed' AND end_date >= CURRENT_DATE - INTERVAL '7 day' THEN total_price ELSE 0 END), 0)::float AS earnings_week,
        COALESCE(SUM(CASE WHEN status = 'completed' AND end_date >= CURRENT_DATE - INTERVAL '30 day' THEN total_price ELSE 0 END), 0)::float AS earnings_month,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_requests,
        COUNT(*) FILTER (WHERE status = 'confirmed' AND end_date >= CURRENT_DATE)::int AS upcoming_bookings,
        CASE
          WHEN COUNT(*) = 0 THEN 100
          ELSE ROUND(
            (
              COUNT(*) FILTER (WHERE status IN ('confirmed','completed','cancelled'))::numeric
              / COUNT(*)::numeric
            ) * 100
          )::int
        END AS response_rate
       FROM bookings
      WHERE sitter_id = $1`,
    [sitter.id]
  );

  const upcomingBookings = await db.query(
    `SELECT b.*, p.name AS pet_name, owner.full_name AS owner_name
       FROM bookings b
       JOIN pets p ON p.id = b.pet_id
       JOIN users owner ON owner.id = b.owner_id
      WHERE b.sitter_id = $1
        AND b.status IN ('pending','confirmed')
        AND b.end_date >= CURRENT_DATE
      ORDER BY b.start_date ASC, b.start_time ASC NULLS LAST
      LIMIT 8`,
    [sitter.id]
  );

  const reviewMetrics = await db.query(
    `SELECT COUNT(*)::int AS review_count,
            COALESCE(ROUND(AVG(rating)::numeric, 1), 0)::float AS average_rating
       FROM reviews
      WHERE sitter_id = $1
        AND is_hidden = FALSE`,
    [sitter.id]
  );

  res.json({
    sitter: {
      ...sitter,
      services: services.rows,
      review_count: reviewMetrics.rows[0]?.review_count || 0,
      average_rating: reviewMetrics.rows[0]?.average_rating || 0,
    },
    metrics: metrics.rows[0],
    upcoming_bookings: upcomingBookings.rows,
  });
}

module.exports = {
  search,
  mapSearch,
  getOne,
  getAvailability,
  listFavorites,
  addFavorite,
  removeFavorite,
  updateMe,
  setServices,
  getMyVerification,
  updateMyVerification,
  getMyDashboard,
};
