// paypal-webhook.js  v1
// Receives PayPal Billing Subscription lifecycle webhook events and syncs
// subscription_status in the users table accordingly.
//
// PayPal event types handled:
//   BILLING.SUBSCRIPTION.CREATED       → status: 'created'    (no access yet)
//   BILLING.SUBSCRIPTION.ACTIVATED     → status: 'active'     (grant access)
//   BILLING.SUBSCRIPTION.RE-ACTIVATED  → status: 'active'     (restore access)
//   BILLING.SUBSCRIPTION.UPDATED       → no status change      (log only)
//   BILLING.SUBSCRIPTION.EXPIRED       → status: 'expired'    (revoke access)
//   BILLING.SUBSCRIPTION.CANCELLED     → status: 'cancelled'  (revoke access)
//   BILLING.SUBSCRIPTION.SUSPENDED     → status: 'suspended'  (revoke access)
//   PAYMENT.SALE.COMPLETED             → confirm active       (belt-and-suspenders)
//   PAYMENT.SALE.DENIED                → status: 'suspended'  (payment failed)
//
// Setup required (one-time, in PayPal Developer Dashboard):
//   1. Register webhook URL: https://govscout.pro/.netlify/functions/paypal-webhook
//   2. Subscribe to all BILLING.SUBSCRIPTION.* and PAYMENT.SALE.* events
//   3. Copy the Webhook ID into Netlify env var: PAYPAL_WEBHOOK_ID
//
// Signature verification uses PayPal's /v1/notifications/verify-webhook-signature
// endpoint. PAYPAL_WEBHOOK_ID is required; webhook POSTs fail closed without it.

const { getDatabase } = require('@netlify/database');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json'
};

// Map PayPal event_type → our DB subscription_status value (null = no change)
const EVENT_STATUS_MAP = {
  'BILLING.SUBSCRIPTION.CREATED':      'created',
  'BILLING.SUBSCRIPTION.ACTIVATED':    'active',
  'BILLING.SUBSCRIPTION.RE-ACTIVATED': 'active',
  'BILLING.SUBSCRIPTION.EXPIRED':      'expired',
  'BILLING.SUBSCRIPTION.CANCELLED':    'cancelled',
  'BILLING.SUBSCRIPTION.SUSPENDED':    'suspended',
  'PAYMENT.SALE.COMPLETED':            'active',
  'PAYMENT.SALE.DENIED':               'suspended',
};

// ── PayPal webhook signature verification ────────────────────────────────────
async function verifyWebhookSignature(event, ppToken) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.error('PAYPAL_WEBHOOK_ID not set - refusing webhook event');
    return false;
  }

  const baseUrl = process.env.PAYPAL_BASE_URL || 'https://api-m.paypal.com';

  const verifyPayload = {
    auth_algo:         event.headers['paypal-auth-algo'],
    cert_url:          event.headers['paypal-cert-url'],
    transmission_id:   event.headers['paypal-transmission-id'],
    transmission_sig:  event.headers['paypal-transmission-sig'],
    transmission_time: event.headers['paypal-transmission-time'],
    webhook_id:        webhookId,
    webhook_event:     JSON.parse(event.body || '{}')
  };

  try {
    const res = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${ppToken}`,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify(verifyPayload)
    });
    const data = await res.json();
    return data.verification_status === 'SUCCESS';
  } catch (e) {
    console.error('Webhook signature verification error:', e.message);
    return false;
  }
}

exports.handler = async (event) => {
  // PayPal only POSTs — return 200 for GET probes (PayPal health check)
  if (event.httpMethod === 'GET') {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: '' };
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret   = process.env.PAYPAL_SECRET;
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  const baseUrl  = process.env.PAYPAL_BASE_URL || 'https://api-m.paypal.com';

  if (!clientId || !secret || !webhookId) {
    console.error('paypal-webhook: PayPal credentials or webhook ID not configured');
    return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: 'Webhook verification not configured' }) };
  }

  // ── 1. Parse payload ──────────────────────────────────────────────────────
  let webhookEvent;
  try {
    webhookEvent = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const eventType      = webhookEvent.event_type || '';
  const resourceType   = webhookEvent.resource_type || '';
  const resource       = webhookEvent.resource || {};
  const subscriptionId = resource.id || resource.billing_agreement_id || '';

  console.log(`paypal-webhook: ${eventType} — subscription ${subscriptionId}`);

  // ── 2. Get PayPal access token (needed for sig verification) ─────────────
  let ppToken = null;
  try {
    const creds    = Buffer.from(`${clientId}:${secret}`).toString('base64');
    const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method:  'POST',
      headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    'grant_type=client_credentials'
    });
    const td = await tokenRes.json();
    ppToken  = td.access_token || null;
  } catch (e) {
    console.error('paypal-webhook token error:', e.message);
  }
  if (!ppToken) {
    return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: 'Unable to verify webhook' }) };
  }

  // ── 3. Verify signature ───────────────────────────────────────────────────
  const valid = await verifyWebhookSignature(event, ppToken);
  if (!valid) {
    console.error('paypal-webhook: signature verification FAILED');
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Signature verification failed' }) };
  }

  // ── 4. Map event to DB status ─────────────────────────────────────────────
  const newStatus = EVENT_STATUS_MAP[eventType];
  if (!newStatus) {
    // Unknown or unhandled event — acknowledge so PayPal doesn't retry
    console.log(`paypal-webhook: unhandled event type ${eventType} — acknowledged`);
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, action: 'ignored' }) };
  }

  if (!subscriptionId) {
    console.error('paypal-webhook: no subscriptionId in resource', JSON.stringify(resource));
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, action: 'no_subscription_id' }) };
  }

  // ── 5. Update DB ──────────────────────────────────────────────────────────
  try {
    const { sql } = getDatabase({ connectionString: process.env.APP_DB_URL });

    const result = await sql`
      UPDATE users
      SET subscription_status = ${newStatus}
      WHERE paypal_subscription_id = ${subscriptionId}
      RETURNING id, email, subscription_status
    `;

    if (result.length === 0) {
      // PayPal fired for a subscription not yet in our DB (race condition on
      // CREATED events before the user completes set-password). Log and ack.
      console.warn(`paypal-webhook: no user found for subscription ${subscriptionId} — status ${newStatus} not applied`);
    } else {
      console.log(`paypal-webhook: user ${result[0].email} → subscription_status=${newStatus}`);
    }

    return {
      statusCode: 200, headers: CORS,
      body: JSON.stringify({ ok: true, action: 'updated', status: newStatus, rows: result.length })
    };

  } catch (dbErr) {
    console.error('paypal-webhook DB error:', dbErr.message);
    // Return 500 so PayPal retries delivery (webhook retry policy)
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'DB error' }) };
  }
};
