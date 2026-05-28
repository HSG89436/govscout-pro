// /api/documents - session-authenticated document analysis history
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

  const getBody = () => { try { return JSON.parse(event.body || '{}'); } catch { return {}; } };
  try {
    if (event.httpMethod === 'GET') {
      const docs = await sql`
        SELECT id, filename, file_type, extracted_text, uploaded_at
        FROM documents WHERE user_id = ${user.id}
        ORDER BY uploaded_at DESC LIMIT 20
      `;
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ documents: docs }) };
    }

    if (event.httpMethod === 'POST') {
      const { filename, analysisType, analysisResult } = getBody();
      if (!filename) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'filename required' }) };
      const fileType = analysisType || 'full';
      const extractedText = analysisResult ? analysisResult.substring(0, 50000) : null;
      const result = await sql`
        INSERT INTO documents (user_id, filename, file_type, extracted_text, uploaded_at)
        VALUES (${user.id}, ${filename}, ${fileType}, ${extractedText}, NOW())
        RETURNING id, filename, file_type, uploaded_at
      `;
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, document: result[0] }) };
    }
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Document operation failed' }) };
  }

  return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
};
