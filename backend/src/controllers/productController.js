const db = require('../config/db');

async function list(req, res) {
  const { category, q } = req.query;
  const filters = ['is_active = TRUE'];
  const params = [];
  if (category) { params.push(category); filters.push(`category = $${params.length}`); }
  if (q)        { params.push(`%${q}%`); filters.push(`title ILIKE $${params.length}`); }

  const { rows } = await db.query(
    `SELECT * FROM products WHERE ${filters.join(' AND ')} ORDER BY created_at DESC`,
    params
  );
  res.json(rows);
}

async function getOne(req, res) {
  const { rows } = await db.query('SELECT * FROM products WHERE id=$1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Product not found' });
  res.json(rows[0]);
}

// admin only
async function create(req, res) {
  const { title, category, description, price, image_url, stock } = req.body;
  const { rows } = await db.query(
    `INSERT INTO products (title, category, description, price, image_url, stock)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [title, category, description, price, image_url, stock || 0]
  );
  res.status(201).json(rows[0]);
}

async function update(req, res) {
  const { title, category, description, price, image_url, stock, is_active } = req.body;
  const { rows } = await db.query(
    `UPDATE products SET
        title       = COALESCE($1,title),
        category    = COALESCE($2,category),
        description = COALESCE($3,description),
        price       = COALESCE($4,price),
        image_url   = COALESCE($5,image_url),
        stock       = COALESCE($6,stock),
        is_active   = COALESCE($7,is_active)
      WHERE id = $8 RETURNING *`,
    [title, category, description, price, image_url, stock, is_active, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
}

async function remove(req, res) {
  await db.query('UPDATE products SET is_active=FALSE WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
}

module.exports = { list, getOne, create, update, remove };
