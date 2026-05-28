// /api/searches  (v2 — session-authenticated)
// GET: returns saved searches for authenticated user
// POST: saves a new search (server-side paywall enforced)
// DELETE: removes a saved search
const { getDatabase } = require('@netlify/database');

const FREE_SEARCH_LIMIT = 3;

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

    const token = (event.headers['authorization'] || '').replace('Bearer ', '').trim();
    const user  = await validateSession(token, sql);
    if (!user) {
      return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Authentication required', auth: true }) };
    }

    const isActive = user.role === 'admin' || user.subscription_status === 'active';

    if (event.httpMethod === 'GET') {
      const searches = await sql`
        SELECT * FROM saved_searches WHERE user_id = ${user.id} ORDER BY created_at DESC
      `;
      return { statusCode: 200, headers: CORS, body: JSON.stringify(searches) };
    }

    const body = JSON.parse(event.body || '{}');

    if (event.httpMethod === 'DELETE') {
      const { id } = body;
      if (!id) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Search ID required' }) };
      await sql`DELETE FROM saved_searches WHERE id = ${id} AND user_id = ${user.id}`;
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true }) };
    }

    if (event.httpMethod === 'POST') {
      const { name } = body;
      if (!name) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Search name required' }) };

      // Server-side paywall: enforce free tier limit
      if (!isActive) {
        const countResult = await sql`SELECT COUNT(*) as cnt FROM saved_searches WHERE user_id = ${user.id}`;
        const currentCount = parseInt(countResult[0]?.cnt || 0);
        if (currentCount >= FREE_SEARCH_LIMIT) {
          return {
            statusCode: 403,
            headers: CORS,
            body: JSON.stringify({
              error: `Free plan includes up to ${FREE_SEARCH_LIMIT} saved searches. Upgrade to GovScout Pro ($9/month) for unlimited searches.`,
              upgrade: true,
              limit: FREE_SEARCH_LIMIT,
              current: currentCount
            })
          };
        }
      }

      const toArray = val => {
        if (Array.isArray(val)) return val.filter(Boolean);
        if (typeof val === 'string' && val.trim()) return val.split(',').map(s => s.trim()).filter(Boolean);
        return null;
      };

      const naics     = toArray(body.naics);
      const keywords  = toArray(body.keywords);
      const setAsides = toArray(body.setaside || body.set_asides);
      const psc       = toArray(body.psc);
      const agencies  = toArray(body.agencies);

      const inserted = await sql`
        INSERT INTO saved_searches (user_id, name, naics, keywords, set_asides, psc, agencies, active)
        VALUES (${user.id}, ${name}, ${naics}, ${keywords}, ${setAsides}, ${psc}, ${agencies}, true)
        RETURNING *
      `;
      return { statusCode: 200, headers: CORS, body: JSON.stringify(inserted[0]) };
    }

    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    console.error('api-searches error:', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
