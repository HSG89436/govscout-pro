const assert = require('node:assert/strict');
const { afterEach, beforeEach, test } = require('node:test');
const Module = require('node:module');

const functionPath = require.resolve('../netlify/functions/api-samgov.js');
const originalLoad = Module._load;
const originalFetch = global.fetch;
const originalSamKey = process.env.SAM_GOV_API_KEY;
let requestedUrl;

function sql(strings) {
  const query = strings.join('?');
  if (query.includes('FROM user_sessions')) {
    return Promise.resolve([{ id: 'subscriber-1', role: 'user', subscription_status: 'active' }]);
  }
  if (query.includes('FROM business_profiles')) return Promise.resolve([]);
  return Promise.resolve([]);
}

function loadHandler() {
  delete require.cache[functionPath];
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === '@netlify/database') return { getDatabase: () => ({ sql }) };
    return originalLoad.call(this, request, parent, isMain);
  };
  return require(functionPath).handler;
}

beforeEach(() => {
  requestedUrl = '';
  process.env.SAM_GOV_API_KEY = 'system-key';
  global.fetch = async (url) => {
    requestedUrl = url;
    return { ok: false, status: 404 };
  };
});

afterEach(() => {
  Module._load = originalLoad;
  global.fetch = originalFetch;
  if (originalSamKey === undefined) delete process.env.SAM_GOV_API_KEY;
  else process.env.SAM_GOV_API_KEY = originalSamKey;
  delete require.cache[functionPath];
});

test('SAM search uses official query fields and maps no-data 404 to empty results', async () => {
  const response = await loadHandler()({
    httpMethod: 'GET',
    headers: { authorization: 'Bearer session' },
    queryStringParameters: { naics: '541690', keyword: 'cybersecurity', days: '90', limit: '3' }
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body).opportunities, []);
  assert.match(requestedUrl, /ncode=541690/);
  assert.match(requestedUrl, /title=cybersecurity/);
  assert.doesNotMatch(requestedUrl, /naicsCode=|[?&]q=|active=/);
});
