// /api/samgov  (v1 CommonJS)
// Server-side proxy for SAM.gov contract search — avoids browser CORS issues.
// Validates session, reads user's stored API key, and calls SAM.gov server-side.
// Returns structured contract data with clear, actionable error messages.

const { getDatabase } = require('@netlify/database');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// Validate session token — returns user row or null
async function validateSession(token, sql) {
  if (!token) return null;
  const rows = await sql`
    SELECT u.id, u.email, u.role, u.subscription_status
    FROM user_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ${token}
      AND s.expires_at > NOW()
    LIMIT 1
  `;
  if (!rows.length) return null;
  // Update last_used_at
  await sql`UPDATE user_sessions SET last_used_at = NOW() WHERE token = ${token}`;
  return rows[0];
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'GET only' }) };

  const { sql } = getDatabase({ connectionString: process.env.APP_DB_URL });

  // Validate session
  const token = (event.headers['authorization'] || '').replace('Bearer ', '').trim();
  const user = await validateSession(token, sql);
  if (!user) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Authentication required', auth: true }) };
  }

  const accessAllowed = user.role === 'admin' || user.subscription_status === 'active';
  if (!accessAllowed) {
    return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'Active subscription required', upgrade: true }) };
  }

  const qs = event.queryStringParameters || {};
  const naicsCode = (qs.naics || '541519').replace(/[^0-9,]/g, '').split(',')[0];
  const daysBack  = Math.min(parseInt(qs.days || '90', 10), 180);
  const limit     = Math.min(parseInt(qs.limit || '15', 10), 25);
  const keyword   = (qs.keyword || '').trim().substring(0, 100);
  const setAside  = (qs.setaside || '').trim();

  // Get user's SAM.gov API key from profile
  const profiles = await sql`SELECT sam_api_key FROM business_profiles WHERE user_id = ${user.id} LIMIT 1`;
  const userKey  = profiles[0]?.sam_api_key?.trim() || '';
  const apiKey = userKey || process.env.SAM_GOV_API_KEY || '';
  if (!apiKey) {
    return {
      statusCode: 503,
      headers: CORS,
      body: JSON.stringify({
        error: 'SAM.gov search is not configured',
        detail: 'Add your SAM.gov API key in Business Profile to search live opportunities.'
      })
    };
  }
  const usingAccountKey = Boolean(userKey);

  // Build SAM.gov URL
  const today    = new Date();
  const fromDate = new Date(today); fromDate.setDate(today.getDate() - daysBack);
  const fmt      = d => `${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}/${d.getFullYear()}`;

  const params = new URLSearchParams({
    api_key: apiKey,
    limit: String(limit),
    offset: '0',
    postedFrom: fmt(fromDate),
    postedTo: fmt(today),
    ncode: naicsCode
  });
  if (setAside) params.set('typeOfSetAside', setAside);
  if (keyword) params.set('title', keyword);
  const samUrl = `https://api.sam.gov/opportunities/v2/search?${params}`;

  try {
    const samRes = await fetch(samUrl, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'GovScoutPro/5.9' }
    });

    // The SAM.gov API documents 404 as a valid no-results response.
    if (samRes.status === 404) {
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({
          ok: true,
          count: 0,
          totalCount: 0,
          opportunities: [],
          usingAccountKey,
          naicsSearched: naicsCode,
          daysBack
        })
      };
    }

    // Map failure status codes to human-readable messages
    if (!samRes.ok) {
      let msg, detail;
      if      (samRes.status === 429) { msg = 'SAM.gov rate limit reached'; detail = usingAccountKey ? 'Your API key has hit SAM.gov rate limits. Try again later.' : 'The shared SAM.gov search limit has been reached. Add your personal SAM.gov API key in Business Profile or try again later.'; }
      else if (samRes.status === 403) { msg = 'SAM.gov API key invalid';    detail = 'Your saved API key was rejected. Update it in Business Profile → SAM.gov API Key.'; }
      else if (samRes.status === 401) { msg = 'SAM.gov API key unauthorized'; detail = 'Your key has expired or was revoked. Get a new one at sam.gov/profile.'; }
      else if (samRes.status === 400) { msg = 'Invalid search parameters';  detail = `SAM.gov returned: bad request (check NAICS code ${naicsCode}).`; }
      else { let errText = ''; try { errText = (await samRes.text()).substring(0, 200); } catch {} msg = `SAM.gov HTTP ${samRes.status}`; detail = errText || 'Unexpected SAM.gov response.'; }

      return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: msg, detail, usingAccountKey }) };
    }

    const data = await samRes.json();
    const opportunities = (data.opportunitiesData || []).map(o => ({
      noticeId:          o.noticeId           || '',
      solicitationNumber:o.solicitationNumber || '',
      title:             o.title              || 'Untitled',
      agency:            (o.fullParentPathName || '').split('::')[0] || o.organizationHierarchy?.[0]?.name || '',
      office:            (o.fullParentPathName || '').split('::').pop() || '',
      naicsCode:         o.naicsCode          || '',
      type:              o.type               || '',
      setAside:          o.typeOfSetAsideDescription || o.typeOfSetAside || '',
      deadline:          o.responseDeadLine   || o.archiveDate || '',
      postedDate:        o.postedDate         || '',
      uiLink:            o.uiLink             || `https://sam.gov/opp/${o.noticeId}/view`,
      description:       (o.description || '').substring(0, 500),
      placeOfPerformance:o.placeOfPerformance?.state?.name || ''
    }));

    return {
      statusCode: 200, headers: CORS,
      body: JSON.stringify({
        ok: true,
        count: opportunities.length,
        totalCount: data.totalRecords || opportunities.length,
        opportunities,
        usingAccountKey,
        naicsSearched: naicsCode,
        daysBack
      })
    };
  } catch (e) {
    console.error('api-samgov fetch error:', e);
    const isNetwork = e.message?.includes('fetch') || e.message?.includes('network') || e.message?.includes('ENOTFOUND');
    return {
      statusCode: 503, headers: CORS,
      body: JSON.stringify({
        error: isNetwork ? 'Cannot reach SAM.gov from server' : 'SAM.gov proxy error',
        detail: isNetwork
          ? 'The server cannot connect to api.sam.gov right now. Check Netlify function network access or try again in a moment.'
          : e.message,
        usingAccountKey
      })
    };
  }
};
