const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { isProductImageSource, ManagedProductInputSchema } = require('../lib/productInput.ts');
const { VerifiedReviewInputSchema } = require('../lib/reviews.ts');
const { readAllRows } = require('../lib/pagination.ts');

test('product images accept bundled paths and uploads and reject unsafe sources', () => {
  for (const image of ['/products/soap.jpg', '/uploads/soap.png', 'https://res.cloudinary.com/shop/soap.jpg']) assert.equal(isProductImageSource(image), true, image);
  for (const image of ['', '//evil.example/a.jpg', '/\\evil.example/a.jpg', 'javascript:alert(1)', 'data:image/png;base64,x', 'https://user:password@example.test/a']) assert.equal(isProductImageSource(image), false, image);
  assert.equal(ManagedProductInputSchema.safeParse({ ...productInput(), image: '/products/soap.jpg' }).success, true);
});

test('complete reads traverse a configured cap smaller than the requested page size', async () => {
  const source = [1, 2, 3, 4, 5];
  const offsets = [];
  const page = async (from, to) => { offsets.push(from); return { data: source.slice(from, Math.min(from + 2, to + 1)), count: source.length, error: null }; };
  assert.deepEqual(await readAllRows(page), source);
  assert.deepEqual(offsets, [0, 2, 4]);
  offsets.length = 0;
  assert.deepEqual(await readAllRows(page, 3), [1, 2, 3]);
  assert.deepEqual(offsets, [0, 2]);
  await assert.rejects(readAllRows(async () => ({ data: null, count: 5, error: new Error('database offline') })), /offline/);
  await assert.rejects(readAllRows(async () => ({ data: [], count: 5, error: null })), /changed while loading/);
});

function productInput() {
  return { name: 'Rose Soap', brand: 'Lumina', category: 'soaps', price: 499, countInStock: 10, image: '/products/soap.jpg', description: 'Fresh handmade rose soap', expectedInventoryVersion: 0 };
}
let user = { id: 'admin', isAdmin: true };
let product = { id: 'soap', ...productInput(), countInStock: 9, inventoryVersion: 1 };
let updates = 0;
let rpcResult = { data: null, error: null };
const rpcCalls = [];
const originalLoad = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === '@/lib/supabase') return { supabase: {
    rpc: async (...args) => { rpcCalls.push(args); return rpcResult; },
    from() {
      const filters = {};
      let payload;
      return {
        update(value) { payload = value; return this; }, eq(key, value) { filters[key] = value; return this; }, select() { return this; },
        async maybeSingle() {
          if (filters.id !== product.id || filters.inventoryVersion !== product.inventoryVersion) return { data: null, error: null };
          updates++;
          const inventoryVersion = product.inventoryVersion + Number(payload.countInStock !== product.countInStock);
          product = { ...product, ...payload, inventoryVersion };
          return { data: product, error: null };
        },
      };
    },
  } };
  if (name === '@/lib/auth') return { getAuthUser: async () => user, toClient: ({ id, ...rest }) => ({ _id: id, ...rest }) };
  if (name === '@/lib/localProducts') return {};
  if (name === '@/lib/restock') return { deliverRestockAlerts: async () => {} };
  const paths = { '@/lib/productInput': '../lib/productInput.ts', '@/lib/reviews': '../lib/reviews.ts', '@/lib/commerce': '../lib/commerce.ts', '@/lib/adminOrders': '../lib/adminOrders.ts' };
  if (paths[name]) return require(paths[name]);
  return originalLoad.call(this, name, parent, isMain);
};
const products = require('../app/api/products/[id]/route.ts');
const reviews = require('../app/api/reviews/route.ts');
const reporting = require('../app/api/admin/stats/route.ts');
const orders = require('../app/api/orders/all/route.ts');
Module._load = originalLoad;
const request = (path, body) => new Request(`http://localhost/api/${path}`, body ? { method: 'POST', body: JSON.stringify(body) } : undefined);

test('an edit opened before a sale cannot recreate stock; a fresh edit succeeds', async () => {
  updates = 0;
  product = { id: 'soap', ...productInput(), countInStock: 9, inventoryVersion: 1 };
  const stale = await products.PUT(request('products/soap', productInput()), { params: Promise.resolve({ id: 'soap' }) });
  assert.equal(stale.status, 409);
  assert.equal(product.countInStock, 9);
  assert.equal(updates, 0);
  const fresh = await products.PUT(request('products/soap', { ...productInput(), expectedInventoryVersion: 1, countInStock: 9, description: 'Updated soap description' }), { params: Promise.resolve({ id: 'soap' }) });
  assert.equal(fresh.status, 200);
  assert.equal(product.countInStock, 9);
  assert.equal(product.description, 'Updated soap description');
  const restock = await products.PUT(request('products/soap', { ...productInput(), expectedInventoryVersion: 1, countInStock: 12 }), { params: Promise.resolve({ id: 'soap' }) });
  assert.equal(restock.status, 200);
  assert.equal(product.inventoryVersion, 2);
});

test('invalid review input is rejected before a database call; valid reviews use one transaction', async () => {
  rpcCalls.length = 0;
  const input = { productId: 'soap', orderId: 'delivered', rating: 5, comment: 'Excellent soap' };
  for (const changed of [{ comment: '' }, { comment: 'x'.repeat(501) }, { rating: 1.5 }, { orderId: '' }, { rating: 0 }]) {
    assert.equal(VerifiedReviewInputSchema.safeParse({ ...input, ...changed }).success, false);
    const response = await reviews.POST(request('reviews', { ...input, ...changed }));
    assert.equal(response.status, 400);
  }
  assert.equal(rpcCalls.length, 0);
  user = { id: 'customer', isAdmin: false };
  rpcResult = { data: { id: 'review', ...input }, error: null };
  const response = await reviews.POST(request('reviews', input));
  assert.equal(response.status, 201);
  assert.deepEqual(rpcCalls, [['commerce_create_review', { p_actor_id: 'customer', p_product_id: 'soap', p_order_id: 'delivered', p_rating: 5, p_comment: 'Excellent soap' }]]);
  rpcResult = { data: null, error: { message: 'REVIEW_DUPLICATE', code: 'P0001' } };
  assert.equal((await reviews.POST(request('reviews', input))).status, 409);
  user = { id: 'admin', isAdmin: true };
});

test('reporting uses database aggregates and order pagination preserves full counts', async () => {
  rpcCalls.length = 0;
  rpcResult = { data: { totalOrders: 1005, totalRevenue: 1_005_000 }, error: null };
  const stats = await reporting.GET(request('admin/stats'));
  assert.deepEqual(await stats.json(), rpcResult.data);
  assert.deepEqual(rpcCalls[0], ['commerce_admin_stats', { p_actor_id: 'admin' }]);
  rpcResult = { data: { orders: [{ id: 'last-page', orderItems: [] }], total: 1005, page: 11, pageSize: 100 }, error: null };
  const response = await orders.GET(request('orders/all?page=11&pageSize=100&status=delivered&search=Customer'));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.orders[0]._id, 'last-page');
  assert.equal(data.total, 1005);
  assert.deepEqual(rpcCalls[1], ['commerce_admin_orders', { p_actor_id: 'admin', p_page: 11, p_page_size: 100, p_status: 'delivered', p_search: 'Customer' }]);
  for (const query of ['page=0', 'pageSize=101', 'status=unknown', `search=${'a'.repeat(101)}`]) assert.equal((await orders.GET(request(`orders/all?${query}`))).status, 400);
  user = { id: 'customer', isAdmin: false };
  assert.equal((await orders.GET(request('orders/all'))).status, 401);
  assert.equal((await reporting.GET(request('admin/stats'))).status, 401);
  user = { id: 'admin', isAdmin: true };
});
