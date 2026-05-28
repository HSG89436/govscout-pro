// /api/profile  (v2 — session-authenticated)
// GET: returns profile for authenticated user
// POST: saves/updates profile for authenticated user
// Accepts both canonical field names and legacy frontend shorthand.

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

    const token = (event.headers['authorization'] || '').replace('Bearer ', '').trim();
    const user  = await validateSession(token, sql);
    if (!user) {
      return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Authentication required', auth: true }) };
    }

    if (event.httpMethod === 'GET') {
      const profiles = await sql`SELECT * FROM business_profiles WHERE user_id = ${user.id} LIMIT 1`;
      const p = profiles[0] || null;
      if (p) { const safe = {...p}; delete safe.sam_api_key; safe.has_sam_key = !!(p.sam_api_key?.trim()); return { statusCode: 200, headers: CORS, body: JSON.stringify(safe) }; }
      return { statusCode: 200, headers: CORS, body: JSON.stringify(null) };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');

      // Accept BOTH canonical API fields AND legacy frontend field names
      const businessName  = body.business_name    || body.name  || null;
      const description   = body.plain_english_description || body.desc || null;
      const uei           = body.uei          || null;
      const cage          = body.cage         || null;
      const location      = body.state        || body.location  || null;
      const teamSize      = body.employees    || body.team_size || null;
      const experience    = body.experience   || null;
      const pastPerf      = body.past         || body.past_performance || null;
      const goals         = body.caps         || body.goals     || null;
      const samApiKey     = body.samKey       || body.sam_api_key || null;
      const telegramChatId = body.telegramChatId || body.telegram_chat_id || null;

      let naics = body.naics || null;
      if (typeof naics === 'string' && naics.trim()) naics = naics.split(',').map(s => s.trim()).filter(Boolean);
      else if (!Array.isArray(naics)) naics = null;

      let certs = body.certs || body.certifications || null;
      if (typeof certs === 'string' && certs.trim()) certs = certs.split(',').map(s => s.trim()).filter(Boolean);
      else if (!Array.isArray(certs)) certs = null;

      const checkFields = [businessName, description, naics, certs, uei];
      const filled      = checkFields.filter(f => Array.isArray(f) ? f.length > 0 : f && String(f).trim().length > 0).length;
      const profileCompletion = Math.round((filled / checkFields.length) * 100);

      const existing = await sql`SELECT id FROM business_profiles WHERE user_id = ${user.id} LIMIT 1`;
      let result;
      if (existing.length > 0) {
        result = await sql`
          UPDATE business_profiles SET
            business_name             = COALESCE(${businessName}, business_name),
            plain_english_description = COALESCE(${description}, plain_english_description),
            naics                     = COALESCE(${naics}, naics),
            certifications            = COALESCE(${certs}, certifications),
            uei                       = COALESCE(${uei}, uei),
            cage                      = COALESCE(${cage}, cage),
            location                  = COALESCE(${location}, location),
            team_size                 = COALESCE(${teamSize}, team_size),
            experience                = COALESCE(${experience}, experience),
            past_performance          = COALESCE(${pastPerf}, past_performance),
            goals                     = COALESCE(${goals}, goals),
            sam_api_key               = COALESCE(${samApiKey}, sam_api_key),
            telegram_chat_id          = COALESCE(${telegramChatId}, telegram_chat_id),
            profile_completion        = ${profileCompletion},
            updated_at                = now()
          WHERE user_id = ${user.id}
          RETURNING *
        `;
      } else {
        result = await sql`
          INSERT INTO business_profiles (
            user_id, business_name, plain_english_description,
            naics, certifications, uei, cage,
            location, team_size, experience, past_performance,
            goals, sam_api_key, telegram_chat_id, profile_completion
          ) VALUES (
            ${user.id}, ${businessName}, ${description},
            ${naics}, ${certs}, ${uei}, ${cage},
            ${location}, ${teamSize}, ${experience}, ${pastPerf},
            ${goals}, ${samApiKey}, ${telegramChatId}, ${profileCompletion}
          )
          RETURNING *
        `;
      }

      const saved = result[0];
      const safe  = { ...saved };
      delete safe.sam_api_key;
      safe.has_sam_key = !!(saved.sam_api_key?.trim());
      return { statusCode: 200, headers: CORS, body: JSON.stringify(safe) };
    }

    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    console.error('api-profile error:', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Server error saving profile' }) };
  }
};
