const db = require('../config/db');

const FRAUD_THRESHOLD = 0.6;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function computeFraudScore(input) {
  const completenessFields = [
    input.description,
    input.city,
    input.district,
    input.latitude,
    input.longitude,
    input.id_document_url,
    input.service_count > 0 ? 'services' : '',
  ];

  const completenessRatio = completenessFields.filter(Boolean).length / completenessFields.length;
  const completenessPenalty = (1 - completenessRatio) * 0.35;
  const reviewPenalty = input.review_count === 0 ? 0.2 : input.review_count < 3 ? 0.1 : 0;
  const identityPenalty = input.is_verified || input.id_document_url ? 0 : 0.2;
  const suspiciousRatingPenalty =
    input.rating >= 4.9 && input.review_count < 3 ? 0.25
      : input.rating >= 4.7 && input.review_count < 5 ? 0.15
      : 0;

  return clamp(
    Number((completenessPenalty + reviewPenalty + identityPenalty + suspiciousRatingPenalty).toFixed(2)),
    0,
    1
  );
}

async function recalculateSitterFraudScore(sitterId, client = db) {
  const { rows } = await client.query(
    `SELECT s.id, s.description, s.city, s.district, s.latitude, s.longitude,
            s.id_document_url, s.is_verified, s.rating,
            COALESCE(s.rating_count, 0) AS review_count,
            COALESCE((SELECT COUNT(*) FROM sitter_services ss WHERE ss.sitter_id = s.id), 0)::int AS service_count
       FROM sitters s
      WHERE s.id = $1`,
    [sitterId]
  );

  if (!rows[0]) return null;

  const fraudScore = computeFraudScore(rows[0]);
  const isFlagged = fraudScore > FRAUD_THRESHOLD;

  const updated = await client.query(
    `UPDATE sitters
        SET fraud_score = $1,
            is_flagged = $2
      WHERE id = $3
      RETURNING fraud_score, is_flagged`,
    [fraudScore, isFlagged, sitterId]
  );

  return updated.rows[0];
}

module.exports = {
  FRAUD_THRESHOLD,
  computeFraudScore,
  recalculateSitterFraudScore,
};
