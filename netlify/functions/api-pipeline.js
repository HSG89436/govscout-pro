// /api/pipeline  (v2 — session-authenticated)
// GET: returns pipeline items for authenticated user
// POST: adds a contract to pipeline (with server-side dedup + paywall)
// PATCH: updates pipeline stage
// DELETE: removes a pipeline item
const { getDatabase } = require('@netlify/database');

const FREE_PIPELINE_LIMIT = 5;

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

    const isActive = user.role === 'admin' || user.subscription_status === 'active';

    if (method === 'GET') {
      const items = await sql`
        SELECT id, sam_notice_id, title, agency, deadline, naics_code, stage, notes, created_at, updated_at
        FROM pipeline_items WHERE user_id = ${user.id} ORDER BY created_at DESC
      `;
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ items }) };
    }

    if (method === 'POST') {
      const body = getBody();
      const { samNoticeId, title, agency, deadline, stage } = body;
      // Accept 'naics' OR 'naicsCode' — backward-compatible
      const resolvedNaicsCode = body.naicsCode || body.naics_code || body.naics || null;

      if (!title) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'title required' }) };

      // Server-side paywall: enforce free tier limit
      if (!isActive) {
        const countResult = await sql`SELECT COUNT(*) as cnt FROM pipeline_items WHERE user_id = ${user.id}`;
        const currentCount = parseInt(countResult[0]?.cnt || 0);
        if (currentCount >= FREE_PIPELINE_LIMIT) {
          return {
            statusCode: 403,
            headers: CORS,
            body: JSON.stringify({
              error: `Free plan includes up to ${FREE_PIPELINE_LIMIT} pipeline items. Upgrade to GovScout Pro ($9/month) for unlimited tracking.`,
              upgrade: true,
              limit: FREE_PIPELINE_LIMIT,
              current: currentCount
            })
          };
        }
      }

      const itemStage = stage || 'watching';
      let result;
      if (samNoticeId) {
        result = await sql`
          INSERT INTO pipeline_items (user_id, sam_notice_id, title, agency, deadline, naics_code, stage, created_at, updated_at)
          VALUES (${user.id}, ${samNoticeId}, ${title}, ${agency||null}, ${deadline||null}, ${resolvedNaicsCode}, ${itemStage}, NOW(), NOW())
          ON CONFLICT (user_id, sam_notice_id) WHERE sam_notice_id IS NOT NULL DO UPDATE SET
            stage = pipeline_items.stage, updated_at = NOW()
          RETURNING id, stage, sam_notice_id, naics_code
        `;
      } else {
        result = await sql`
          INSERT INTO pipeline_items (user_id, title, agency, deadline, naics_code, stage, created_at, updated_at)
          VALUES (${user.id}, ${title}, ${agency||null}, ${deadline||null}, ${resolvedNaicsCode}, ${itemStage}, NOW(), NOW())
          RETURNING id, stage, naics_code
        `;
      }
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, item: result[0] }) };
    }

    if (method === 'PATCH') {
      const body = getBody();
      const { samNoticeId, itemId, stage, notes } = body;
      if (!stage && notes === undefined) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'stage or notes required' }) };
      if (stage) {
        const validStages = ['watching', 'pursuing', 'submitted', 'won', 'lost'];
        if (!validStages.includes(stage)) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'invalid stage' }) };
      }
      if (samNoticeId) {
        if (stage) await sql`UPDATE pipeline_items SET stage = ${stage}, updated_at = NOW() WHERE user_id = ${user.id} AND sam_notice_id = ${samNoticeId}`;
        if (notes !== undefined) await sql`UPDATE pipeline_items SET notes = ${notes}, updated_at = NOW() WHERE user_id = ${user.id} AND sam_notice_id = ${samNoticeId}`;
      } else if (itemId) {
        if (stage) await sql`UPDATE pipeline_items SET stage = ${stage}, updated_at = NOW() WHERE id = ${itemId} AND user_id = ${user.id}`;
        if (notes !== undefined) await sql`UPDATE pipeline_items SET notes = ${notes}, updated_at = NOW() WHERE id = ${itemId} AND user_id = ${user.id}`;
      } else {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'samNoticeId or itemId required' }) };
      }
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    if (method === 'DELETE') {
      const body = getBody();
      const { samNoticeId, itemId } = body;
      if (samNoticeId) {
        await sql`DELETE FROM pipeline_items WHERE user_id = ${user.id} AND sam_notice_id = ${samNoticeId}`;
      } else if (itemId) {
        await sql`DELETE FROM pipeline_items WHERE id = ${itemId} AND user_id = ${user.id}`;
      } else {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'samNoticeId or itemId required' }) };
      }
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    console.error('api-pipeline error:', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
