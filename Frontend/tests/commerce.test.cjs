const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node', jsx: 'react-jsx' } });
const { CreateOrderInputSchema, QuoteInputSchema } = require('../types/api.ts');
const { commerceError, normalizeOrderItems, requireIdempotencyKey } = require('../lib/commerce.ts');

const input = () => ({
  orderItems: [{ productId: 'product-1', qty: 2 }],
  shippingAddress: { address: '123 Main Street', city: 'Lahore', postalCode: '54000', country: 'Pakistan' },
  phone: '+923001234567', paymentMethod: 'Cash on Delivery (COD)', expectedTotalPrice: 1200,
});

test('checkout discards forged names/prices/totals and normalizes a legacy item ID', () => {
  const parsed = CreateOrderInputSchema.parse({ ...input(), orderItems: [{ _id: 'product-1', qty: 2, name: 'Forged', price: 0.01 }], totalPrice: 0.01, discountAmount: 999999, itemsPrice: 0.01 });
  assert.deepEqual(parsed.orderItems, [{ productId: 'product-1', qty: 2 }]);
  assert.equal('totalPrice' in parsed, false);
  assert.equal('discountAmount' in parsed, false);
});

test('checkout rejects unsupported payments, invalid phone/address and fractional quantities', () => {
  for (const change of [{ paymentMethod: 'Stripe (TXN-FAKE)' }, { phone: '1234567' }, { shippingAddress: { ...input().shippingAddress, country: 'Other' } }, { orderItems: [{ productId: 'p', qty: 1.5 }] }, { orderItems: [{ qty: 1 }] }]) {
    assert.equal(CreateOrderInputSchema.safeParse({ ...input(), ...change }).success, false);
  }
});

test('quotes require an actual cart rather than trusting a client order total', () => {
  assert.equal(QuoteInputSchema.safeParse({ orderTotal: 5000, couponCode: 'SAVE' }).success, false);
  assert.equal(QuoteInputSchema.parse({ orderItems: [{ productId: 'p', qty: 1 }], couponCode: ' save ' }).couponCode, 'SAVE');
});

test('duplicate IDs are consolidated and deterministically sorted for idempotent requests', () => {
  assert.deepEqual(normalizeOrderItems([{ productId: 'z', qty: 2 }, { productId: 'a', qty: 1 }, { productId: 'z', qty: 3 }]), [{ productId: 'a', qty: 1 }, { productId: 'z', qty: 5 }]);
  assert.throws(() => normalizeOrderItems([{ productId: 'p', qty: 600 }, { productId: 'p', qty: 600 }]));
});

test('idempotency key must identify a stable nonempty checkout attempt', () => {
  const key = 'test-checkout-attempt-123';
  assert.equal(requireIdempotencyKey(key), key);
  for (const invalid of [null, '', 'short', 'contains spaces and is invalid']) assert.throws(() => requireIdempotencyKey(invalid));
});

test('known DB conflicts are actionable and unexpected DB details stay private', () => {
  assert.equal(commerceError({ message: 'CHECKOUT_PRICE_CHANGED' }).status, 409);
  assert.equal(commerceError({ message: 'CHECKOUT_STOCK' }).status, 409);
  const missing = commerceError({ code: 'PGRST202', message: 'private database internals' });
  assert.equal(missing.status, 503);
  assert.match(missing.message, /migration/);
  assert.doesNotMatch(commerceError({ message: 'password=private' }).message, /private/);
});

let rpcResult;
const rpcCalls = [];
const originalLoad = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === '@/lib/supabase') return { supabase: { rpc: async (...args) => { rpcCalls.push(args); return rpcResult; } } };
  if (name === '@/lib/auth') return { getAuthUser: async () => ({ id: 'customer', name: 'Customer', email: 'customer@example.test', isAdmin: false }), toClient: ({ id, ...rest }) => ({ _id: id, ...rest }) };
  if (name === '@/types/api') return require('../types/api.ts');
  if (name === '@/lib/commerce') return require('../lib/commerce.ts');
  return originalLoad.call(this, name, parent, isMain);
};
const { POST } = require('../app/api/orders/route.ts');
Module._load = originalLoad;

test('order endpoint sends only authoritative inputs to one atomic RPC and returns saved totals', async () => {
  rpcCalls.length = 0;
  rpcResult = { data: { replayed: true, order: { id: 'saved-order', totalPrice: 1200, orderItems: [{ id: 'item', productId: 'product-1', name: 'Actual product', price: 500, qty: 2 }] } }, error: null };
  const response = await POST(new Request('http://localhost/api/orders', { method: 'POST', headers: { 'Idempotency-Key': 'stable-checkout-key-123' }, body: JSON.stringify({ ...input(), totalPrice: 0.01, discountAmount: 99999 }) }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).totalPrice, 1200);
  assert.equal(rpcCalls.length, 1);
  assert.equal(rpcCalls[0][0], 'checkout_create_order');
  assert.deepEqual(rpcCalls[0][1].p_items, [{ productId: 'product-1', qty: 2 }]);
  assert.equal('totalPrice' in rpcCalls[0][1], false);
  assert.equal(rpcCalls[0][1].p_expected_total, 1200);
});

test('unconfigured database RPC fails safely instead of returning a locally fabricated order', async () => {
  rpcResult = { data: null, error: { code: 'PGRST202', message: 'function not found' } };
  const response = await POST(new Request('http://localhost/api/orders', { method: 'POST', headers: { 'Idempotency-Key': 'stable-checkout-key-456' }, body: JSON.stringify(input()) }));
  assert.equal(response.status, 503);
  assert.match((await response.json()).message, /migration/);
});

test('only confirmed transaction rollbacks release a pending checkout attempt', async () => {
  for (const code of ['CHECKOUT_STOCK', 'CHECKOUT_PRODUCT', 'CHECKOUT_COUPON', 'CHECKOUT_PRICE_CHANGED', 'CHECKOUT_INPUT', 'CHECKOUT_PAYMENT']) {
    rpcResult = { data: null, error: { code: 'P0001', message: code } };
    const response = await POST(new Request('http://localhost/api/orders', { method: 'POST', headers: { 'Idempotency-Key': 'recover-checkout-key-123' }, body: JSON.stringify(input()) }));
    assert.equal((await response.json()).checkoutRejected, true, code);
  }
  for (const error of [{ code: 'P0001', message: 'CHECKOUT_IDEMPOTENCY' }, { code: 'P0001', message: 'ORDER_FORBIDDEN' }, { code: 'PGRST202', message: 'function missing' }, { message: 'network failed' }]) {
    rpcResult = { data: null, error };
    const response = await POST(new Request('http://localhost/api/orders', { method: 'POST', headers: { 'Idempotency-Key': 'recover-checkout-key-123' }, body: JSON.stringify(input()) }));
    assert.equal((await response.json()).checkoutRejected, undefined, error.message);
  }
  const invalid = await POST(new Request('http://localhost/api/orders', { method: 'POST', headers: { 'Idempotency-Key': 'recover-checkout-key-123' }, body: JSON.stringify({ ...input(), paymentMethod: 'Card' }) }));
  assert.equal((await invalid.json()).checkoutRejected, undefined, 'pre-RPC validation is not a verified rollback');
});
