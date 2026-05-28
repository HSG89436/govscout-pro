// /api/tasks - session-authenticated pipeline tasks
const { getDatabase } = require('@netlify/database');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

async function validateSession(token, sql) {
  if (!token) return null;
  const rows = await sql`
    SELECT u.id FROM user_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ${token} AND s.expires_at > NOW() LIMIT 1
  `;
  if (!rows.length) return null;
  await sql`UPDATE user_sessions SET last_used_at = NOW() WHERE token = ${token}`;
  return rows[0];
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  const { sql } = getDatabase({ connectionString: process.env.APP_DB_URL });
  const token = (event.headers['authorization'] || '').replace('Bearer ', '').trim();
  const user = await validateSession(token, sql);
  if (!user) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Authentication required', auth: true }) };
  }

  const qs = event.queryStringParameters || {};
  const getBody = () => { try { return JSON.parse(event.body || '{}'); } catch { return {}; } };
  const getPipelineItemId = async (samNoticeId) => {
    const rows = await sql`SELECT id FROM pipeline_items WHERE user_id = ${user.id} AND sam_notice_id = ${samNoticeId} LIMIT 1`;
    return rows.length ? rows[0].id : null;
  };

  try {
    if (event.httpMethod === 'GET') {
      const samNoticeId = qs.samNoticeId;
      if (!samNoticeId) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'samNoticeId required' }) };
      const itemId = await getPipelineItemId(samNoticeId);
      if (!itemId) return { statusCode: 200, headers: CORS, body: JSON.stringify({ tasks: [] }) };
      const tasks = await sql`
        SELECT id, title, status, priority, due_at, source, created_at
        FROM pipeline_tasks WHERE pipeline_item_id = ${itemId} ORDER BY created_at ASC
      `;
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ tasks }) };
    }

    if (event.httpMethod === 'POST') {
      const { samNoticeId, title, priority, source } = getBody();
      if (!samNoticeId || !title) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'samNoticeId and title required' }) };
      const itemId = await getPipelineItemId(samNoticeId);
      if (!itemId) return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'pipeline item not found' }) };
      const result = await sql`
        INSERT INTO pipeline_tasks (pipeline_item_id, title, priority, source, status, created_at)
        VALUES (${itemId}, ${title}, ${priority || 'normal'}, ${source || 'manual'}, 'open', NOW())
        RETURNING id, title, status, priority, source, created_at
      `;
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, task: result[0] }) };
    }

    if (event.httpMethod === 'PATCH') {
      const { taskId, status } = getBody();
      const valid = ['open', 'done', 'in_progress', 'blocked'];
      if (!taskId || !valid.includes(status)) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'valid taskId and status required' }) };
      await sql`
        UPDATE pipeline_tasks SET status = ${status}
        WHERE id = ${taskId}
          AND pipeline_item_id IN (SELECT id FROM pipeline_items WHERE user_id = ${user.id})
      `;
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    if (event.httpMethod === 'DELETE') {
      const { taskId } = getBody();
      if (!taskId) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'taskId required' }) };
      await sql`
        DELETE FROM pipeline_tasks
        WHERE id = ${taskId}
          AND pipeline_item_id IN (SELECT id FROM pipeline_items WHERE user_id = ${user.id})
      `;
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Task operation failed' }) };
  }

  return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
};
