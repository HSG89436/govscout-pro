const assert = require('node:assert/strict');
const { afterEach, beforeEach, test } = require('node:test');
const Module = require('node:module');

const originalLoad = Module._load;
const originalFetch = global.fetch;
const originalError = console.error;
const originalWarn = console.warn;
const originalEnv = {
  PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
  PAYPAL_SECRET: process.env.PAYPAL_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  PAYPAL_WEBHOOK_ID: process.env.PAYPAL_WEBHOOK_ID
};

function loadWithSql(relativePath, sql) {
  const path = require.resolve(relativePath);
  delete require.cache[path];
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === '@netlify/database') return { getDatabase: () => ({ sql }) };
    return originalLoad.call(this, request, parent, isMain);
  };
  return { handler: require(path).handler, path };
}

function clearModule(path) {
  Module._load = originalLoad;
  if (path) delete require.cache[path];
}

beforeEach(() => {
  console.error = () => {};
  console.warn = () => {};
  delete process.env.RESEND_API_KEY;
});

afterEach(() => {
  Module._load = originalLoad;
  global.fetch = originalFetch;
  console.error = originalError;
  console.warn = originalWarn;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test('admin password cannot fall back to a source-code default', async () => {
  delete process.env.ADMIN_PASSWORD;
  const { handler, path } = loadWithSql('../netlify/functions/admin-dashboard.js', async () => []);
  const response = await handler({ httpMethod: 'GET', headers: { 'x-admin-password': 'govscout-admin-2026' } });
  clearModule(path);

  assert.equal(response.statusCode, 401);
});

test('payment management endpoints require a subscriber session', async () => {
  let fetchCalls = 0;
  global.fetch = async () => { fetchCalls += 1; return {}; };
  for (const functionName of ['customer-portal.js', 'verify-subscription.js']) {
    const { handler, path } = loadWithSql(`../netlify/functions/${functionName}`, async () => []);
    const response = await handler({ httpMethod: 'POST', headers: {}, body: '{}' });
    clearModule(path);
    assert.equal(response.statusCode, 401, functionName);
  }
  assert.equal(fetchCalls, 0);
});

test('PayPal webhook fails closed when signature configuration is missing', async () => {
  delete process.env.PAYPAL_WEBHOOK_ID;
  process.env.PAYPAL_CLIENT_ID = 'client';
  process.env.PAYPAL_SECRET = 'secret';
  const { handler, path } = loadWithSql('../netlify/functions/paypal-webhook.js', () => {
    throw new Error('database must not be touched');
  });
  const response = await handler({
    httpMethod: 'POST',
    headers: {},
    body: JSON.stringify({ event_type: 'BILLING.SUBSCRIPTION.ACTIVATED', resource: { id: 'I-FAKE' } })
  });
  clearModule(path);

  assert.equal(response.statusCode, 503);
});

test('existing initialized account cannot be reset using a payment id', async () => {
  const sql = (strings) => {
    if (strings.join('?').includes('SELECT id, role')) {
      return Promise.resolve([{ id: 'victim', role: 'user', password_hash: 'already-set' }]);
    }
    return Promise.resolve([]);
  };
  const { handler, path } = loadWithSql('../netlify/functions/api-auth.js', sql);
  const response = await handler({
    httpMethod: 'POST',
    headers: {},
    queryStringParameters: { action: 'set-password' },
    body: JSON.stringify({ email: 'victim@example.com', password: 'replacement', subscriptionId: 'I-ATTACK' })
  });
  clearModule(path);

  assert.equal(response.statusCode, 403);
  assert.match(response.body, /Sign in/);
});

test('new payment enrollment rejects a PayPal email mismatch', async () => {
  process.env.PAYPAL_CLIENT_ID = 'client';
  process.env.PAYPAL_SECRET = 'secret';
  global.fetch = async (url) => {
    if (url.includes('/oauth2/token')) return { ok: true, json: async () => ({ access_token: 'token' }) };
    return {
      ok: true,
      json: async () => ({ status: 'ACTIVE', subscriber: { email_address: 'payer@example.com' } })
    };
  };
  const { handler, path } = loadWithSql('../netlify/functions/api-auth.js', () => Promise.resolve([]));
  const response = await handler({
    httpMethod: 'POST',
    headers: {},
    queryStringParameters: { action: 'set-password' },
    body: JSON.stringify({ email: 'victim@example.com', password: 'newpassword', subscriptionId: 'I-PAID' })
  });
  clearModule(path);

  assert.equal(response.statusCode, 403);
  assert.match(response.body, /does not match/);
});

test('approved but inactive PayPal subscription does not grant access', async () => {
  process.env.PAYPAL_CLIENT_ID = 'client';
  process.env.PAYPAL_SECRET = 'secret';
  global.fetch = async (url) => {
    if (url.includes('/oauth2/token')) return { ok: true, json: async () => ({ access_token: 'token' }) };
    return {
      ok: true,
      json: async () => ({ status: 'APPROVED', subscriber: { email_address: 'payer@example.com' } })
    };
  };
  const { handler, path } = loadWithSql('../netlify/functions/api-auth.js', () => Promise.resolve([]));
  const response = await handler({
    httpMethod: 'POST',
    headers: {},
    queryStringParameters: { action: 'set-password' },
    body: JSON.stringify({ email: 'payer@example.com', password: 'newpassword', subscriptionId: 'I-PENDING' })
  });
  clearModule(path);

  assert.equal(response.statusCode, 403);
  assert.match(response.body, /APPROVED/);
});

test('document and task endpoints reject unauthenticated access', async () => {
  for (const functionName of ['api-documents.js', 'api-tasks.js']) {
    const { handler, path } = loadWithSql(`../netlify/functions/${functionName}`, () => Promise.resolve([]));
    const response = await handler({ httpMethod: 'GET', headers: {}, queryStringParameters: {} });
    clearModule(path);
    assert.equal(response.statusCode, 401, functionName);
  }
});
