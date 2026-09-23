const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../config/db');
const { signToken } = require('../utils/jwt');
const { recalculateSitterFraudScore } = require('../utils/fraud');
const { sendPlainEmail } = require('../services/emailService');

const PASSWORD_SALT_ROUNDS = 12;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const failedLoginAttempts = new Map();

function loginAttemptKey(email, ip) {
  return `${String(email || '').toLowerCase()}|${ip || 'unknown'}`;
}

function getAttemptInfo(key) {
  const current = failedLoginAttempts.get(key);
  if (!current) return { count: 0, blockedUntil: null };
  if (current.lastAttemptAt && Date.now() - current.lastAttemptAt > FAILED_LOGIN_WINDOW_MS) {
    failedLoginAttempts.delete(key);
    return { count: 0, blockedUntil: null };
  }
  return current;
}

function registerFailedAttempt(key) {
  const current = getAttemptInfo(key);
  const nextCount = current.count + 1;
  const nextValue = {
    count: nextCount,
    lastAttemptAt: Date.now(),
    blockedUntil: nextCount >= MAX_FAILED_LOGIN_ATTEMPTS ? Date.now() + FAILED_LOGIN_WINDOW_MS : null,
  };
  failedLoginAttempts.set(key, nextValue);
  return nextValue;
}

function clearFailedAttempts(key) {
  failedLoginAttempts.delete(key);
}

async function register(req, res) {
  const { full_name, phone, password, role = 'owner' } = req.body;
  const email = String(req.body.email).trim().toLowerCase();

  const { rows: existing } = await db.query('SELECT id FROM users WHERE email=$1', [email]);
  if (existing.length) return res.status(409).json({ error: 'Email already registered' });

  const hash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);

  const { rows } = await db.query(
    `INSERT INTO users (full_name, email, phone, password_hash, role)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, full_name, email, phone, role, avatar_url`,
    [full_name, email, phone || null, hash, role]
  );
  const user = rows[0];

  // If sitter, create empty sitter profile
  if (role === 'sitter') {
    const { rows: sitterRows } = await db.query('INSERT INTO sitters (user_id) VALUES ($1) RETURNING id', [user.id]);
    await recalculateSitterFraudScore(sitterRows[0].id);
  }

  const token = signToken(user);
  res.status(201).json({ token, user });
}

async function login(req, res) {
  const email = String(req.body.email).trim().toLowerCase();
  const { password } = req.body;
  const attemptKey = loginAttemptKey(email, req.ip);
  const attemptInfo = getAttemptInfo(attemptKey);
  if (attemptInfo.blockedUntil && attemptInfo.blockedUntil > Date.now()) {
    return res.status(429).json({ error: 'Too many failed login attempts. Please try again later.' });
  }

  const { rows } = await db.query(
    'SELECT id, full_name, email, phone, role, avatar_url, password_hash, is_blocked FROM users WHERE email=$1',
    [email]
  );
  const user = rows[0];
  if (!user) {
    registerFailedAttempt(attemptKey);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (user.is_blocked) return res.status(403).json({ error: 'Account is blocked' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    registerFailedAttempt(attemptKey);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  clearFailedAttempts(attemptKey);

  delete user.password_hash;
  delete user.is_blocked;
  const token = signToken(user);
  res.json({ token, user });
}

// JWT is stateless -> logout is handled client-side by dropping the token.
// This endpoint exists for symmetry.
async function logout(_req, res) {
  res.json({ ok: true });
}

async function me(req, res) {
  const { rows } = await db.query(
    `SELECT id, full_name, email, phone, role, avatar_url, address,
            emergency_contact_name, emergency_contact_phone, emergency_contact_notes
       FROM users
      WHERE id=$1`,
    [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
}

async function forgotPassword(req, res) {
  const email = String(req.body.email).trim().toLowerCase();
  const { rows } = await db.query('SELECT id, full_name, email FROM users WHERE email=$1', [email]);
  const user = rows[0];

  if (user) {
    const rawToken = crypto.randomBytes(24).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.query(
      `UPDATE users
          SET reset_password_token=$1,
              reset_password_expires_at=$2
        WHERE id=$3`,
      [tokenHash, expiresAt, user.id]
    );

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendBase}/reset-password?token=${rawToken}`;
    await sendPlainEmail({
      to: user.email,
      subject: 'Nanny password reset',
      text: [
        `Hello ${user.full_name || 'there'},`,
        '',
        'We received a request to reset your Nanny password.',
        `Open this link to choose a new password: ${resetLink}`,
        '',
        'This link expires in 1 hour.',
        'If you did not request this change, you can ignore this email.',
      ].join('\n'),
    });
  }

  res.json({
    ok: true,
    message: 'If this email exists in Nanny, a password reset link has been sent.',
  });
}

async function resetPassword(req, res) {
  const rawToken = String(req.body.token || '').trim();
  const password = req.body.password;
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const { rows } = await db.query(
    `SELECT id
       FROM users
      WHERE reset_password_token=$1
        AND reset_password_expires_at IS NOT NULL
        AND reset_password_expires_at > NOW()
      LIMIT 1`,
    [tokenHash]
  );

  const user = rows[0];
  if (!user) return res.status(400).json({ error: 'This password reset link is invalid or expired.' });

  const hash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  await db.query(
    `UPDATE users
        SET password_hash=$1,
            reset_password_token=NULL,
            reset_password_expires_at=NULL
      WHERE id=$2`,
    [hash, user.id]
  );

  res.json({ ok: true, message: 'Password updated successfully.' });
}

module.exports = { register, login, logout, me, forgotPassword, resetPassword };
