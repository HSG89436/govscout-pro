// /api/me  (v2 — session-authenticated)
// Requires valid session token in Authorization: Bearer header.
// Returns user profile, alert prefs, and access state.
// Recomputes profile_completion dynamically.

const { getDatabase } = require('@netlify/database');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

function computeCompletion(p) {
  if (!p) return 0;
  const checkFields = [p.business_name, p.plain_english_description, p.naics, p.certifications, p.uei];
  const filled = checkFields.filter(f => {
    if (Array.isArray(f)) return f.length > 0;
    return f && String(f).trim().length > 0;
  }).length;
  return Math.round((filled / checkFields.length) * 100);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

  try {
    const { sql } = getDatabase({ connectionString: process.env.APP_DB_URL });

    // --- Session validation ---
    const token = (event.headers['authorization'] || '').replace('Bearer ', '').trim();
    if (!token) {
      return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Authentication required', auth: true }) };
    }

    const sessions = await sql`
      SELECT u.id, u.email, u.subscription_status, u.role, u.email_verified
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ${token} AND s.expires_at > NOW()
      LIMIT 1
    `;
    if (!sessions.length) {
      return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Session expired. Please log in again.', auth: true }) };
    }

    await sql`UPDATE user_sessions SET last_used_at = NOW() WHERE token = ${token}`;
    const user = sessions[0];

    // Get or create profile
    let profiles = await sql`SELECT * FROM business_profiles WHERE user_id = ${user.id} LIMIT 1`;
    let profile;
    if (profiles.length === 0) {
      const created = await sql`
        INSERT INTO business_profiles (user_id, profile_completion)
        VALUES (${user.id}, 0) RETURNING *
      `;
      profile = created[0];
    } else {
      profile = profiles[0];
    }

    // Recompute completion dynamically
    const computedCompletion = computeCompletion(profile);
    if (profile.profile_completion !== computedCompletion) {
      await sql`UPDATE business_profiles SET profile_completion = ${computedCompletion}, updated_at = now() WHERE id = ${profile.id}`;
      profile.profile_completion = computedCompletion;
    }

    // Never return the raw SAM API key to the client — only return whether one is set
    const safeProfile = { ...profile };
    const hasSamKey = !!(safeProfile.sam_api_key && safeProfile.sam_api_key.trim());
    delete safeProfile.sam_api_key;
    safeProfile.has_sam_key = hasSamKey;

    const alertPrefs = await sql`SELECT * FROM alert_preferences WHERE user_id = ${user.id} LIMIT 1`;
    const taskCount  = await sql`
      SELECT COUNT(*) as cnt FROM pipeline_tasks pt
      JOIN pipeline_items pi ON pt.pipeline_item_id = pi.id
      WHERE pi.user_id = ${user.id} AND pt.status = 'open'
    `;

    return {
      statusCode: 200, headers: CORS,
      body: JSON.stringify({
        user: { id: user.id, email: user.email, subscription_status: user.subscription_status, role: user.role, email_verified: !!user.email_verified },
        profile: safeProfile,
        alertPrefs: alertPrefs[0] || null,
        openTaskCount: parseInt(taskCount[0]?.cnt || 0),
        access_allowed: user.role === 'admin' || user.subscription_status === 'active'
      })
    };
  } catch (err) {
    console.error('api-me error:', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Server error' }) };
  }
};
