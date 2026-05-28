const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const appHtml = fs.readFileSync(path.join(__dirname, '..', 'fedscout5.html'), 'utf8');

test('Document Intel blocks analysis when document contents cannot be read', () => {
  assert.match(appHtml, /\[UNREADABLE PDF:/);
  assert.match(appHtml, /Marcus cannot analyze unreadable document content/);
  assert.match(appHtml, /Readable document text is required before analysis/);
  assert.doesNotMatch(appHtml, /Marcus will analyze based on filename and contract context/);
});

test('Marcus user-facing guidance does not instruct deceptive identity or unsupported award influence', () => {
  assert.match(appHtml, /AI-powered federal contracting workflow adviser/);
  assert.doesNotMatch(appHtml, /You do not describe yourself in those terms/);
  assert.doesNotMatch(appHtml, /contracts are won before they are written/);
  assert.doesNotMatch(appHtml, /write it to influence the requirements/);
  assert.doesNotMatch(appHtml, /competes against almost nobody/);
});
