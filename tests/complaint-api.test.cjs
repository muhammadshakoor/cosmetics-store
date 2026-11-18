const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { NextRequest } = require('next/server');
const initialMode = process.env.NODE_ENV;
const initialKey = process.env.RESEND_API_KEY;
const initialAdmin = process.env.ADMIN_EMAIL;
process.env.NODE_ENV = 'production';
let user = { id: 'customer', isAdmin: false };
let databaseError = null;
let emailFails = false;
let simulateOffEnd = false;
let savedPayload;
let readQueries = [];
const record = (id, userId, status = 'open') => ({ id, userId, name: userId, email: `${userId}@example.test`, category: 'Other',
  subject: `Question ${id}`, message: 'Please review this customer request.', orderId: null, status, createdAt: '2026-11-17T10:00:00Z', updatedAt: '2026-11-17T10:00:00Z' });
const records = [...Array.from({ length: 225 }, (_, index) => record(`customer-${index}`, 'customer', index % 3 === 0 ? 'resolved' : 'open')),
  ...Array.from({ length: 7 }, (_, index) => record(`private-${index}`, 'another-customer'))];
const database = { from(table) {
  assert.equal(table, 'Complaint');
  const state = { filters: {}, head: false, from: 0, to: 19 };
  const query = {
    select(columns, options) { state.head = options?.head === true; return this; },
    eq(column, value) { state.filters[column] = value; return this; },
    order() { return this; },
    range(from, to) { state.from = from; state.to = to; return this; },
    insert(payload) { savedPayload = payload; return this; },
    single: async () => ({ data: databaseError ? null : savedPayload, error: databaseError }),
    then(resolve) {
      readQueries.push({ ...state, filters: { ...state.filters } });
      const filtered = records.filter(row => Object.entries(state.filters).every(([key, value]) => row[key] === value));
      if (simulateOffEnd && !state.head && state.from >= filtered.length) return Promise.resolve({ data: null, count: null, error: { code: 'PGRST103' } }).then(resolve);
      // Simulate a project configured to return only seven rows per request.
      return Promise.resolve({ data: state.head ? null : filtered.slice(state.from, Math.min(state.to + 1, state.from + 7)),
        count: filtered.length, error: databaseError }).then(resolve);
    },
  };
  return query;
} };
const originalLoad = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === '@/lib/supabase') return { supabase: database };
  if (name === '@/lib/auth') return { getAuthUser: async () => user };
  if (name === '@/lib/rateLimit') return { rateLimit: async () => null };
  if (name === '@/lib/localComplaints') return { getLocalComplaints: () => [], addLocalComplaint: () => { throw new Error('Unexpected local write'); } };
  if (name === '@/lib/email') return { escapeHtml: value => value, sendEmail: async () => { if (emailFails) throw new Error('Delivery failed'); } };
  if (name.startsWith('@/')) return originalLoad.call(this, path.join(__dirname, '..', name.slice(2)), parent, isMain);
  return originalLoad.call(this, name, parent, isMain);
};
const { GET, POST } = require('../app/api/complaints/route.ts');
Module._load = originalLoad;
const load = (query = '') => GET(new NextRequest(`http://localhost/api/complaints${query}`));
test.after(() => {
  for (const [key, value] of Object.entries({ NODE_ENV: initialMode, RESEND_API_KEY: initialKey, ADMIN_EMAIL: initialAdmin })) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

test('customer inbox pagination scopes every record and count query and traverses small REST caps', async () => {
  readQueries = [];
  const response = await load('?page=11&pageSize=20');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.json();
  assert.equal(body.total, 225);
  assert.equal(body.complaints.length, 20);
  assert.equal(body.complaints[0].id, 'customer-200');
  assert.ok(body.complaints.every(complaint => complaint.userId === 'customer'));
  assert.deepEqual(body.statusCounts, { open: 150, in_progress: 0, resolved: 75 });
  assert.ok(readQueries.every(query => query.filters.userId === 'customer'));
  const last = await (await load('?page=12&pageSize=20')).json();
  assert.equal(last.complaints.length, 5);
  assert.equal(last.total, 225);
});

test('status filtering is applied before paging while counts remain complete', async () => {
  const body = await (await load('?page=2&pageSize=20&status=resolved')).json();
  assert.equal(body.total, 75);
  assert.equal(body.complaints.length, 20);
  assert.ok(body.complaints.every(complaint => complaint.status === 'resolved'));
  assert.equal(body.statusCounts.open, 150);
});

test('a filtered page that disappears returns an empty page with its current count for UI correction', async () => {
  simulateOffEnd = true;
  try {
    const response = await load('?page=5&pageSize=20&status=resolved');
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body.complaints, []);
    assert.equal(body.total, 75);
    assert.equal(body.page, 5);
    assert.equal(body.statusCounts.open, 150);
  } finally { simulateOffEnd = false; }
});

test('admin inbox sees full counts; invalid, unauthorized and failed reads never masquerade as empty lists', async () => {
  user = { id: 'admin', isAdmin: true };
  assert.equal((await (await load()).json()).total, 232);
  assert.equal((await load('?page=0')).status, 400);
  assert.equal((await load('?status=unknown')).status, 400);
  user = null;
  assert.equal((await load()).status, 401);
  user = { id: 'customer', isAdmin: false };
  databaseError = { message: 'Private database error' };
  const failed = await load();
  assert.equal(failed.status, 503);
  assert.doesNotMatch((await failed.json()).message, /Private database/);
  databaseError = null;
});

test('saved complaints report email delivery accurately without losing the saved acknowledgement', async () => {
  const input = { name: 'Customer', email: 'customer@example.test', category: 'Other', subject: 'Order question', message: 'Please review my purchase.' };
  const submit = () => POST(new NextRequest('http://localhost/api/complaints', { method: 'POST', body: JSON.stringify(input) }));
  delete process.env.ADMIN_EMAIL;
  delete process.env.RESEND_API_KEY;
  let response = await submit();
  assert.equal(response.status, 201);
  assert.equal((await response.json()).emailSent, false);
  process.env.RESEND_API_KEY = 'isolated-test-key'; emailFails = true;
  response = await submit();
  const failedDelivery = await response.json();
  assert.equal(response.status, 201);
  assert.equal(failedDelivery.emailSent, false);
  assert.ok(failedDelivery.id);
  emailFails = false;
  response = await submit();
  assert.equal((await response.json()).emailSent, true);
});
