const db = require('../config/db');

async function list(req, res) {
  const { rows } = await db.query(
    'SELECT * FROM pets WHERE owner_id=$1 ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json(rows);
}

async function create(req, res) {
  const {
    name, pet_type, gender, age, size, care_type,
    behavior, health, description, photo_url,
  } = req.body;

  if (!name || !pet_type) return res.status(400).json({ error: 'name and pet_type required' });

  const { rows } = await db.query(
    `INSERT INTO pets
       (owner_id, name, pet_type, gender, age, size, care_type, behavior, health, description, photo_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [req.user.id, name, pet_type, gender, age, size, care_type, behavior, health, description, photo_url]
  );
  res.status(201).json(rows[0]);
}

const UPDATABLE_PET_FIELDS = [
  'name', 'pet_type', 'gender', 'age', 'size', 'care_type',
  'behavior', 'health', 'description', 'photo_url',
];

async function update(req, res) {
  // Only fields that were sent are changed. Sending null clears a field
  // (for example removing the photo), which COALESCE used to ignore.
  const sets = [];
  const params = [];
  UPDATABLE_PET_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      params.push(req.body[field] === '' && field !== 'name' ? null : req.body[field]);
      sets.push(`${field} = $${params.length}`);
    }
  });
  if (Object.prototype.hasOwnProperty.call(req.body, 'name') && !String(req.body.name || '').trim()) {
    return res.status(400).json({ error: 'name cannot be empty' });
  }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });

  params.push(req.params.id, req.user.id);
  const { rows } = await db.query(
    `UPDATE pets SET ${sets.join(', ')}, updated_at = NOW()
      WHERE id = $${params.length - 1} AND owner_id = $${params.length}
      RETURNING *`,
    params
  );
  if (!rows[0]) return res.status(404).json({ error: 'Pet not found' });
  res.json(rows[0]);
}

async function remove(req, res) {
  // Deleting a pet cascades to its bookings, and from there to reviews and pet updates.
  // Keep that history safe: only pets without real bookings can be deleted.
  const { rows: bookingRows } = await db.query(
    `SELECT COUNT(*)::int AS count
       FROM bookings b
       JOIN pets p ON p.id = b.pet_id
      WHERE b.pet_id = $1 AND p.owner_id = $2 AND b.status <> 'cancelled'`,
    [req.params.id, req.user.id]
  );
  if (bookingRows[0]?.count > 0) {
    return res.status(409).json({
      error: 'This pet has bookings, so it cannot be deleted. Its booking history and sitter reviews are kept.',
    });
  }

  const { rowCount } = await db.query(
    'DELETE FROM pets WHERE id=$1 AND owner_id=$2',
    [req.params.id, req.user.id]
  );
  if (!rowCount) return res.status(404).json({ error: 'Pet not found' });
  res.json({ ok: true });
}

module.exports = { list, create, update, remove };
