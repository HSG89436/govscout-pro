const assert = require('node:assert/strict');
const { afterEach, beforeEach, test } = require('node:test');
const Module = require('node:module');

const functionPath = require.resolve('../netlify/functions/alert-push.js');
const originalLoad = Module._load;
const originalFetch = global.fetch;
const originalToken = process.env.TELEGRAM_BOT_TOKEN;
let sends;

function loadHandler(storedChatId) {
  delete require.cache[functionPath];
  const sql = () => Promise.resolve([{ id: 'user-1', role: 'user', telegram_chat_id: storedChatId }]);
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === '@netlify/database') return { getDatabase: () => ({ sql }) };
    return originalLoad.call(this, request, parent, isMain);
  };
  return require(functionPath).handler;
}

beforeEach(() => {
  sends = 0;
  process.env.TELEGRAM_BOT_TOKEN = 'test-token';
  global.fetch = async () => {
    sends += 1;
    return { json: async () => ({ ok: true }) };
  };
});

afterEach(() => {
  Module._load = originalLoad;
  global.fetch = originalFetch;
  if (originalToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
  else process.env.TELEGRAM_BOT_TOKEN = originalToken;
  delete require.cache[functionPath];
});

test('subscriber without registered Telegram destination cannot push messages', async () => {
  const response = await loadHandler(null)({
    httpMethod: 'POST',
    headers: { authorization: 'Bearer session' },
    body: JSON.stringify({ chatId: 'attacker-destination', message: 'message' })
  });

  assert.equal(response.statusCode, 403);
  assert.equal(sends, 0);
});
