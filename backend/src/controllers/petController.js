const db = require('../config/db');

async function list(req, res) {
  // Archived pets keep their history but are hidden from the owner's lists.
  const { rows } = await db.query(
    `SELECT p.*,
            (SELECT MIN(v.next_due) FROM pet_vaccinations v
              WHERE v.pet_id = p.id AND v.next_due IS NOT NULL AND v.next_due >= CURRENT_DATE) AS next_vaccine_due,
            (SELECT COUNT(*)::int FROM pet_vaccinations v
              WHERE v.pet_id = p.id AND v.next_due IS NOT NULL AND v.next_due < CURRENT_DATE) AS overdue_vaccines
       FROM pets p
      WHERE p.owner_id = $1 AND p.is_archived = FALSE
      ORDER BY p.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
}

async function ownPet(petId, ownerId) {
  const { rows } = await db.query('SELECT id FROM pets WHERE id = $1 AND owner_id = $2', [petId, ownerId]);
  return rows[0] || null;
}

// GET /api/pets/:id/vaccinations
async function listVaccinations(req, res) {
  if (!(await ownPet(req.params.id, req.user.id))) return res.status(404).json({ error: 'Pet not found' });
  const { rows } = await db.query(
    `SELECT id, name, to_char(given_on, 'YYYY-MM-DD') AS given_on, to_char(next_due, 'YYYY-MM-DD') AS next_due, notes
       FROM pet_vaccinations WHERE pet_id = $1 ORDER BY next_due NULLS LAST, id`,
    [req.params.id]
  );
  res.json(rows);
}

// POST /api/pets/:id/vaccinations { name, given_on, next_due, notes }
async function addVaccination(req, res) {
  if (!(await ownPet(req.params.id, req.user.id))) return res.status(404).json({ error: 'Pet not found' });
  const name = String(req.body?.name || '').trim();
  const isDate = (v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(String(v));
  if (!name || name.length > 120) return res.status(400).json({ error: 'Vaccine name is required (max 120 characters)' });
  if (!isDate(req.body?.given_on) || !isDate(req.body?.next_due)) return res.status(400).json({ error: 'Dates must be YYYY-MM-DD' });
  if (req.body?.given_on && req.body?.next_due && req.body.next_due < req.body.given_on) {
    return res.status(400).json({ error: 'Next dose cannot be before the date it was given' });
  }
  const { rows } = await db.query(
    `INSERT INTO pet_vaccinations (pet_id, name, given_on, next_due, notes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, to_char(given_on, 'YYYY-MM-DD') AS given_on, to_char(next_due, 'YYYY-MM-DD') AS next_due, notes`,
    [req.params.id, name, req.body?.given_on || null, req.body?.next_due || null, String(req.body?.notes || '').trim().slice(0, 500) || null]
  );
  res.status(201).json(rows[0]);
}

// DELETE /api/pets/:id/vaccinations/:vaccinationId
async function removeVaccination(req, res) {
  if (!(await ownPet(req.params.id, req.user.id))) return res.status(404).json({ error: 'Pet not found' });
  const { rowCount } = await db.query('DELETE FROM pet_vaccinations WHERE id = $1 AND pet_id = $2', [req.params.vaccinationId, req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Vaccination not found' });
  res.json({ ok: true });
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
    // Archive instead of delete: the pet disappears from lists, history and reviews stay.
    await db.query('UPDATE pets SET is_archived = TRUE, updated_at = NOW() WHERE id = $1 AND owner_id = $2', [req.params.id, req.user.id]);
    return res.json({ ok: true, archived: true });
  }

  const { rowCount } = await db.query(
    'DELETE FROM pets WHERE id=$1 AND owner_id=$2',
    [req.params.id, req.user.id]
  );
  if (!rowCount) return res.status(404).json({ error: 'Pet not found' });
  res.json({ ok: true });
}

module.exports = { list, create, update, remove, listVaccinations, addVaccination, removeVaccination };
