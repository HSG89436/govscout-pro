// verify-subscription.js  v2
// Checks PayPal subscription status by subscriptionId.
// GS-V61-003 fix: handle ALL lifecycle states — ACTIVE grants access,
// everything else (CANCELLED, EXPIRED, SUSPENDED, CREATED, APPROVAL_PENDING)
// revokes it and syncs the status back to the DB.

const { getDatabase } = require('@netlify/database');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// States that mean the subscription is billable and access should be granted.
const ACTIVE_STATES = new Set(['ACTIVE']);

async function requireSubscriber(event) {
  const authHeader = event.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return { error: 'Authentication required', statusCode: 401 };
  const { sql } = getDatabase({ connectionString: process.env.APP_DB_URL });
  const rows = await sql`
    SELECT u.id, u.paypal_subscription_id
    FROM user_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token} AND s.expires_at > NOW()
    LIMIT 1
  `;
  if (!rows.length) return { error: 'Session invalid or expired', statusCode: 401 };
  return { user: rows[0], sql };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let authenticated;
  try {
    authenticated = await requireSubscriber(event);
  } catch (e) {
    console.error('verify-subscription auth error:', e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ subscribed: false, error: 'Authentication check failed' }) };
  }
  if (!authenticated.user) {
    return { statusCode: authenticated.statusCode, headers: CORS, body: JSON.stringify({ subscribed: false, error: authenticated.error }) };
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret   = process.env.PAYPAL_SECRET;
  const baseUrl  = process.env.PAYPAL_BASE_URL || 'https://api-m.paypal.com';

  if (!clientId || !secret) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ subscribed: false, error: 'PayPal not configured' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const requestedSubscriptionId = (body.subscriptionId || '').trim();
    const subscriptionId = authenticated.user.paypal_subscription_id;
    if (requestedSubscriptionId && requestedSubscriptionId !== subscriptionId) {
      return { statusCode: 403, headers: CORS, body: JSON.stringify({ subscribed: false, error: 'Subscription does not belong to this account' }) };
    }
    if (!subscriptionId) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ subscribed: false, error: 'No PayPal subscription is linked to this account' }) };
    }

    // ── 1. Get PayPal access token ──────────────────────────────────────────
    const creds    = Buffer.from(`${clientId}:${secret}`).toString('base64');
    const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method:  'POST',
      headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    'grant_type=client_credentials'
    });
    const tokenData = await tokenRes.json();
    const ppToken   = tokenData.access_token;
    if (!ppToken) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ subscribed: false, error: 'PayPal auth failed' }) };
    }

    // ── 2. Fetch subscription from PayPal ───────────────────────────────────
    const subRes = await fetch(`${baseUrl}/v1/billing/subscriptions/${subscriptionId}`, {
      headers: { 'Authorization': `Bearer ${ppToken}`, 'Content-Type': 'application/json' }
    });
    if (!subRes.ok) {
      const errText = await subRes.text().catch(() => '');
      console.error('PayPal subscription fetch error:', subRes.status, errText);
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ subscribed: false, error: `PayPal API ${subRes.status}` }) };
    }
    const sub = await subRes.json();

    const paypalStatus = sub.status || 'UNKNOWN';
    const subscribed   = ACTIVE_STATES.has(paypalStatus);

    // ── 3. Sync status back to DB (best-effort, non-blocking) ───────────────
    // Map PayPal status → our internal subscription_status value
    try {
      const dbStatus = subscribed ? 'active' : paypalStatus.toLowerCase();
      await authenticated.sql`
        UPDATE users
        SET subscription_status = ${dbStatus}
        WHERE id = ${authenticated.user.id} AND paypal_subscription_id = ${subscriptionId}
      `;
    } catch (dbErr) {
      // Non-fatal — log and continue so a DB hiccup never blocks the user
      console.error('verify-subscription DB sync error:', dbErr.message);
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        subscribed,
        status:    paypalStatus,   // raw PayPal state for debugging
        planId:    sub.plan_id,
        startTime: sub.start_time,
        nextBilling: sub.billing_info?.next_billing_time || null
      })
    };

  } catch (err) {
    console.error('verify-subscription error:', err);
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ subscribed: false, error: err.message }) };
  }
};
