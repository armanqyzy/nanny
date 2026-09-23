const db = require('../config/db');
const { notifyUser } = require('../services/alertService');
const { triageSupportTicket } = require('../services/openaiService');

const SUPPORT_CATEGORIES = [
  'booking_issue',
  'payment_issue',
  'safety_concern',
  'sitter_report',
  'shop_order',
  'technical_issue',
  'other',
];

async function createTicket(req, res) {
  const { category, priority = 'normal', subject, body } = req.body;

  if (!SUPPORT_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Invalid support category' });
  }
  if (!subject?.trim() || !body?.trim()) {
    return res.status(400).json({ error: 'Subject and message are required' });
  }

  const { rows: admins } = await db.query(
    `SELECT id FROM users
      WHERE role = 'admin'
      ORDER BY id ASC
      LIMIT 1`
  );

  const aiTriage = await triageSupportTicket({
    category,
    priority,
    subject: subject.trim(),
    body: body.trim(),
  }).catch(() => null);

  const assignedAdminId = admins[0]?.id || null;
  const { rows } = await db.query(
    `INSERT INTO support_tickets (
        user_id, category, priority, subject, body, status, assigned_admin_id,
        ai_summary, ai_suggested_category, ai_suggested_priority, ai_first_reply
      ) VALUES ($1,$2,$3,$4,$5,'open',$6,$7,$8,$9,$10)
      RETURNING *`,
    [
      req.user.id,
      category,
      priority,
      subject.trim(),
      body.trim(),
      assignedAdminId,
      aiTriage?.summary || null,
      SUPPORT_CATEGORIES.includes(aiTriage?.suggested_category) ? aiTriage.suggested_category : category,
      ['low', 'normal', 'high', 'urgent'].includes(aiTriage?.suggested_priority) ? aiTriage.suggested_priority : priority,
      aiTriage?.first_reply || null,
    ]
  );

  if (assignedAdminId) {
    await notifyUser({
      userId: assignedAdminId,
      type: 'support_ticket',
      title: 'New support ticket',
      body: `${req.user.full_name || 'User'} created "${subject.trim()}".`,
      meta: { ticket_id: rows[0].id, category },
    });
  }

  res.status(201).json({
    ...rows[0],
    ai_triage: aiTriage ? {
      suggested_category: SUPPORT_CATEGORIES.includes(aiTriage.suggested_category) ? aiTriage.suggested_category : category,
      suggested_priority: ['low', 'normal', 'high', 'urgent'].includes(aiTriage.suggested_priority) ? aiTriage.suggested_priority : priority,
      summary: aiTriage.summary || null,
      first_reply: aiTriage.first_reply || null,
      source: aiTriage.source || 'fallback',
    } : null,
  });
}

async function myTickets(req, res) {
  const { rows } = await db.query(
    `SELECT *
       FROM support_tickets
      WHERE user_id = $1
      ORDER BY created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
}

module.exports = {
  SUPPORT_CATEGORIES,
  createTicket,
  myTickets,
};
