// alert-push.js — Push a message from Marcus to user's Telegram  (v2)
// Requires a valid session token (Authorization: Bearer <token>).
// The chatId in the request must match the telegram_chat_id stored for the
// authenticated user — prevents one user pushing to another user's Telegram.

const { getDatabase } = require('@netlify/database');

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  // ── Auth: validate session token ─────────────────────────────────────────
  const authHeader = event.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token) {
    return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'Authentication required' }) };
  }

  const { sql } = getDatabase({ connectionString: process.env.APP_DB_URL });
  let sessionUser;
  try {
    const rows = await sql`
      SELECT u.id, u.email, u.role, a.telegram_chat_id
      FROM user_sessions s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN alert_subscribers a ON a.email = u.email AND a.active = TRUE
      WHERE s.token = ${token} AND s.expires_at > NOW()
      LIMIT 1
    `;
    if (!rows.length) {
      return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'Session expired or invalid', auth: true }) };
    }
    sessionUser = rows[0];
  } catch (e) {
    console.error('alert-push session check error:', e);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'Auth check failed' }) };
  }

  // ── Telegram bot token ────────────────────────────────────────────────────
  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!tgToken) {
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'Telegram bot not configured. Add TELEGRAM_BOT_TOKEN in Netlify env vars.' }) };
  }

  try {
    const { chatId, message, parseMode } = JSON.parse(event.body || '{}');
    if (!chatId || !message) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ ok: false, error: 'chatId and message are required' }) };
    }

    // Security: chatId must match the one registered for this user
    // Admins can push to any chatId (for testing)
    const chatIdStr    = String(chatId);
    const storedChatId = sessionUser.telegram_chat_id ? String(sessionUser.telegram_chat_id) : null;

    if (sessionUser.role !== 'admin' && (!storedChatId || chatIdStr !== storedChatId)) {
      return {
        statusCode: 403, headers: HEADERS,
        body: JSON.stringify({ ok: false, error: 'chatId does not match your registered Telegram account' })
      };
    }

    const text = message.length > 4000
      ? message.substring(0, 3990) + '…\n\n_[truncated — see govscout.pro for full response]_'
      : message;

    const tgRes  = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode || 'Markdown', disable_web_page_preview: true })
    });
    const tgData = await tgRes.json();

    if (tgData.ok) {
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true }) };
    }
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: false, error: tgData.description || 'Telegram API error' }) };
  } catch (e) {
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: e.message }) };
  }
};
