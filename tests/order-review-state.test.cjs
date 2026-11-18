const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });

let user;
let order;
let reviewResult;
let reviewFilters;
let reviewCalls = 0;
const originalLoad = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === '@/lib/auth') return { getAuthUser: async () => user, toClient: ({ id, ...rest }) => ({ _id: id, ...rest }) };
  if (name === '@/lib/commerce') return require('../lib/commerce.ts');
  if (name === '@/lib/supabase') return { supabase: { from(table) {
    if (table === 'Order') return { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: order, error: null }) };
    assert.equal(table, 'Review'); reviewCalls++; reviewFilters = {};
    return {
      select(columns) { assert.equal(columns, 'productId'); return this; },
      eq(column, value) { reviewFilters[column] = value; return this; },
      in(column, values) { reviewFilters[column] = values; return this; },
      limit(value) { reviewFilters.limit = value; return Promise.resolve(reviewResult); },
    };
  } } };
  return originalLoad.call(this, name, parent, isMain);
};
const { GET } = require('../app/api/orders/[id]/route.ts');
Module._load = originalLoad;

function reset() {
  user = { id: 'customer', isAdmin: false };
  order = { id: 'delivered-order', userId: user.id, status: 'delivered', address: '123 Test Road', city: 'Lahore', postalCode: '54000', country: 'Pakistan',
    orderItems: [{ id: 'item-one', productId: 'soap' }, { id: 'item-two', productId: 'lotion' }, { id: 'item-three', productId: 'soap' }] };
  reviewResult = { data: [{ productId: 'soap' }], error: null };
  reviewCalls = 0; reviewFilters = {};
}
const load = () => GET(new Request('http://localhost/api/orders/delivered-order'), { params: Promise.resolve({ id: 'delivered-order' }) });

test('delivered order reloads include persisted reviewed products scoped to the authenticated owner', async () => {
  reset();
  for (let reload = 0; reload < 2; reload++) {
    const response = await load();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const saved = await response.json();
    assert.deepEqual(saved.reviewedProductIds, ['soap']);
    assert.equal(saved.orderItems[0]._id, 'item-one');
    assert.deepEqual(reviewFilters, { userId: 'customer', productId: ['soap', 'lotion'], limit: 2 });
  }
});

test('a failed review lookup preserves order tracking and explicitly marks review state unavailable', async () => {
  reset(); reviewResult = { data: null, error: { message: 'Review table unavailable' } };
  const response = await load();
  assert.equal(response.status, 200);
  const saved = await response.json();
  assert.equal(saved._id, order.id);
  assert.equal(saved.reviewedProductIds, null);
  assert.equal(saved.shippingAddress.address, order.address);
});

test('unauthorized customers cannot read order or review state and administrators do not inherit customer review actions', async () => {
  reset(); user = null;
  assert.equal((await load()).status, 401);
  assert.equal(reviewCalls, 0);
  user = { id: 'another-customer', isAdmin: false };
  assert.equal((await load()).status, 403);
  assert.equal(reviewCalls, 0);
  user = { id: 'administrator', isAdmin: true };
  const response = await load();
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).reviewedProductIds, []);
  assert.equal(reviewCalls, 0);
});

test('undelivered and empty orders need no review lookup', async () => {
  reset(); order.status = 'confirmed';
  assert.deepEqual((await (await load()).json()).reviewedProductIds, []);
  order.status = 'delivered'; order.orderItems = [];
  assert.deepEqual((await (await load()).json()).reviewedProductIds, []);
  assert.equal(reviewCalls, 0);
});
