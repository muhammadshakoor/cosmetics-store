const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { parseStoredUser, sanitizeWishlistIds, safeRedirectPath } = require('../lib/browserState.ts');
const { validateImageUpload, MAX_IMAGE_BYTES } = require('../lib/imageUpload.ts');
const { ComplaintInputSchema } = require('../lib/complaints.ts');

test('corrupt and expired browser sessions cannot restore account/admin state', () => {
  const token = (exp) => `header.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.signature`;
  const user = { _id: 'customer', name: 'Customer', email: 'customer@example.test', isAdmin: false, token: token(2000) };
  assert.equal(parseStoredUser(user, 1000_000)._id, 'customer');
  for (const invalid of [null, {}, [], { ...user, token: 'corrupt' }, { ...user, token: token(500) }, { ...user, isAdmin: 'true' }]) assert.equal(parseStoredUser(invalid, 1000_000), null);
  assert.deepEqual(sanitizeWishlistIds({ corrupted: true }), []);
  assert.deepEqual(sanitizeWishlistIds(['product', 'product', null, {}, '', 'x'.repeat(121), 'second']), ['product', 'second']);
});

test('account redirects remain internal for slash-prefixed and malformed destinations', () => {
  assert.equal(safeRedirectPath('checkout'), '/checkout');
  assert.equal(safeRedirectPath('/admin/orders'), '/admin/orders');
  assert.equal(safeRedirectPath('/products?category=soaps'), '/products?category=soaps');
  for (const destination of ['//other.example', '/\\other.example', '\\other.example']) assert.equal(safeRedirectPath(destination), '/');
});

test('uploads reject unsupported, oversized and MIME-spoofed files', () => {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(validateImageUpload('image/png', png.length, png), '.png');
  assert.throws(() => validateImageUpload('image/svg+xml', 6, Buffer.from('<svg/>')), /not supported/);
  assert.throws(() => validateImageUpload('image/jpeg', png.length, png), /contents/);
  assert.throws(() => validateImageUpload('image/png', MAX_IMAGE_BYTES + 1, png), /4 MB/);
});

test('complaints enforce bounded content and known categories', () => {
  const valid = { name: 'Customer', email: 'customer@example.test', category: 'Other', subject: 'Order question', message: 'Please review my purchase.', orderId: '' };
  assert.equal(ComplaintInputSchema.parse(valid).orderId, null);
  for (const invalid of [{ ...valid, category: 'arbitrary' }, { ...valid, message: 'x'.repeat(5001) }, { ...valid, email: 'bad' }]) assert.equal(ComplaintInputSchema.safeParse(invalid).success, false);
});

let databaseResult;
let operation;
let localWrites = 0;
const mockSupabase = {
  from(table) {
    const query = {
      select() { return this; }, eq() { return this; }, order() { return this; }, limit() { return this; },
      insert() { operation = `insert:${table}`; return this; },
      upsert() { operation = `upsert:${table}`; return this; },
      delete() { operation = `delete:${table}`; return this; },
      single: async () => databaseResult,
      maybeSingle: async () => databaseResult,
      then(resolve) { return Promise.resolve(databaseResult).then(resolve); },
    };
    return query;
  },
};
const originalLoad = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === '@/lib/supabase') return { supabase: mockSupabase };
  if (name === '@/lib/auth') return { getAuthUser: async () => ({ id: 'customer', isAdmin: false }) };
  if (name === '@/lib/localComplaints') return { addLocalComplaint: () => { localWrites++; }, getLocalComplaints: () => [] };
  if (name === '@/lib/complaints') return require('../lib/complaints.ts');
  if (name === '@/lib/rateLimit') return { rateLimit: async () => null };
  if (name === '@/lib/email') return { escapeHtml: (value) => value, sendEmail: async () => {} };
  return originalLoad.call(this, name, parent, isMain);
};
const complaints = require('../app/api/complaints/route.ts');
const wishlist = require('../app/api/wishlist/route.ts');
Module._load = originalLoad;

test('production complaint failure is visible and never acknowledged through local disk fallback', async () => {
  const mode = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    databaseResult = { data: null, error: { code: 'database-unavailable' } };
    const response = await complaints.POST(new Request('http://localhost/api/complaints', { method: 'POST', body: JSON.stringify({ name: 'Customer', email: 'customer@example.test', category: 'Other', subject: 'Order question', message: 'Please review my purchase.' }) }));
    assert.equal(response.status, 503);
    assert.match((await response.json()).message, /not been saved/);
    assert.equal(localWrites, 0);
  } finally { if (mode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = mode; }
});

test('wishlist returns singular product relations and surfaces failed optimistic mutations', async () => {
  databaseResult = { data: [{ id: 'saved', productId: 'product', Product: { id: 'product', name: 'Soap' } }], error: null };
  const loaded = await wishlist.GET(new Request('http://localhost/api/wishlist'));
  assert.equal((await loaded.json())[0].product._id, 'product');
  databaseResult = { data: null, error: { code: 'database-unavailable' } };
  const failed = await wishlist.POST(new Request('http://localhost/api/wishlist', { method: 'POST', body: JSON.stringify({ productId: 'product', wishlisted: true }) }));
  assert.equal(failed.status, 503);
  assert.equal(operation, 'upsert:Wishlist');
  databaseResult = { data: null, error: null };
  const removed = await wishlist.POST(new Request('http://localhost/api/wishlist', { method: 'POST', body: JSON.stringify({ productId: 'product', wishlisted: false }) }));
  assert.equal(operation, 'delete:Wishlist');
  assert.equal((await removed.json()).wishlisted, false);
});
