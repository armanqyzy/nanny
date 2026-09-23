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

async function update(req, res) {
  const {
    name, pet_type, gender, age, size, care_type,
    behavior, health, description, photo_url,
  } = req.body;

  const { rows } = await db.query(
    `UPDATE pets SET
        name        = COALESCE($1, name),
        pet_type    = COALESCE($2, pet_type),
        gender      = COALESCE($3, gender),
        age         = COALESCE($4, age),
        size        = COALESCE($5, size),
        care_type   = COALESCE($6, care_type),
        behavior    = COALESCE($7, behavior),
        health      = COALESCE($8, health),
        description = COALESCE($9, description),
        photo_url   = COALESCE($10, photo_url),
        updated_at  = NOW()
      WHERE id = $11 AND owner_id = $12
      RETURNING *`,
    [name, pet_type, gender, age, size, care_type, behavior, health, description, photo_url,
      req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Pet not found' });
  res.json(rows[0]);
}

async function remove(req, res) {
  const { rowCount } = await db.query(
    'DELETE FROM pets WHERE id=$1 AND owner_id=$2',
    [req.params.id, req.user.id]
  );
  if (!rowCount) return res.status(404).json({ error: 'Pet not found' });
  res.json({ ok: true });
}

module.exports = { list, create, update, remove };
