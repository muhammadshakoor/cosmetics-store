const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });

let databaseError = null;
let writes = [];
let limited = null;
const database = { from(table) { return {
  insert(payload) { writes.push({ table, payload }); return Promise.resolve({ error: databaseError }); },
  upsert(payload) { writes.push({ table, payload }); return Promise.resolve({ error: databaseError }); },
}; } };
const originalLoad = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === '@/lib/supabase') return { supabase: database };
  if (name === '@/lib/rateLimit') return { rateLimit: async () => limited };
  return originalLoad.call(this, name, parent, isMain);
};
const contact = require('../app/api/contact/route.ts').POST;
const newsletter = require('../app/api/newsletter/route.ts').POST;
const recovery = require('../app/api/abandoned-cart/route.ts').POST;
Module._load = originalLoad;
const request = (path, data) => new Request(`http://localhost/api/${path}`, { method: 'POST', body: JSON.stringify(data) });
const message = { name: 'Test Customer', email: 'Test@Example.test', subject: 'product', message: 'Please explain the product size.' };

test('support reports success only after the message is saved to the admin inbox', async () => {
  databaseError = null; writes = [];
  const response = await contact(request('contact', message));
  assert.equal(response.status, 201);
  assert.equal(writes[0].table, 'Complaint');
  assert.equal(writes[0].payload.email, 'test@example.test');
  assert.equal(writes[0].payload.message, message.message);
  assert.match((await response.json()).reference, /^[A-F0-9]{8}$/);
  databaseError = { message: 'missing table' };
  assert.equal((await contact(request('contact', message))).status, 503);
  databaseError = null;
});
test('support rejects invalid input and malformed JSON without saving anything', async () => {
  writes = [];
  assert.equal((await contact(request('contact', { ...message, message: 'short' }))).status, 400);
  assert.equal((await contact(new Request('http://localhost/api/contact', { method: 'POST', body: '{' }))).status, 400);
  assert.equal(writes.length, 0);
});
test('newsletter requires explicit consent and persists it without claiming email delivery', async () => {
  writes = [];
  assert.equal((await newsletter(request('newsletter', { email: 'customer@example.test' }))).status, 400);
  const response = await newsletter(request('newsletter', { email: 'customer@example.test', consent: true }));
  assert.equal(response.status, 200);
  assert.equal(writes[0].table, 'NewsletterSubscriber');
  assert.equal(writes[0].payload.active, true);
  assert.match(writes[0].payload.unsubscribeToken, /^[a-f0-9]{64}$/);
  assert.doesNotMatch((await response.json()).message, /coupon|sent|inbox/i);
  databaseError = { message: 'offline' };
  assert.equal((await newsletter(request('newsletter', { email: 'customer@example.test', consent: true }))).status, 503);
  databaseError = null;
});
test('public form rate limits stop writes and unfinished recovery cannot fabricate a sent email', async () => {
  writes = []; limited = new Response('{}', { status: 429 });
  assert.equal((await contact(request('contact', message))).status, 429);
  assert.equal(writes.length, 0); limited = null;
  assert.equal((await recovery()).status, 503);
});
