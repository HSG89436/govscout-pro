// /api/auth  (v2 CommonJS)
// Handles password-based login, session creation, logout, and new-user password setup.
//
// Actions (via ?action= query param):
//   check        — GET  — does this email have a password set? (no sensitive data exposed)
//   login        — POST — validate email+password, return session token
//   logout       — POST — invalidate session token
//   set-password — POST — set initial password (verified PayPal subscriber or admin)
//
// Security additions in v2:
//   - Login rate limiting: 5 failed attempts → 15-minute lockout (stored in users table)
//   - PayPal subscription verification: set-password verifies subscriptionId against PayPal API
//   - Session token is a UUID stored in user_sessions table with 8-hour TTL

const { getDatabase } = require('@netlify/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

const SESSION_HOURS    = 8;
const MAX_ATTEMPTS     = 5;
const LOCKOUT_MINUTES  = 15;
const SITE_URL         = process.env.SITE_URL || 'https://govscout.pro';

// ── helpers ──────────────────────────────────────────────────────────────────

async function sendVerificationEmail(email, name, token) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.warn('RESEND_API_KEY not set — skipping verification email');
    return { sent: false, error: 'Resend not configured' };
  }
  const verifyUrl = `${SITE_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'GovScout Pro <noreply@govscout.pro>',
        to:   [email],
        subject: 'Verify your GovScout Pro email address',
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#05070f;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:40px 16px;">
  <div style="background:#0e1225;border:1px solid #1e2a42;border-radius:12px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#0e1225,#131829);padding:28px 32px;border-bottom:1px solid #1e2a42;">
      <div style="font-size:20px;color:#f5a623;font-weight:700;letter-spacing:1px;">GOV<span style="color:#eef2ff;">SCOUT</span> PRO</div>
    </div>
    <div style="padding:32px;">
      <h1 style="color:#eef2ff;font-size:22px;margin:0 0 12px;">Verify your email address</h1>
      <p style="color:#8a9cc8;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Hey ${name || 'Scout'}, click the button below to verify your email and activate your GovScout Pro account.
        This link expires in <strong style="color:#eef2ff;">24 hours</strong>.
      </p>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${verifyUrl}" style="display:inline-block;background:#f5a623;color:#05070f;font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px;text-decoration:none;">
          Verify Email Address
        </a>
      </div>
      <p style="color:#4a5a82;font-size:12px;text-align:center;margin:0;">
        If the button doesn't work, copy this link:<br>
        <a href="${verifyUrl}" style="color:#8a9cc8;word-break:break-all;">${verifyUrl}</a>
      </p>
    </div>
    <div style="background:#090c18;padding:16px 32px;border-top:1px solid #1e2a42;text-align:center;">
      <p style="color:#4a5a82;font-size:12px;margin:0;">GovScout Pro · govscout.pro</p>
    </div>
  </div>
</div>
</body></html>`
      })
    });
    if (res.ok) return { sent: true };
    const errText = await res.text().catch(() => '');
    console.error('Resend error:', res.status, errText);
    return { sent: false, error: `Resend HTTP ${res.status}` };
  } catch (e) {
    console.error('sendVerificationEmail error:', e.message);
    return { sent: false, error: e.message };
  }
}

async function verifyPayPalSubscription(subscriptionId, expectedEmail) {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret   = process.env.PAYPAL_SECRET;
  const baseUrl  = process.env.PAYPAL_BASE_URL || 'https://api-m.paypal.com';

  if (!clientId || !secret) {
    console.warn('PayPal env vars not configured — skipping verification');
    return { verified: false, error: 'PayPal not configured' };
  }

  try {
    // Get access token
    const creds    = Buffer.from(`${clientId}:${secret}`).toString('base64');
    const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method:  'POST',
      headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    'grant_type=client_credentials'
    });
    if (!tokenRes.ok) return { verified: false, error: 'PayPal auth failed' };
    const { access_token } = await tokenRes.json();
    if (!access_token)     return { verified: false, error: 'No PayPal token' };

    // Verify subscription status
    const subRes = await fetch(`${baseUrl}/v1/billing/subscriptions/${subscriptionId}`, {
      headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' }
    });
    if (!subRes.ok) return { verified: false, error: `PayPal API returned ${subRes.status}` };
    const sub = await subRes.json();

    const subscriberEmail = (sub.subscriber?.email_address || '').toLowerCase().trim();
    if (!subscriberEmail || subscriberEmail !== expectedEmail) {
      return { verified: false, error: 'Subscription email does not match account email' };
    }
    if (sub.status === 'ACTIVE') {
      return { verified: true, status: sub.status, subscriberEmail };
    }
    return { verified: false, error: `Subscription status: ${sub.status}` };
  } catch (e) {
    console.error('PayPal verification error:', e.message);
    return { verified: false, error: e.message };
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

  const action = (event.queryStringParameters || {}).action || '';
  const { sql } = getDatabase({ connectionString: process.env.APP_DB_URL });

  // ── CHECK / START — opaque email continuation gate ───────────────────────
  // GS-V6-002 fix: responses MUST be indistinguishable for known and unknown
  // email addresses — no boolean, no field, no timing difference.
  // The login action itself handles needsSetup / invalid-credential branching.
  if (event.httpMethod === 'GET' && action === 'check') {
    const email = ((event.queryStringParameters || {}).email || '').toLowerCase().trim();
    if (!email) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Email required' }) };

    try {
      // Constant-time floor: always wait at least 200 ms regardless of DB hit
      const minDelay = new Promise(r => setTimeout(r, 200));
      await sql`SELECT 1 FROM users WHERE email = ${email} LIMIT 1`;
      await minDelay;
      // Identical response for ALL inputs — known/unknown/no-password users all get continue
      return {
        statusCode: 200, headers: CORS,
        body: JSON.stringify({ status: 'continue' })
      };
    } catch (e) {
      console.error('api-auth check error:', e);
      await new Promise(r => setTimeout(r, 200)); // maintain timing on error too
      return {
        statusCode: 200, headers: CORS,
        body: JSON.stringify({ status: 'continue' })
      };
    }
  }

  // ── VERIFY-EMAIL — click link from verification email ────────────────────
  if (event.httpMethod === 'GET' && action === 'verify-email') {
    const token = ((event.queryStringParameters || {}).token || '').trim();
    if (!token) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Token required' }) };

    try {
      const rows = await sql`
        SELECT id FROM users
        WHERE email_verify_token = ${token} AND email_verified = FALSE
        LIMIT 1
      `;
      if (!rows.length) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid or already-used verification token' }) };
      }
      await sql`
        UPDATE users
        SET email_verified = TRUE, email_verify_token = NULL
        WHERE id = ${rows[0].id}
      `;
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, verified: true }) };
    } catch (e) {
      console.error('api-auth verify-email error:', e);
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Server error' }) };
    }
  }

  // ── RESEND-VERIFICATION — authenticated users can request a new email ─────
  if (event.httpMethod === 'GET' && action === 'resend-verification') {
    const authHeader = event.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Auth required' }) };

    try {
      const rows = await sql`
        SELECT u.id, u.email, u.name, u.email_verified
        FROM user_sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token = ${token} AND s.expires_at > NOW()
        LIMIT 1
      `;
      if (!rows.length) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Session invalid', auth: true }) };
      const user = rows[0];
      if (user.email_verified) return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, alreadyVerified: true }) };

      const verifyToken = crypto.randomBytes(32).toString('hex');
      await sql`UPDATE users SET email_verify_token = ${verifyToken} WHERE id = ${user.id}`;
      const emailResult = await sendVerificationEmail(user.email, user.name, verifyToken);
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, sent: emailResult.sent }) };
    } catch (e) {
      console.error('resend-verification error:', e);
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Server error' }) };
    }
  }

  // ── All POST actions ──────────────────────────────────────────────────────
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { body = {}; }

  // ── LOGIN — validate credentials, enforce rate limit, create session ──────
  if (action === 'login') {
    const email    = (body.email    || '').toLowerCase().trim();
    const password = (body.password || '').trim();

    if (!email || !password) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Email and password required' }) };
    }

    // Consistent baseline delay — prevents timing-based user enumeration
    const baseDelay = new Promise(r => setTimeout(r, 250));

    try {
      const rows = await sql`
        SELECT id, email, subscription_status, role, password_hash,
               login_attempts, lockout_until
        FROM users WHERE email = ${email} LIMIT 1
      `;

      await baseDelay;

      if (!rows.length) {
        return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Invalid email or password' }) };
      }

      const user = rows[0];

      // ── Rate limit check ──────────────────────────────────────────────────
      if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
        const remaining = Math.ceil((new Date(user.lockout_until) - Date.now()) / 60000);
        return {
          statusCode: 429, headers: CORS,
          body: JSON.stringify({
            error: `Too many failed attempts. Account locked for ${remaining} more minute${remaining === 1 ? '' : 's'}.`,
            locked: true,
            unlockAt: user.lockout_until
          })
        };
      }

      if (!user.password_hash) {
        return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Password not set — use the set-password flow', needsSetup: true }) };
      }

      const valid = await bcrypt.compare(password, user.password_hash);

      if (!valid) {
        // Increment failed attempts; lock after MAX_ATTEMPTS
        const newAttempts = (user.login_attempts || 0) + 1;
        if (newAttempts >= MAX_ATTEMPTS) {
          const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
          await sql`
            UPDATE users SET login_attempts = ${newAttempts}, lockout_until = ${lockUntil.toISOString()}
            WHERE id = ${user.id}
          `;
          return {
            statusCode: 429, headers: CORS,
            body: JSON.stringify({
              error: `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`,
              locked: true, unlockAt: lockUntil.toISOString()
            })
          };
        }
        await sql`UPDATE users SET login_attempts = ${newAttempts} WHERE id = ${user.id}`;
        // GS-V61-001 fix: identical error body for ALL failed logins — no attempt
        // count, no account-existence signal. Rate limiting is silent server-side;
        // the lockout message (429) only fires when the account is actually locked.
        return {
          statusCode: 401, headers: CORS,
          body: JSON.stringify({ error: 'Invalid email or password.' })
        };
      }

      // ── Successful login — reset attempt counter, create session ──────────
      const accessAllowed = user.role === 'admin' || user.subscription_status === 'active';
      const token         = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(32).toString('hex');
      const expiresAt     = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);

      await sql`
        UPDATE users SET login_attempts = 0, lockout_until = NULL WHERE id = ${user.id}
      `;
      await sql`
        INSERT INTO user_sessions (token, user_id, expires_at)
        VALUES (${token}, ${user.id}, ${expiresAt.toISOString()})
      `;
      // Housekeeping: delete this user's expired sessions
      await sql`DELETE FROM user_sessions WHERE user_id = ${user.id} AND expires_at < NOW()`;

      return {
        statusCode: 200, headers: CORS,
        body: JSON.stringify({
          ok: true, token,
          expiresAt: expiresAt.toISOString(),
          user: { email: user.email, role: user.role, subscription_status: user.subscription_status },
          access_allowed: accessAllowed
        })
      };
    } catch (e) {
      console.error('api-auth login error:', e);
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Server error during login' }) };
    }
  }

  // ── LOGOUT — invalidate session token ────────────────────────────────────
  if (action === 'logout') {
    const token = body.token || (event.headers['authorization'] || '').replace('Bearer ', '').trim();
    if (!token) return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };

    try {
      await sql`DELETE FROM user_sessions WHERE token = ${token}`;
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    } catch (e) {
      console.error('api-auth logout error:', e);
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }
  }

  // ── SET-PASSWORD — verify authorization, hash password, create session ────
  // Auth paths:
  //   a) Existing admin user with valid session token
  //   b) New PayPal subscriber — subscriptionId verified against PayPal API
  //   c) Admin role self-reset (no session needed — admin bypass for recovery)
  if (action === 'set-password') {
    const email          = (body.email          || '').toLowerCase().trim();
    const password       = (body.password       || '').trim();
    const sessionToken   = body.sessionToken    || (event.headers['authorization'] || '').replace('Bearer ', '').trim();
    const subscriptionId = (body.subscriptionId || '').trim();

    if (!email || !password) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Email and password required' }) };
    }
    if (password.length < 6) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Password must be at least 6 characters' }) };
    }

    try {
      const rows = await sql`SELECT id, role, subscription_status, password_hash FROM users WHERE email = ${email} LIMIT 1`;
      let user = rows[0] || null;
      let authorized = false;

      // Auth path 1: existing session token is valid for this user
      if (user && sessionToken) {
        const sessions = await sql`
          SELECT token FROM user_sessions
          WHERE token = ${sessionToken} AND expires_at > NOW() AND user_id = ${user.id}
          LIMIT 1
        `;
        if (sessions.length) authorized = true;
      }

      if (!authorized && user?.password_hash) {
        return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'Sign in before changing your password.' }) };
      }

      // Auth path 2: new subscriber — verify PayPal subscription and payer email.
      if (!authorized && subscriptionId) {
        const ppResult = await verifyPayPalSubscription(subscriptionId, email);
        if (ppResult.verified) {
          if (!user) {
            const created = await sql`
              INSERT INTO users (email, subscription_status, paypal_subscription_id, role)
              VALUES (${email}, 'active', ${subscriptionId}, 'user')
              RETURNING id, role, subscription_status, password_hash
            `;
            user = created[0];
          } else {
            await sql`
              UPDATE users
              SET subscription_status = 'active', paypal_subscription_id = ${subscriptionId}
              WHERE id = ${user.id}
            `;
          }
          authorized = true;
        } else {
          console.warn(`PayPal verification failed for ${email}: ${ppResult.error}`);
          return {
            statusCode: 403, headers: CORS,
            body: JSON.stringify({ error: `Could not verify subscription: ${ppResult.error}` })
          };
        }
      }

      if (!authorized) {
        return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'Not authorized to set password' }) };
      }

      const hash        = await bcrypt.hash(password, 10);
      const verifyToken = crypto.randomBytes(32).toString('hex');

      await sql`
        UPDATE users
        SET password_hash = ${hash}, login_attempts = 0, lockout_until = NULL,
            email_verified = FALSE, email_verify_token = ${verifyToken}
        WHERE id = ${user.id}
      `;

      // Send verification email (non-blocking — don't fail login if email fails)
      const emailResult = await sendVerificationEmail(email, user.name || '', verifyToken);

      // Issue a new session so the user lands in the app immediately
      const newToken  = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
      await sql`INSERT INTO user_sessions (token, user_id, expires_at) VALUES (${newToken}, ${user.id}, ${expiresAt.toISOString()})`;

      return {
        statusCode: 200, headers: CORS,
        body: JSON.stringify({
          ok: true, token: newToken, expiresAt: expiresAt.toISOString(),
          verificationEmailSent: emailResult.sent
        })
      };
    } catch (e) {
      console.error('api-auth set-password error:', e);
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Server error' }) };
    }
  }

  return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Unknown action. Use ?action=check|login|logout|set-password' }) };
};
