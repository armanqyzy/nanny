const { verifyToken } = require('../utils/jwt');
const db = require('../config/db');

// Checked on every request so a block takes effect immediately,
// not only when the user's 7-day token expires.
async function isUserBlocked(userId) {
  const { rows } = await db.query('SELECT is_blocked FROM users WHERE id = $1', [userId]);
  return !rows[0] || rows[0].is_blocked;
}

async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'No token provided' });

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    if (await isUserBlocked(payload.id)) {
      return res.status(403).json({ error: 'Account is blocked' });
    }
  } catch (err) {
    return next(err);
  }

  req.user = payload; // { id, role, email }
  return next();
}

function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    req.user = verifyToken(token);
  } catch (_err) {
    req.user = null;
  }
  return next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

module.exports = { auth, optionalAuth, requireRole, isUserBlocked };
