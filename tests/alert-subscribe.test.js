const assert = require('node:assert/strict');
const { afterEach, beforeEach, test } = require('node:test');
const Module = require('node:module');

const functionPath = require.resolve('../netlify/functions/alert-subscribe.js');
const originalLoad = Module._load;
const originalFetch = global.fetch;
const originalWarn = console.warn;
const originalEnv = { ...process.env };

let queries;
let sendCount;
let failLogInsert;

function sql(strings) {
  const query = strings.join('?');
  queries.push(query);
  if (query.includes('FROM user_sessions')) {
    return Promise.resolve([{
      id: 'subscriber-1',
      email: 'subscriber@govscout.pro',
      role: 'user',
      subscription_status: 'active'
    }]);
  }
  if (query.includes('FROM alert_delivery_log')) {
    return Promise.resolve([{ cnt: '0' }]);
  }
  if (query.includes('INSERT INTO alert_delivery_log') && failLogInsert) {
    return Promise.reject(new Error('delivery log unavailable'));
  }
  return Promise.resolve([]);
}

function loadHandler() {
  delete require.cache[functionPath];
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === '@netlify/database') {
      return { getDatabase: () => ({ sql }) };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  return require(functionPath).handler;
}

function event(body = {}) {
  return {
    httpMethod: 'POST',
    queryStringParameters: { action: 'test-email' },
    headers: { authorization: 'Bearer valid-session' },
    body: JSON.stringify(body)
  };
}

beforeEach(() => {
  queries = [];
  sendCount = 0;
  failLogInsert = false;
  process.env.RESEND_API_KEY = 'test-key';
  process.env.APP_DB_URL = 'test-db';
  global.fetch = async () => {
    sendCount += 1;
    return { ok: true, json: async () => ({ id: 'email-1' }) };
  };
  console.warn = () => {};
});

afterEach(() => {
  Module._load = originalLoad;
  global.fetch = originalFetch;
  console.warn = originalWarn;
  process.env = { ...originalEnv };
  delete require.cache[functionPath];
});

test('test email succeeds even when audit-log insert rejects', async () => {
  failLogInsert = true;
  const response = await loadHandler()(event());

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), { ok: true });
  assert.equal(sendCount, 1);
});

test('test email refuses delivery to an unverified alternate address', async () => {
  const response = await loadHandler()(event({ email: 'victim@example.com' }));

  assert.equal(response.statusCode, 403);
  assert.match(response.body, /account email/);
  assert.equal(sendCount, 0);
});

test('alert preferences cannot be updated without a session', async () => {
  const response = await loadHandler()({
    httpMethod: 'POST',
    queryStringParameters: {},
    headers: {},
    body: JSON.stringify({ email: 'subscriber@govscout.pro', keywords: 'changed' })
  });

  assert.equal(response.statusCode, 401);
});

test('alert preferences cannot be redirected to another email', async () => {
  const response = await loadHandler()({
    httpMethod: 'POST',
    queryStringParameters: {},
    headers: { authorization: 'Bearer valid-session' },
    body: JSON.stringify({ email: 'victim@example.com', keywords: 'changed' })
  });

  assert.equal(response.statusCode, 403);
});
