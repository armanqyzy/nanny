const db = require('../config/db');
const { notifyUser } = require('../services/alertService');

async function listUsers(_req, res) {
  const { rows } = await db.query(
    'SELECT id, full_name, email, phone, role, is_blocked, created_at FROM users ORDER BY created_at DESC'
  );
  res.json(rows);
}

async function blockUser(req, res) {
  const { blocked = true } = req.body;
  const { rows } = await db.query(
    'UPDATE users SET is_blocked=$1 WHERE id=$2 RETURNING id, full_name, is_blocked',
    [blocked, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
}

async function listPendingSitters(req, res) {
  const { status, q } = req.query;
  const allowed = ['new', 'in_review', 'approved', 'changes_requested', 'rejected'];
  const params = [];
  const filters = [`s.review_status <> 'approved'`];

  if (status && allowed.includes(status)) {
    params.push(status);
    filters.length = 0;
    filters.push(`s.review_status = $${params.length}`);
  }

  if (q) {
    params.push(`%${q}%`);
    filters.push(`(u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }

  const { rows } = await db.query(
    `SELECT s.id, s.user_id, u.full_name, u.email, s.experience_yrs, s.city,
            s.district, s.id_document_url, s.is_verified, s.created_at,
            s.review_status, s.admin_notes, s.reviewed_at, s.rejection_reason
       FROM sitters s JOIN users u ON u.id=s.user_id
      WHERE ${filters.join(' AND ')}
      ORDER BY s.created_at ASC`,
    params
  );
  res.json(rows);
}

async function verifySitter(req, res) {
  const { verified = true } = req.body;
  const { rows } = await db.query(
    `UPDATE sitters
        SET is_verified=$1,
            review_status = CASE WHEN $1 THEN 'approved' ELSE review_status END,
            reviewed_by = $3,
            reviewed_at = NOW()
      WHERE id=$2
      RETURNING id, user_id, is_verified, review_status`,
    [verified, req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Sitter not found' });
  await db.query(
    'INSERT INTO sitter_review_events (sitter_id, actor_id, action, note) VALUES ($1,$2,$3,$4)',
    [req.params.id, req.user.id, verified ? 'approved' : 'verification_updated', req.body?.note || null]
  );
  res.json(rows[0]);
}

async function listBookings(_req, res) {
  const { rows } = await db.query(
    `SELECT b.*, p.name AS pet_name, ou.full_name AS owner_name, su.full_name AS sitter_name
       FROM bookings b
       JOIN pets p ON p.id = b.pet_id
       JOIN users ou ON ou.id = b.owner_id
       JOIN sitters s ON s.id = b.sitter_id
       JOIN users su ON su.id = s.user_id
      ORDER BY b.created_at DESC
      LIMIT 200`
  );
  res.json(rows);
}

async function getSitterReview(req, res) {
  const { rows } = await db.query(
    `SELECT s.*, u.full_name, u.avatar_url, u.phone, u.email
       FROM sitters s
       JOIN users u ON u.id = s.user_id
      WHERE s.id = $1`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Sitter not found' });

  const services = await db.query(
    'SELECT id, service, price FROM sitter_services WHERE sitter_id=$1 ORDER BY service',
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

  const history = await db.query(
    `SELECT e.*, u.full_name AS actor_name
       FROM sitter_review_events e
       LEFT JOIN users u ON u.id = e.actor_id
      WHERE e.sitter_id = $1
      ORDER BY e.created_at DESC`,
    [req.params.id]
  );

  res.json({
    ...rows[0],
    services: services.rows,
    reviews: reviews.rows,
    history: history.rows,
  });
}

async function updateSitterReview(req, res) {
  const { status, admin_notes, rejection_reason } = req.body;
  const allowed = ['new', 'in_review', 'approved', 'changes_requested', 'rejected'];

  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid review status' });
  }

  const isApproved = status === 'approved';
  const { rows } = await db.query(
    `UPDATE sitters
        SET review_status = $1,
            admin_notes = $2,
            rejection_reason = $3,
            is_verified = $4,
            reviewed_by = $5,
            reviewed_at = NOW()
      WHERE id = $6
      RETURNING *`,
    [status, admin_notes || null, rejection_reason || null, isApproved, req.user.id, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Sitter not found' });

  await db.query(
    'INSERT INTO sitter_review_events (sitter_id, actor_id, action, note) VALUES ($1,$2,$3,$4)',
    [req.params.id, req.user.id, status, admin_notes || rejection_reason || null]
  );

  if (['approved', 'changes_requested', 'rejected'].includes(status)) {
    const messageBodyByStatus = {
      approved: `Your sitter profile has been approved. You can now appear publicly on the platform.${admin_notes ? ` Note from admin: ${admin_notes}` : ''}`,
      changes_requested: `Your sitter profile needs updates before approval.${rejection_reason ? ` Requested changes: ${rejection_reason}` : ''}${admin_notes ? ` Admin note: ${admin_notes}` : ''}`,
      rejected: `Your sitter profile was rejected.${rejection_reason ? ` Reason: ${rejection_reason}` : ''}${admin_notes ? ` Admin note: ${admin_notes}` : ''}`,
    };

    await db.query(
      'INSERT INTO messages (sender_id, receiver_id, body) VALUES ($1,$2,$3)',
      [req.user.id, rows[0].user_id, messageBodyByStatus[status]]
    );
  }

  res.json(rows[0]);
}

async function reviewOverview(_req, res) {
  const { rows: counts } = await db.query(
    `SELECT review_status, COUNT(*)::int AS count
       FROM sitters
      GROUP BY review_status`
  );

  const { rows: actionItems } = await db.query(
    `SELECT s.id, u.full_name, u.email, s.review_status, s.created_at, s.reviewed_at
       FROM sitters s
       JOIN users u ON u.id = s.user_id
      WHERE s.review_status IN ('new', 'in_review', 'changes_requested')
      ORDER BY s.created_at ASC
      LIMIT 6`
  );

  res.json({
    counts,
    actionItems,
  });
}

async function listProducts(_req, res) {
  const { rows } = await db.query(
    `SELECT * FROM products
      ORDER BY is_active DESC, created_at DESC`
  );
  res.json(rows);
}

async function listOrders(_req, res) {
  const { rows: orders } = await db.query(
    `SELECT o.*, u.full_name, u.email, u.phone
       FROM orders o
       JOIN users u ON u.id = o.user_id
      ORDER BY o.created_at DESC
      LIMIT 200`
  );

  for (const order of orders) {
    const { rows: items } = await db.query(
      `SELECT oi.*, p.title, p.image_url
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = $1`,
      [order.id]
    );
    order.items = items;
  }

  res.json(orders);
}

async function updateOrderStatus(req, res) {
  const { status } = req.body;
  const allowed = ['new', 'paid', 'shipped', 'delivered', 'cancelled'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid order status' });
  }

  const { rows } = await db.query(
    'UPDATE orders SET status=$1 WHERE id=$2 RETURNING *',
    [status, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Order not found' });
  await notifyUser({
    userId: rows[0].user_id,
    type: 'shop_order_status',
    title: 'Shop order updated',
    body: `Your shop order #${rows[0].id} is now ${status}.`,
    meta: { order_id: rows[0].id, status },
    emailSubject: `Shop order #${rows[0].id} status updated`,
    emailText: `Your shop order #${rows[0].id} is now ${status}.`,
    smsText: `Nanny: order #${rows[0].id} is now ${status}.`,
  });
  res.json(rows[0]);
}

async function moderateReview(req, res) {
  const { hidden = true } = req.body;
  const { rows } = await db.query(
    'UPDATE reviews SET is_hidden=$1 WHERE id=$2 RETURNING *',
    [hidden, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Review not found' });
  res.json(rows[0]);
}

async function listSupportTickets(_req, res) {
  const { rows } = await db.query(
    `SELECT t.*, u.full_name AS requester_name, u.email AS requester_email,
            u.phone AS requester_phone, a.full_name AS assigned_admin_name
       FROM support_tickets t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN users a ON a.id = t.assigned_admin_id
      ORDER BY
        CASE t.status
          WHEN 'open' THEN 0
          WHEN 'in_progress' THEN 1
          WHEN 'resolved' THEN 2
          ELSE 3
        END,
        t.created_at DESC`
  );
  res.json(rows);
}

async function updateSupportTicket(req, res) {
  const { status, resolution_note, assigned_admin_id } = req.body;
  const allowed = ['open', 'in_progress', 'resolved', 'closed'];

  if (status && !allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid support ticket status' });
  }

  const { rows } = await db.query(
    `UPDATE support_tickets
        SET status = COALESCE($1, status),
            resolution_note = COALESCE($2, resolution_note),
            assigned_admin_id = COALESCE($3, assigned_admin_id),
            updated_at = NOW()
      WHERE id = $4
      RETURNING *`,
    [status || null, resolution_note || null, assigned_admin_id || req.user.id, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Support ticket not found' });

  if (status && ['in_progress', 'resolved', 'closed'].includes(status)) {
    await notifyUser({
      userId: rows[0].user_id,
      type: 'support_update',
      title: 'Support ticket updated',
      body: `Your support request "${rows[0].subject}" is now ${status.replace('_', ' ')}.`,
      meta: { ticket_id: rows[0].id, status },
      emailSubject: `Support update for "${rows[0].subject}"`,
      emailText: `Your support request "${rows[0].subject}" is now ${status.replace('_', ' ')}.${resolution_note ? `\n\nSupport note: ${resolution_note}` : ''}`,
      smsText: `Nanny support: "${rows[0].subject}" is now ${status.replace('_', ' ')}.`,
    });
  }

  res.json(rows[0]);
}

async function stats(_req, res) {
  const q = async (sql) => (await db.query(sql)).rows[0];
  const [activeUsers, activeSitters, completedBookings, averageRating, supportTickets] = await Promise.all([
    q(`SELECT COUNT(*)::int AS count
         FROM users
        WHERE is_blocked = FALSE
          AND id IN (
            SELECT owner_id FROM bookings WHERE created_at >= NOW() - INTERVAL '30 day'
            UNION
            SELECT user_id FROM orders WHERE created_at >= NOW() - INTERVAL '30 day'
            UNION
            SELECT sender_id FROM messages WHERE created_at >= NOW() - INTERVAL '30 day'
            UNION
            SELECT receiver_id FROM messages WHERE created_at >= NOW() - INTERVAL '30 day'
          )`),
    q(`SELECT COUNT(DISTINCT s.id)::int AS count
         FROM sitters s
         LEFT JOIN bookings b ON b.sitter_id = s.id AND b.created_at >= NOW() - INTERVAL '30 day'
        WHERE s.review_status = 'approved'
          AND s.is_verified = TRUE
          AND (s.is_available = TRUE OR b.id IS NOT NULL)`),
    q(`SELECT COUNT(*)::int AS count FROM bookings WHERE status = 'completed'`),
    q(`SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0)::float AS value FROM reviews WHERE is_hidden = FALSE`),
    q(`SELECT COUNT(*)::int AS count FROM support_tickets WHERE status IN ('open','in_progress')`),
  ]);
  res.json({
    active_users: activeUsers.count,
    active_sitters: activeSitters.count,
    completed_bookings: completedBookings.count,
    average_rating: averageRating.value,
    open_support_tickets: supportTickets.count,
  });
}

module.exports = {
  listUsers, blockUser,
  listPendingSitters, verifySitter, getSitterReview, updateSitterReview, reviewOverview,
  listBookings, listProducts, listOrders, updateOrderStatus, moderateReview,
  listSupportTickets, updateSupportTicket, stats,
};
