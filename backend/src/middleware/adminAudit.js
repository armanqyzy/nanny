const db = require('../config/db');

// Writes every successful admin change (PUT/POST/DELETE) to admin_actions,
// so the team can see who blocked, approved or changed what, and when.
const ACTIONS = [
  { re: /^\/users\/(\d+)\/block$/, type: 'user', name: (body) => (body?.blocked === false ? 'user_unblocked' : 'user_blocked') },
  { re: /^\/sitters\/(\d+)\/review$/, type: 'sitter', name: (body) => `sitter_review_${body?.review_status || body?.status || 'updated'}` },
  { re: /^\/sitters\/(\d+)\/verify$/, type: 'sitter', name: (body) => (body?.verified === false ? 'sitter_unverified' : 'sitter_verified') },
  { re: /^\/orders\/(\d+)\/status$/, type: 'order', name: (body) => `order_${body?.status || 'updated'}` },
  { re: /^\/support\/tickets\/(\d+)$/, type: 'support_ticket', name: (body) => `ticket_${body?.status || 'updated'}` },
  { re: /^\/reviews\/(\d+)\/hide$/, type: 'review', name: (body) => (body?.hidden === false ? 'review_shown' : 'review_hidden') },
];

// Never copy secrets or long texts into the log.
function safeDetails(body = {}) {
  const details = {};
  Object.entries(body || {}).forEach(([key, value]) => {
    if (/password|token|card/i.test(key)) return;
    if (typeof value === 'string') details[key] = value.slice(0, 200);
    else if (typeof value === 'number' || typeof value === 'boolean' || value === null) details[key] = value;
  });
  return details;
}

function adminAudit(req, res, next) {
  if (!['PUT', 'POST', 'DELETE', 'PATCH'].includes(req.method)) return next();
  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    const match = ACTIONS.find((item) => item.re.test(req.path));
    const targetId = match ? Number(req.path.match(match.re)[1]) : null;
    db.query(
      `INSERT INTO admin_actions (admin_id, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.user?.id || null,
        match ? match.name(req.body) : `${req.method.toLowerCase()} ${req.path}`.slice(0, 60),
        match ? match.type : null,
        targetId,
        JSON.stringify(safeDetails(req.body)),
      ]
    ).catch((err) => console.error('[admin-audit]', err.message));
  });
  return next();
}

// GET /api/admin/actions — latest 200 entries with readable names.
async function listAdminActions(_req, res) {
  const { rows } = await db.query(
    `SELECT a.id, a.action, a.target_type, a.target_id, a.details, a.created_at,
            admin.full_name AS admin_name,
            CASE
              WHEN a.target_type = 'user' THEN (SELECT full_name FROM users WHERE id = a.target_id)
              WHEN a.target_type = 'sitter' THEN (SELECT u.full_name FROM sitters s JOIN users u ON u.id = s.user_id WHERE s.id = a.target_id)
              ELSE NULL
            END AS target_name
       FROM admin_actions a
       LEFT JOIN users admin ON admin.id = a.admin_id
      ORDER BY a.created_at DESC
      LIMIT 200`
  );
  res.json(rows);
}

module.exports = { adminAudit, listAdminActions };
