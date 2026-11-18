const test = require('node:test');
const assert = require('node:assert/strict');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { saveCheckoutAttempt, loadCheckoutAttempt, clearCheckoutAttempt, confirmCheckoutAttempt, isDefinitiveCheckoutRejection } = require('../lib/checkoutAttempt.ts');
const { ApiError, apiFetch } = require('../lib/api.ts');

function storage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}
function attempt(userId = 'customer-one') {
  return {
    version: 1, key: `saved-checkout-${userId}-123`, userId, createdAt: '2020-01-01T00:00:00.000Z',
    payload: { orderItems: [{ productId: 'last-item', qty: 1 }], shippingAddress: { address: '123 Main Street', city: 'Lahore', postalCode: '54000', country: 'Pakistan' }, phone: '+923001234567', paymentMethod: 'Cash on Delivery (COD)', couponCode: 'LASTUSE', expectedTotalPrice: 1124.75 },
    items: [{ productId: 'last-item', name: 'Last available item', qty: 1, price: 1249.72 }],
  };
}

test('a lost response is recovered after reload with the original key and payload, even after stock and coupon are consumed', async () => {
  const browser = storage();
  const original = attempt();
  const frozen = saveCheckoutAttempt(browser, original);
  original.payload.expectedTotalPrice = 9999;
  original.payload.shippingAddress.city = 'Karachi';
  original.payload.orderItems[0].qty = 5;
  const requests = [];
  let committed;
  let stock = 1;
  let couponRemaining = 1;
  const request = async (path, options, token) => {
    const key = options.headers['Idempotency-Key'];
    requests.push({ path, key, body: options.body, token });
    if (committed?.key === key) { assert.equal(options.body, committed.body); return { _id: committed.orderId }; }
    assert.equal(stock, 1);
    assert.equal(couponRemaining, 1);
    stock = 0; couponRemaining = 0;
    committed = { key, body: options.body, orderId: 'one-confirmed-order' };
    throw new TypeError('Response interrupted after server commit');
  };
  await assert.rejects(confirmCheckoutAttempt(frozen, 'current-token', request), /interrupted/);
  const restored = loadCheckoutAttempt(browser, original.userId);
  assert.equal(restored.payload.expectedTotalPrice, 1124.75);
  assert.equal(restored.payload.shippingAddress.city, 'Lahore');
  assert.equal(restored.payload.orderItems[0].qty, 1);
  assert.equal(restored.createdAt, '2020-01-01T00:00:00.000Z'); // Pending attempts do not expire into a second order.
  assert.deepEqual(await confirmCheckoutAttempt(restored, 'refreshed-token', request), { _id: 'one-confirmed-order' });
  assert.equal(requests.length, 2);
  assert.equal(requests[0].key, requests[1].key);
  assert.equal(requests[0].body, requests[1].body);
  assert.equal(requests[1].token, 'refreshed-token');
  clearCheckoutAttempt(browser, original.userId);
  assert.equal(loadCheckoutAttempt(browser, original.userId), null);
});

test('saved attempts are isolated by customer and not regenerated when another account checks out', () => {
  const browser = storage();
  saveCheckoutAttempt(browser, attempt('one'));
  saveCheckoutAttempt(browser, attempt('two'));
  assert.equal(loadCheckoutAttempt(browser, 'one').userId, 'one');
  assert.equal(loadCheckoutAttempt(browser, 'two').userId, 'two');
  clearCheckoutAttempt(browser, 'two');
  assert.equal(loadCheckoutAttempt(browser, 'two'), null);
  assert.equal(loadCheckoutAttempt(browser, 'one').key, 'saved-checkout-one-123');
});

test('only explicitly identified transaction rejections resolve an unconfirmed attempt', () => {
  for (const status of [400, 409]) {
    assert.equal(isDefinitiveCheckoutRejection(new ApiError('Rejected', status, { checkoutRejected: true })), true);
    assert.equal(isDefinitiveCheckoutRejection(new ApiError('Unknown outcome', status)), false);
  }
  for (const status of [401, 403, 404, 408, 429, 500, 503]) {
    assert.equal(isDefinitiveCheckoutRejection(new ApiError('Cannot confirm', status, { checkoutRejected: true })), false);
  }
  assert.equal(isDefinitiveCheckoutRejection(new TypeError('Network interrupted')), false);
});

test('a malformed success body remains unconfirmed and keeps the saved attempt available', async () => {
  const browser = storage();
  const saved = saveCheckoutAttempt(browser, attempt());
  await assert.rejects(confirmCheckoutAttempt(saved, 'token', async () => ({})), /could not be confirmed/);
  assert.equal(loadCheckoutAttempt(browser, saved.userId).key, saved.key);
});

test('damaged recovery data and unavailable storage raise errors instead of silently allowing another order', () => {
  const browser = storage();
  browser.setItem('lumina-checkout-attempt:customer-one', '{interrupted');
  assert.throws(() => loadCheckoutAttempt(browser, 'customer-one'));
  assert.throws(() => saveCheckoutAttempt({ ...browser, setItem: () => { throw new Error('Storage denied'); } }, attempt()), /Storage denied/);
});

test('API errors retain status and business metadata; existing header objects remain intact', async (context) => {
  const originalFetch = global.fetch;
  context.after(() => { global.fetch = originalFetch; });
  global.fetch = async (_url, options) => {
    assert.equal(options.headers.get('Idempotency-Key'), 'stable-key-123456');
    assert.equal(options.headers.get('Authorization'), 'Bearer token');
    return new Response(JSON.stringify({ message: 'Current total changed', checkoutRejected: true }), { status: 409, headers: { 'Content-Type': 'application/json' } });
  };
  await assert.rejects(apiFetch('/orders', { method: 'POST', headers: new Headers({ 'Idempotency-Key': 'stable-key-123456' }) }, 'token'), (error) => error instanceof ApiError && error.status === 409 && error.data.checkoutRejected === true);
});
