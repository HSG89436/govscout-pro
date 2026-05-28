// admin-dashboard.js — owner backend: list subscribers, revenue stats  (v2)
// Auth: Bearer session token required; user must have role = 'admin'
// Falls back to X-Admin-Password header for CLI/cron access (env: ADMIN_PASSWORD)

const { getDatabase } = require('@netlify/database');

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Password',
  'Content-Type': 'application/json'
};

async function requireAdmin(event, sql) {
  // Option 1: session token (preferred — used by the web UI)
  const authHeader = event.headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const rows = await sql`
        SELECT u.id, u.role FROM user_sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token = ${token} AND s.expires_at > NOW()
        LIMIT 1
      `;
      if (rows.length && rows[0].role === 'admin') return { ok: true };
      if (rows.length && rows[0].role !== 'admin') return { ok: false, status: 403, error: 'Admin role required' };
      // Token not found or expired — fall through to password check
    }
  }

  // Option 2: X-Admin-Password header (for scripts / cron callers)
  const adminPass = process.env.ADMIN_PASSWORD || '';
  const provided  = event.headers['x-admin-password'] || '';
  if (adminPass && provided && provided === adminPass) return { ok: true };

  return { ok: false, status: 401, error: 'Unauthorized — provide a valid admin session token or X-Admin-Password header' };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };

  const { sql } = getDatabase({ connectionString: process.env.APP_DB_URL });

  // Auth check
  let authResult;
  try {
    authResult = await requireAdmin(event, sql);
  } catch (e) {
    console.error('admin-dashboard auth error:', e);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'Auth check failed' }) };
  }

  if (!authResult.ok) {
    return { statusCode: authResult.status || 401, headers: HEADERS, body: JSON.stringify({ error: authResult.error }) };
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    // Return DB-based subscriber stats even without Stripe
    try {
      const subs = await sql`
        SELECT email, name, subscription_status, role, created_at
        FROM users
        WHERE subscription_status = 'active' OR role = 'admin'
        ORDER BY created_at DESC
      `;
      return {
        statusCode: 200, headers: HEADERS,
        body: JSON.stringify({
          subscriberCount: subs.length,
          mrr: (subs.filter(s => s.subscription_status === 'active').length * 9).toFixed(2),
          available: '0.00',
          subscribers: subs,
          note: 'Stripe not configured — showing DB records only'
        })
      };
    } catch (e) {
      return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'DB query failed: ' + e.message }) };
    }
  }

  try {
    const action = (event.queryStringParameters || {}).action;

    if (action === 'cancel') {
      const { subscriptionId } = JSON.parse(event.body || '{}');
      if (!subscriptionId) return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'subscriptionId required' }) };
      const res  = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${stripeKey}` }
      });
      const data = await res.json();
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ success: true, data }) };
    }

    // Default: fetch active subscribers and balance from Stripe
    const [subRes, balRes] = await Promise.all([
      fetch('https://api.stripe.com/v1/subscriptions?status=active&limit=100&expand[]=data.customer', {
        headers: { 'Authorization': `Bearer ${stripeKey}` }
      }),
      fetch('https://api.stripe.com/v1/balance', {
        headers: { 'Authorization': `Bearer ${stripeKey}` }
      })
    ]);

    const [subData, balData] = await Promise.all([subRes.json(), balRes.json()]);

    const subscribers = (subData.data || []).map(sub => ({
      id:               sub.id,
      email:            sub.customer?.email,
      name:             sub.customer?.name,
      created:          new Date(sub.created * 1000).toISOString().split('T')[0],
      currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString().split('T')[0],
      amount:           (sub.items?.data?.[0]?.price?.unit_amount / 100) || 9,
      status:           sub.status,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      customerId:       sub.customer?.id
    }));

    const mrr       = subscribers.reduce((sum, s) => sum + (s.amount || 9), 0);
    const available = balData.available ? balData.available.reduce((s, b) => s + b.amount, 0) / 100 : 0;

    return {
      statusCode: 200, headers: HEADERS,
      body: JSON.stringify({
        subscriberCount: subscribers.length,
        mrr: mrr.toFixed(2),
        available: available.toFixed(2),
        subscribers
      })
    };
  } catch (err) {
    console.error('admin-dashboard error:', err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
