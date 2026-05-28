// customer-portal.js  v2
// Manages PayPal subscription: status check + cancel.
// GS-V61-003 fix: after a successful cancellation, sync subscription_status
// = 'cancelled' back to the DB so access is revoked immediately without
// waiting for the next PayPal webhook event.

const { getDatabase } = require('@netlify/database');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

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
    console.error('customer-portal auth error:', e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Authentication check failed' }) };
  }
  if (!authenticated.user) {
    return { statusCode: authenticated.statusCode, headers: CORS, body: JSON.stringify({ error: authenticated.error }) };
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret   = process.env.PAYPAL_SECRET;
  const baseUrl  = process.env.PAYPAL_BASE_URL || 'https://api-m.paypal.com';

  if (!clientId || !secret) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'PayPal not configured' }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { body = {}; }

  const { action } = body;
  const requestedSubscriptionId = (body.subscriptionId || '').trim();
  const subscriptionId = authenticated.user.paypal_subscription_id;
  if (requestedSubscriptionId && requestedSubscriptionId !== subscriptionId) {
    return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'Subscription does not belong to this account' }) };
  }
  if (!subscriptionId) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'No PayPal subscription is linked to this account' }) };
  }

  // ── 1. Get PayPal access token ────────────────────────────────────────────
  let ppToken;
  try {
    const creds    = Buffer.from(`${clientId}:${secret}`).toString('base64');
    const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method:  'POST',
      headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    'grant_type=client_credentials'
    });
    const tokenData = await tokenRes.json();
    ppToken = tokenData.access_token;
    if (!ppToken) throw new Error('No access token returned');
  } catch (e) {
    console.error('customer-portal PayPal auth error:', e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Could not authenticate with PayPal' }) };
  }

  const authHeaders = {
    'Authorization': `Bearer ${ppToken}`,
    'Content-Type': 'application/json'
  };

  // ── 2. Cancel subscription ────────────────────────────────────────────────
  if (action === 'cancel') {
    try {
      const cancelRes = await fetch(`${baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
        method:  'POST',
        headers: authHeaders,
        body:    JSON.stringify({ reason: 'User requested cancellation via GovScout Pro' })
      });

      if (cancelRes.status === 204 || cancelRes.ok) {
        // GS-V61-003 fix: sync cancellation to DB immediately so access is
        // revoked without waiting for a PayPal webhook delivery.
        try {
          await authenticated.sql`
            UPDATE users
            SET subscription_status = 'cancelled'
            WHERE id = ${authenticated.user.id} AND paypal_subscription_id = ${subscriptionId}
          `;
        } catch (dbErr) {
          console.error('customer-portal cancel DB sync error:', dbErr.message);
          // Non-fatal — PayPal webhook will eventually sync anyway
        }
        return {
          statusCode: 200, headers: CORS,
          body: JSON.stringify({ success: true, message: 'Subscription cancelled' })
        };
      }

      let errData = {};
      try { errData = await cancelRes.json(); } catch {}
      return {
        statusCode: 400, headers: CORS,
        body: JSON.stringify({ error: errData.message || 'Cancellation failed' })
      };

    } catch (err) {
      console.error('customer-portal cancel error:', err.message);
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
    }
  }

  // ── 3. Default: return subscription status ────────────────────────────────
  try {
    const subRes = await fetch(`${baseUrl}/v1/billing/subscriptions/${subscriptionId}`, {
      headers: authHeaders
    });
    const sub = await subRes.json();
    const paypalStatus = sub.status || 'UNKNOWN';

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        id:          sub.id,
        status:      paypalStatus,
        active:      ACTIVE_STATES.has(paypalStatus),
        planId:      sub.plan_id,
        startTime:   sub.start_time,
        nextBilling: sub.billing_info?.next_billing_time || null,
        manageUrl:   'https://www.paypal.com/myaccount/autopay'
      })
    };
  } catch (err) {
    console.error('customer-portal status error:', err.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
