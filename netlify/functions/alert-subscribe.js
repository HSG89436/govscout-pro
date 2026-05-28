// alert-subscribe.js — Save or update alert subscriber in DB  (v3 CommonJS)
// GS-V6-001 fix: test-email action now requires authenticated active subscriber session.
// Rate limit: 3 test sends per subscriber per hour. Provider errors sanitized.
const { getDatabase } = require('@netlify/database');
const crypto = require('crypto');

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const SITE_URL        = process.env.SITE_URL || 'https://govscout.pro';
const TEST_RATE_LIMIT = 3;   // max test emails per subscriber per hour

// ── Session validation (same pattern as chat.js / api-chat.js) ──────────────
async function validateSession(token, sql) {
  if (!token) return null;
  try {
    const rows = await sql`
      SELECT u.id, u.email, u.role, u.subscription_status
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ${token} AND s.expires_at > NOW()
      LIMIT 1
    `;
    if (!rows.length) return null;
    await sql`UPDATE user_sessions SET last_used_at = NOW() WHERE token = ${token}`;
    return rows[0];
  } catch (e) {
    console.error('validateSession error:', e.message);
    return null;
  }
}

// ── Per-subscriber hourly rate limit for test email sends ───────────────────
async function checkTestRateLimit(userId, sql) {
  try {
    const rows = await sql`
      SELECT COUNT(*) AS cnt
      FROM alert_delivery_log
      WHERE subscriber_id = ${userId}
        AND is_test = TRUE
        AND created_at > NOW() - INTERVAL '1 hour'
    `;
    return parseInt(rows[0]?.cnt || 0) >= TEST_RATE_LIMIT;
  } catch (e) {
    // Fail open — don't block the user if the log query fails
    console.warn('test rate-limit check failed:', e.message);
    return false;
  }
}

// ── Build and send the test digest email ─────────────────────────────────────
async function sendTestEmail(toEmail, subscriberName) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error('RESEND_API_KEY not set');
    return { ok: false, logError: 'RESEND_API_KEY missing', clientError: 'Email service not configured.' };
  }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#05070f;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">
<div style="background:#0e1225;border:1px solid #1e2a42;border-radius:12px;overflow:hidden;">
<div style="background:linear-gradient(135deg,#0e1225,#131829);padding:28px 32px;border-bottom:1px solid #1e2a42;">
  <div style="font-size:20px;color:#f5a623;font-weight:700;letter-spacing:1px;">GOV<span style="color:#eef2ff;">SCOUT</span> PRO</div>
  <div style="color:#8a9cc8;font-size:13px;margin-top:4px;">Alert Email Verification</div>
</div>
<div style="padding:28px 32px;">
  <h1 style="color:#eef2ff;font-size:20px;margin:0 0 12px;">✅ Your email alerts are working!</h1>
  <p style="color:#8a9cc8;font-size:14px;line-height:1.6;margin:0 0 20px;">
    Hey ${subscriberName || 'Scout'} — this is a test message from GovScout Pro.
    Your daily contract digest will look like this, with real GO and TEAM matches
    from SAM.gov delivered every morning at 9am UTC.
  </p>
  <div style="background:#131829;border:1px solid #1e2a42;border-radius:8px;padding:20px;margin-bottom:16px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
      <span style="background:#166534;color:#4ade80;font-size:10px;font-weight:700;letter-spacing:1.5px;padding:4px 8px;border-radius:4px;">GO — CERT MATCH</span>
    </div>
    <div style="color:#eef2ff;font-size:15px;font-weight:600;margin-bottom:6px;">Sample: Telecommunications Infrastructure Support Services</div>
    <div style="color:#8a9cc8;font-size:12px;margin-bottom:4px;">Department of Veterans Affairs · VA Pittsburgh Healthcare System</div>
    <div style="color:#4a5a82;font-size:11px;">NAICS: 517311 · Set-Aside: SDVOSB</div>
    <div style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;">
      <span style="color:#4ade80;font-size:13px;font-weight:600;">Due: Jun 15, 2026</span>
      <a href="https://sam.gov/opp/SAMPLE/view" style="background:#f5a623;color:#05070f;font-size:12px;font-weight:700;padding:8px 16px;border-radius:6px;text-decoration:none;">View on SAM.gov →</a>
    </div>
  </div>
  <div style="background:#0a1020;border:1px solid #1e2a42;border-radius:6px;padding:14px 16px;margin-bottom:20px;">
    <div style="color:#8a9cc8;font-size:12px;line-height:1.6;">
      <strong style="color:#eef2ff;">Why this matches:</strong> SDVOSB set-aside aligns with your veteran certification.
      NAICS 517311 matches your registered capability codes. Due date allows 3+ weeks for proposal preparation.
    </div>
  </div>
  <div style="text-align:center;margin-top:24px;">
    <a href="${SITE_URL}/app" style="display:inline-block;background:#f5a623;color:#05070f;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;text-decoration:none;">Open GovScout Pro →</a>
  </div>
</div>
<div style="background:#090c18;padding:16px 32px;border-top:1px solid #1e2a42;text-align:center;">
  <p style="color:#4a5a82;font-size:12px;margin:0;">GovScout Pro · govscout.pro · <a href="${SITE_URL}/app" style="color:#8a9cc8;">Manage Alerts</a></p>
</div>
</div></div></body></html>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'GovScout Pro <alerts@govscout.pro>',
        to: [toEmail],
        subject: '✅ GovScout Pro — Alert Email Verified',
        html
      })
    });
    if (res.ok) {
      const resData = await res.json().catch(() => ({}));
      return { ok: true, messageId: resData.id };
    }
    // Log full error internally, return generic message to client
    const errBody = await res.text().catch(() => '');
    console.error(`Resend test email failed HTTP ${res.status} for ${toEmail}:`, errBody.slice(0, 500));
    return {
      ok: false,
      logError: `Resend HTTP ${res.status}`,
      clientError: 'Email delivery failed. Check your address and try again.'
    };
  } catch (e) {
    console.error('sendTestEmail network error:', e.message);
    return { ok: false, logError: e.message, clientError: 'Network error. Please try again.' };
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  const action = (event.queryStringParameters || {}).action || '';

  // ── TEST EMAIL — GS-V6-001 fix ────────────────────────────────────────────
  // Requires valid Bearer session token with active subscription.
  // Rate-limited to 3 sends per subscriber per hour.
  // Provider errors are logged server-side but never exposed to the client.
  if (action === 'test-email') {
    // Auth gate
    const authHeader = event.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: 'Authentication required.' }) };
    }

    const { sql } = getDatabase({ connectionString: process.env.APP_DB_URL });
    const user = await validateSession(token, sql);

    if (!user) {
      return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: 'Session invalid or expired.' }) };
    }
    if (user.subscription_status !== 'active' && user.role !== 'admin') {
      return { statusCode: 403, headers: HEADERS, body: JSON.stringify({ error: 'Active subscription required to send test alerts.' }) };
    }

    // Rate limit
    const limited = await checkTestRateLimit(user.id, sql);
    if (limited) {
      return {
        statusCode: 429,
        headers: { ...HEADERS, 'Retry-After': '3600' },
        body: JSON.stringify({ error: `Test limit reached. You can send up to ${TEST_RATE_LIMIT} test emails per hour.` })
      };
    }

    let body;
    try { body = JSON.parse(event.body || '{}'); } catch { body = {}; }
    const accountEmail = (user.email || '').toLowerCase().trim();
    const requestedEmail = (body.email || accountEmail).toLowerCase().trim();
    if (requestedEmail !== accountEmail) {
      return {
        statusCode: 403,
        headers: HEADERS,
        body: JSON.stringify({ error: 'Test alerts can only be sent to your account email.' })
      };
    }
    const targetEmail = accountEmail;
    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Valid email required.' }) };
    }

    const result = await sendTestEmail(targetEmail, user.name || '');

    // Log the test delivery attempt (is_test = true)
    try {
      await sql`
        INSERT INTO alert_delivery_log (subscriber_id, subscriber_email, channel, status, leads_count, error_message, is_test)
        VALUES (${user.id}, ${targetEmail}, 'email',
                ${result.ok ? 'sent' : 'failed'}, 0,
                ${result.logError || null}, TRUE)
      `;
    } catch (e) {
      console.warn('test delivery log failed:', e.message);
    }

    if (result.ok) {
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true }) };
    }
    // Return generic client error — never expose raw provider message
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ ok: false, error: result.clientError }) };
  }

  // ── SUBSCRIBE / UPDATE alert preferences ─────────────────────────────────
  try {
    const body = JSON.parse(event.body || '{}');
    const { name, email: requestedEmail, keywords, naics, certifications, samApiKey, telegramChatId, frequency, minScore } = body;
    const { sql } = getDatabase({ connectionString: process.env.APP_DB_URL });
    const authHeader = event.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const user = await validateSession(token, sql);
    if (!user) {
      return { statusCode: 401, headers: HEADERS, body: JSON.stringify({ error: 'Authentication required.' }) };
    }
    if (user.subscription_status !== 'active' && user.role !== 'admin') {
      return { statusCode: 403, headers: HEADERS, body: JSON.stringify({ error: 'Active subscription required to manage alerts.' }) };
    }
    const email = (user.email || '').toLowerCase().trim();
    if (requestedEmail && requestedEmail.toLowerCase().trim() !== email) {
      return { statusCode: 403, headers: HEADERS, body: JSON.stringify({ error: 'Alerts can only be delivered to your account email.' }) };
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Valid email required' }) };
    }

    const resolvedSamKey = (samApiKey && samApiKey.trim()) || process.env.SAM_GOV_API_KEY || '';
    const unsubToken  = crypto.randomBytes(24).toString('hex');
    const normalEmail = email.toLowerCase().trim();

    const existing = await sql`SELECT id FROM alert_subscribers WHERE email = ${normalEmail}`;

    if (existing.length > 0) {
      await sql`
        UPDATE alert_subscribers SET
          name              = ${name || ''},
          keywords          = ${Array.isArray(keywords) ? keywords.join(',') : (keywords || '')},
          naics_codes       = ${Array.isArray(naics) ? naics.join(',') : (naics || '')},
          certifications    = ${Array.isArray(certifications) ? certifications.join(',') : (certifications || '')},
          sam_api_key       = ${resolvedSamKey},
          telegram_chat_id  = ${telegramChatId || null},
          frequency         = ${frequency || 'daily'},
          min_score         = ${minScore || 'TEAM'},
          active            = TRUE,
          updated_at        = NOW()
        WHERE email = ${normalEmail}
      `;
    } else {
      await sql`
        INSERT INTO alert_subscribers
          (email, name, keywords, naics_codes, certifications, sam_api_key, telegram_chat_id, frequency, min_score, active, unsubscribe_token)
        VALUES
          (${normalEmail}, ${name || ''}, ${Array.isArray(keywords) ? keywords.join(',') : (keywords || '')},
           ${Array.isArray(naics) ? naics.join(',') : (naics || '')},
           ${Array.isArray(certifications) ? certifications.join(',') : (certifications || '')},
           ${resolvedSamKey}, ${telegramChatId || null}, ${frequency || 'daily'},
           ${minScore || 'TEAM'}, TRUE, ${unsubToken})
      `;
    }

    if (telegramChatId && process.env.TELEGRAM_BOT_TOKEN) {
      try {
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: `✅ *GovScout Pro Alerts — Activated!*\n\nHey ${name || 'there'}! Marcus has your back.\n\nYou'll get daily contract leads every morning at 9am UTC.\n\n_govscout.pro_`,
            parse_mode: 'Markdown',
            disable_web_page_preview: true
          })
        });
      } catch (e) { /* non-blocking */ }
    }

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, success: true, message: "Alerts activated! You'll receive daily contract matches." }) };
  } catch (e) {
    console.error('alert-subscribe error:', e);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'Server error' }) };
  }
};
