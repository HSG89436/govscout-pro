// alert-unsubscribe.js — deactivate subscriber via token  (v1 CommonJS)
const { getDatabase } = require('@netlify/database');

function page(title, body, success) {
  const color = success ? '#00c896' : '#ff6b6b';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} — GovScout Pro</title>
<style>body{font-family:system-ui,sans-serif;background:#05050a;color:#ccc;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}
.box{text-align:center;max-width:420px;padding:40px;background:#0d1117;border:1px solid #1e3a2f;border-radius:12px;}
h1{color:${color};font-size:22px;margin-bottom:12px;}p{color:#8899aa;line-height:1.6;font-size:14px;}
a{color:#00c896;text-decoration:none;}</style></head>
<body><div class="box"><div style="font-size:32px;font-weight:900;color:#fff;margin-bottom:20px;">GOV<span style="color:#00c896">SCOUT</span></div>
<h1>${title}</h1><p>${body}</p>
<p style="margin-top:24px;"><a href="https://govscout.pro/app">↩ Return to GovScout Pro</a></p></div></body></html>`;
}

exports.handler = async (event) => {
  const qs = event.queryStringParameters || {};
  const token = qs.token;
  const email = qs.email;

  if (!token || !email) {
    return { statusCode: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: page('Invalid Link', 'Missing token or email in unsubscribe link.', false) };
  }

  try {
    const { sql } = getDatabase({ connectionString: process.env.APP_DB_URL });
    const normalEmail = decodeURIComponent(email).toLowerCase().trim();
    const rows = await sql`SELECT id, unsubscribe_token FROM alert_subscribers WHERE email = ${normalEmail}`;

    if (!rows.length) {
      return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: page('Already Unsubscribed', 'That email is not in our alerts list.', true) };
    }

    if (rows[0].unsubscribe_token !== token) {
      return { statusCode: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: page('Invalid Link', 'This unsubscribe link is invalid or has expired.', false) };
    }

    await sql`UPDATE alert_subscribers SET active = FALSE, updated_at = NOW() WHERE email = ${normalEmail}`;
    return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: page('Unsubscribed', `${normalEmail} has been removed from GovScout Pro contract alerts.`, true) };
  } catch (err) {
    return { statusCode: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: page('Error', 'Something went wrong. Please try again or contact support@govscout.pro.', false) };
  }
};
