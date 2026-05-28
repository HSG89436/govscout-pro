// /api/chat  (v2 — session-authenticated, persistent chat history)
const { getDatabase } = require('@netlify/database');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

async function validateSession(token, sql) {
  if (!token) return null;
  const rows = await sql`
    SELECT u.id, u.email, u.role, u.subscription_status
    FROM user_sessions s JOIN users u ON s.user_id = u.id
    WHERE s.token = ${token} AND s.expires_at > NOW() LIMIT 1
  `;
  if (!rows.length) return null;
  await sql`UPDATE user_sessions SET last_used_at = NOW() WHERE token = ${token}`;
  return rows[0];
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

  try {
    const { sql } = getDatabase({ connectionString: process.env.APP_DB_URL });
    const method  = event.httpMethod;
    const getBody = () => { try { return JSON.parse(event.body || '{}'); } catch { return {}; } };

    const token = (event.headers['authorization'] || '').replace('Bearer ', '').trim();
    const user  = await validateSession(token, sql);
    if (!user) {
      return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Authentication required', auth: true }) };
    }

    if (method === 'GET') {
      const qs    = event.queryStringParameters || {};
      const limit = Math.min(parseInt(qs.limit || '30', 10), 100);
      const msgs  = await sql`
        SELECT role, content, created_at FROM chat_messages
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC LIMIT ${limit}
      `;
      msgs.reverse();
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ messages: msgs }) };
    }

    if (method === 'POST') {
      const body = getBody();
      const { role, content } = body;
      if (!role || !content) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'role and content required' }) };

      const trimmed = content.substring(0, 8000);
      await sql`INSERT INTO chat_messages (user_id, role, content, created_at) VALUES (${user.id}, ${role}, ${trimmed}, NOW())`;

      // Keep rolling 100-message history per user
      await sql`
        DELETE FROM chat_messages
        WHERE user_id = ${user.id}
          AND id NOT IN (
            SELECT id FROM chat_messages WHERE user_id = ${user.id}
            ORDER BY created_at DESC LIMIT 100
          )
      `;
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    if (method === 'DELETE') {
      // Clear chat history for this user
      await sql`DELETE FROM chat_messages WHERE user_id = ${user.id}`;
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    console.error('api-chat error:', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
