// create-checkout.js - creates PayPal subscription for $9/month
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  try {
    const { email } = JSON.parse(event.body || '{}');
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const secret   = process.env.PAYPAL_SECRET;
    const planId   = process.env.PAYPAL_PLAN_ID;
    const baseUrl  = process.env.PAYPAL_BASE_URL || 'https://api-m.paypal.com';

    if (!clientId || !secret || !planId) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'PayPal not configured on server' }) };
    }

    // Get access token
    const creds = Buffer.from(`${clientId}:${secret}`).toString('base64');
    const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials'
    });
    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;
    if (!token) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Could not authenticate with PayPal' }) };
    }

    const origin = event.headers.origin || 'https://govscout.pro';
    const successUrl = `${origin}/app?sub=success`;
    const cancelUrl  = `${origin}/app`;

    // Create subscription
    const subPayload = {
      plan_id: planId,
      application_context: {
        brand_name: 'GovScout Pro',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        return_url: successUrl,
        cancel_url: cancelUrl
      }
    };
    if (email) {
      subPayload.subscriber = { email_address: email };
    }

    const subRes = await fetch(`${baseUrl}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(subPayload)
    });

    const sub = await subRes.json();

    if (!sub.id) {
      console.error('PayPal subscription error:', JSON.stringify(sub));
      return { statusCode: 500, headers, body: JSON.stringify({ error: sub.message || 'Failed to create subscription' }) };
    }

    // Find the approval link
    const approveLink = (sub.links || []).find(l => l.rel === 'approve');
    if (!approveLink) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'No approval URL returned from PayPal' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ url: approveLink.href, subscriptionId: sub.id }) };

  } catch (err) {
    console.error('create-checkout error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
