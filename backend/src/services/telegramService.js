// Telegram notifications through the Nanny bot.
// Render > Environment: TELEGRAM_BOT_TOKEN (from @BotFather). The webhook URL is built from
// RENDER_EXTERNAL_URL, which Render sets by itself (or PUBLIC_API_URL when hosted elsewhere).
const crypto = require('crypto');
const db = require('../config/db');

let cachedUsername = null;

function botToken() {
  return (process.env.TELEGRAM_BOT_TOKEN || '').trim();
}

function isTelegramEnabled() {
  return Boolean(botToken());
}

// Telegram sends this value back in a header, so strangers cannot post fake updates.
function webhookSecret() {
  return crypto.createHash('sha256').update(`nanny-webhook:${botToken()}`).digest('hex').slice(0, 48);
}

async function callTelegram(method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${botToken()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!data.ok) throw new Error(`Telegram ${method} failed: ${data.description || response.status}`);
  return data.result;
}

async function getBotUsername() {
  if (cachedUsername) return cachedUsername;
  if (!isTelegramEnabled()) return null;
  const me = await callTelegram('getMe');
  cachedUsername = me.username;
  return cachedUsername;
}

async function sendTelegramMessage(chatId, text) {
  if (!isTelegramEnabled() || !chatId) return { skipped: true };
  return callTelegram('sendMessage', { chat_id: chatId, text: String(text).slice(0, 4000), disable_web_page_preview: true });
}

async function setupTelegramWebhook() {
  if (!isTelegramEnabled()) {
    console.log('[telegram] skipped: TELEGRAM_BOT_TOKEN is not set');
    return;
  }
  const base = (process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_API_URL || '').replace(/\/+$/, '');
  try {
    await getBotUsername();
    if (!base) {
      console.log('[telegram] bot ready, but no public URL for the webhook (set PUBLIC_API_URL)');
      return;
    }
    await callTelegram('setWebhook', {
      url: `${base}/api/telegram/webhook`,
      secret_token: webhookSecret(),
      allowed_updates: ['message'],
    });
    console.log(`[telegram] webhook set for @${cachedUsername}`);
  } catch (err) {
    console.error('[telegram] setup failed:', err.message);
  }
}

async function createLinkUrl(userId) {
  const username = await getBotUsername();
  const token = crypto.randomBytes(16).toString('hex');
  await db.query(
    `UPDATE users SET telegram_link_token = $2, telegram_link_expires = NOW() + INTERVAL '30 minutes' WHERE id = $1`,
    [userId, token]
  );
  return `https://t.me/${username}?start=${token}`;
}

const SITE_URL = () => (process.env.FRONTEND_URL || '').replace(/\/+$/, '');

// Handles messages people send to the bot.
async function handleUpdate(update) {
  const message = update?.message;
  const chatId = message?.chat?.id;
  const text = String(message?.text || '').trim();
  if (!chatId || !text) return;

  if (text.startsWith('/start')) {
    const token = text.split(/\s+/)[1];
    if (!token) {
      await sendTelegramMessage(chatId, 'Здравствуйте! Чтобы получать уведомления Nanny, откройте личный кабинет на сайте и нажмите «Подключить Telegram».');
      return;
    }
    const { rows } = await db.query(
      `UPDATE users
          SET telegram_chat_id = $2, telegram_link_token = NULL, telegram_link_expires = NULL
        WHERE telegram_link_token = $1 AND telegram_link_expires > NOW()
      RETURNING full_name`,
      [token, chatId]
    );
    if (!rows[0]) {
      await sendTelegramMessage(chatId, 'Ссылка устарела. Откройте личный кабинет Nanny и нажмите «Подключить Telegram» ещё раз.');
      return;
    }
    await sendTelegramMessage(chatId, `Готово, ${rows[0].full_name}! Теперь уведомления о бронированиях и сообщениях будут приходить сюда. Отключить: /stop`);
    return;
  }

  if (text === '/stop') {
    await db.query('UPDATE users SET telegram_chat_id = NULL WHERE telegram_chat_id = $1', [chatId]);
    await sendTelegramMessage(chatId, 'Уведомления отключены. Включить снова можно в личном кабинете Nanny.');
    return;
  }

  const site = SITE_URL();
  await sendTelegramMessage(chatId, `Этот бот только присылает уведомления. Ответить можно на сайте Nanny${site ? `: ${site}` : '.'}`);
}

module.exports = {
  isTelegramEnabled,
  webhookSecret,
  getBotUsername,
  sendTelegramMessage,
  setupTelegramWebhook,
  createLinkUrl,
  handleUpdate,
  SITE_URL,
};
