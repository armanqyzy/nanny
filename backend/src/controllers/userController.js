const db = require('../config/db');

async function updateMe(req, res) {
  const {
    full_name,
    phone,
    address,
    avatar_url,
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_notes,
  } = req.body;
  const { rows } = await db.query(
    `UPDATE users
       SET full_name  = COALESCE($1, full_name),
           phone      = COALESCE($2, phone),
           address    = COALESCE($3, address),
           avatar_url = COALESCE($4, avatar_url),
           emergency_contact_name = COALESCE($5, emergency_contact_name),
           emergency_contact_phone = COALESCE($6, emergency_contact_phone),
           emergency_contact_notes = COALESCE($7, emergency_contact_notes)
     WHERE id = $8
     RETURNING id, full_name, email, phone, role, avatar_url, address,
               emergency_contact_name, emergency_contact_phone, emergency_contact_notes`,
    [full_name, phone, address, avatar_url, emergency_contact_name, emergency_contact_phone, emergency_contact_notes, req.user.id]
  );
  res.json(rows[0]);
}

async function getById(req, res) {
  const { rows } = await db.query(
    `SELECT
        u.id, u.full_name, u.email, u.phone, u.role, u.avatar_url, u.address,
        s.id AS sitter_id,
        s.description AS short_description,
        s.rating,
        s.is_verified
      FROM users u
      LEFT JOIN sitters s ON s.user_id = u.id
      WHERE u.id = $1`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });

  let services = [];
  if (rows[0].sitter_id) {
    const result = await db.query(
      'SELECT service, price FROM sitter_services WHERE sitter_id = $1 ORDER BY service',
      [rows[0].sitter_id]
    );
    services = result.rows;
  }

  res.json({
    ...rows[0],
    services,
  });
}

module.exports = { updateMe, getById };
