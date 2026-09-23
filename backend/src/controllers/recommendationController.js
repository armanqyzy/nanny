const db = require('../config/db');
const { generateRecommendationExplanation } = require('../services/openaiService');

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

// GET /api/recommendations?pet_id=1&lat=...&lng=...
async function recommendations(req, res) {
  const petId = Number(req.query.pet_id);
  const userLat = Number(req.query.lat) || ALMATY_CENTER.lat;
  const userLng = Number(req.query.lng) || ALMATY_CENTER.lng;

  const petQuery = petId
    ? await db.query('SELECT * FROM pets WHERE id=$1 AND owner_id=$2', [petId, req.user.id])
    : await db.query('SELECT * FROM pets WHERE owner_id=$1 ORDER BY created_at DESC LIMIT 1', [req.user.id]);

  const pet = petQuery.rows[0];
  if (!pet) return res.status(404).json({ error: 'Pet not found for recommendations' });

  const { rows } = await db.query(
    `SELECT s.id, s.user_id, u.full_name, u.avatar_url,
            s.description, s.city, s.district, s.latitude, s.longitude,
            s.price_per_day,
            COALESCE(rs.avg_rating, 0)::numeric(3,2) AS rating,
            COALESCE(rs.review_count, 0)::int AS rating_count,
            s.is_verified,
            COALESCE(ss.services, '') AS services,
            COALESCE(pb.booking_count, 0)::int AS previous_bookings
       FROM sitters s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN (
         SELECT sitter_id, AVG(rating)::numeric(3,2) AS avg_rating, COUNT(*) AS review_count
           FROM reviews
          WHERE is_hidden = FALSE
          GROUP BY sitter_id
       ) rs ON rs.sitter_id = s.id
       LEFT JOIN (
         SELECT sitter_id, string_agg(service, ',') AS services
         FROM sitter_services
         GROUP BY sitter_id
       ) ss ON ss.sitter_id = s.id
       LEFT JOIN (
         SELECT sitter_id, COUNT(*) AS booking_count
         FROM bookings
         WHERE owner_id = $1
         GROUP BY sitter_id
       ) pb ON pb.sitter_id = s.id
      WHERE s.is_available = TRUE
        AND s.review_status = 'approved'
        AND s.is_verified = TRUE
      ORDER BY COALESCE(rs.avg_rating, 0) DESC`,
    [req.user.id]
  );

  const mapped = rows.map((sitter) => {
    const distanceKm = sitter.latitude && sitter.longitude
      ? haversineKm(userLat, userLng, sitter.latitude, sitter.longitude)
      : 20;

    const petTypeMatch =
      pet.pet_type === 'dog' ? /walking|boarding|home_visit/.test(sitter.services)
        : pet.pet_type === 'cat' ? /home_visit|boarding/.test(sitter.services)
        : sitter.services.length > 0;

    const score =
      (petTypeMatch ? 35 : 15) +
      Number(sitter.rating || 0) * 10 +
      Math.max(0, 25 - distanceKm) +
      Math.min(20, sitter.previous_bookings * 6);

    return {
      ...sitter,
      pet_type: pet.pet_type,
      distance_km: Number(distanceKm.toFixed(1)),
      recommendation_score: Number(score.toFixed(1)),
      reasons: [
        petTypeMatch ? `Matches ${pet.pet_type} care needs` : 'General sitter match',
        `Rating ${sitter.rating}`,
        `${sitter.previous_bookings} previous bookings with this owner`,
      ],
    };
  });

  mapped.sort((a, b) => b.recommendation_score - a.recommendation_score);
  const topRecommendations = mapped.slice(0, 3);

  const recommendationsWithExplanation = await Promise.all(
    topRecommendations.map(async (sitter) => {
      const services = String(sitter.services || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      const ai = await generateRecommendationExplanation({
        petName: pet.name,
        petType: pet.pet_type,
        sitterName: sitter.full_name,
        rating: sitter.rating,
        distanceKm: sitter.distance_km,
        previousBookings: sitter.previous_bookings,
        services,
        reasons: sitter.reasons,
      }).catch(() => null);

      return {
        ...sitter,
        ai_explanation: ai?.explanation || null,
        ai_source: ai?.source || 'fallback',
      };
    })
  );

  res.json({ pet, recommendations: recommendationsWithExplanation });
}

module.exports = { recommendations };
