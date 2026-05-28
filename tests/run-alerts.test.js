const assert = require('node:assert/strict');
const { afterEach, beforeEach, test } = require('node:test');
const Module = require('node:module');

const functionPath = require.resolve('../netlify/functions/run-alerts.js');
const originalLoad = Module._load;
const originalFetch = global.fetch;
const originalWarn = console.warn;
const originalLog = console.log;
const originalSamKey = process.env.SAM_GOV_API_KEY;
let fetchedUrls;

function sql(strings) {
  const query = strings.join('?');
  if (query.includes('SELECT * FROM alert_subscribers')) {
    return Promise.resolve([{
      id: 'subscriber-1',
      email: 'subscriber@govscout.pro',
      certifications: 'SDVOSB',
      min_score: 'TEAM',
      keywords: 'cybersecurity',
      naics_codes: '541690'
    }]);
  }
  if (query.includes("'skipped'")) {
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

beforeEach(() => {
  fetchedUrls = [];
  process.env.SAM_GOV_API_KEY = 'system-key';
  global.fetch = async (url) => {
    fetchedUrls.push(url);
    return { ok: true, status: 200, json: async () => ({ opportunitiesData: [] }) };
  };
  console.warn = () => {};
  console.log = () => {};
});

afterEach(() => {
  Module._load = originalLoad;
  global.fetch = originalFetch;
  console.warn = originalWarn;
  console.log = originalLog;
  if (originalSamKey === undefined) delete process.env.SAM_GOV_API_KEY;
  else process.env.SAM_GOV_API_KEY = originalSamKey;
  delete require.cache[functionPath];
});

test('daily alerts continue when skipped-delivery logging fails', async () => {
  const response = await loadHandler()();

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), { processed: 1 });
  assert.equal(fetchedUrls.length, 1);
  assert.match(fetchedUrls[0], /title=cybersecurity/);
  assert.match(fetchedUrls[0], /ncode=541690/);
  assert.doesNotMatch(fetchedUrls[0], /naicsCode=|[?&]q=/);
});
