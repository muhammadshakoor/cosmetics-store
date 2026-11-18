const { test } = require('node:test');
const assert = require('node:assert/strict');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { addCartItem, addCartItemWithResult, cartAdditionFeedback, createCartStore, persistCheckoutCoupon, sanitizeCart, setCartQuantity } = require('../lib/cart.ts');
const { normalizePakistanPhone } = require('../lib/store.ts');

const item = { product: 'p1', name: 'Soap', image: '/soap.jpg', price: 450, qty: 1, countInStock: 5 };

test('adding an existing item increments rather than replacing the quantity', () => {
  assert.equal(addCartItem([{ ...item, qty: 3 }], item)[0].qty, 4);
});
test('add and direct quantity updates cannot exceed available stock', () => {
  assert.equal(addCartItem([{ ...item, qty: 5 }], item)[0].qty, 5);
  assert.equal(setCartQuantity([item], 'p1', 100)[0].qty, 5);
  assert.equal(setCartQuantity([item], 'p1', -2)[0].qty, 1);
  assert.equal(setCartQuantity([item], 'p1', Number.NaN)[0].qty, 1);
});

test('partially accepted additions report the accepted quantity and stop claiming success at the stock limit', () => {
  const partial = addCartItemWithResult([{ ...item, qty: 4 }], { ...item, qty: 3 });
  assert.equal(partial.items[0].qty, 5);
  assert.deepEqual(partial.addition, { addedQty: 1, requestedQty: 3, reason: 'stock' });
  assert.equal(cartAdditionFeedback(partial.addition, item.name).kind, 'partial');
  assert.match(cartAdditionFeedback(partial.addition, item.name).message, /Added 1 of 3/);
  const full = addCartItemWithResult(partial.items, item);
  assert.equal(full.addition.addedQty, 0);
  assert.equal(cartAdditionFeedback(full.addition, item.name).kind, 'error');
  assert.match(cartAdditionFeedback(full.addition, item.name).message, /stock limit/);
});

test('fresh stock data can reduce a stale cart without reporting a negative or successful addition', () => {
  const result = addCartItemWithResult([{ ...item, qty: 5 }], { ...item, countInStock: 3 });
  assert.equal(result.items[0].qty, 3);
  assert.equal(result.addition.addedQty, 0);
  assert.equal(cartAdditionFeedback(result.addition, item.name).kind, 'error');
});

test('multi-item additions report actual accepted units instead of requested units', () => {
  const result = addCartItemWithResult([], { ...item, qty: 8 });
  assert.equal(result.items[0].qty, 5);
  assert.equal(result.addition.addedQty, 5);
  assert.equal(result.addition.requestedQty, 8);
  const valid = addCartItemWithResult([], { ...item, qty: 2 });
  assert.equal(cartAdditionFeedback(valid.addition, item.name).kind, 'success');
  assert.match(cartAdditionFeedback(valid.addition, item.name).message, /Added 2/);
});

test('a restored cart accepts rapid additions against the latest committed quantities without overwriting saved items', () => {
  const entries = new Map([['cartItems', JSON.stringify([{ ...item, qty: 4 }])]]);
  let writes = 0;
  const store = createCartStore(() => ({ getItem: key => entries.get(key), setItem: (key, value) => { writes++; entries.set(key, value); } }));
  assert.equal(store.getServerSnapshot().ready, false);
  assert.equal(store.add(item).reason, 'loading');
  const unsubscribe = store.subscribe(() => {});
  assert.equal(store.getSnapshot().items[0].qty, 4);
  assert.equal(writes, 0, 'hydration must not replace the saved cart');
  const first = store.add({ ...item, qty: 3 });
  const second = store.add(item);
  assert.equal(first.addedQty, 1);
  assert.equal(second.addedQty, 0);
  assert.equal(JSON.parse(entries.get('cartItems'))[0].qty, 5);
  assert.equal(store.getServerSnapshot().ready, false, 'SSR snapshot remains stable after browser updates');
  unsubscribe();
});

test('blocked persistence leaves the current tab cart usable and quantities consistent', () => {
  const store = createCartStore(() => { throw new Error('Storage disabled'); });
  const unsubscribe = store.subscribe(() => {});
  assert.equal(store.getSnapshot().ready, true);
  assert.equal(store.add({ ...item, qty: 2 }).addedQty, 2);
  store.setQuantity(item.product, 3);
  assert.equal(store.getSnapshot().items[0].qty, 3);
  store.remove(item.product);
  assert.deepEqual(store.getSnapshot().items, []);
  unsubscribe();
});

test('checkout storage denial produces an actionable error for both getter and quota failures', () => {
  const denied = () => { throw new Error('SecurityError'); };
  assert.match(persistCheckoutCoupon(denied, null), /Allow storage/);
  for (const coupon of [null, { code: 'WELCOME' }]) {
    const unavailable = () => ({ setItem() { throw new Error('QuotaExceededError'); }, removeItem() { throw new Error('SecurityError'); } });
    assert.match(persistCheckoutCoupon(unavailable, coupon), /order has not been sent/);
  }
  const entries = new Map();
  const available = () => ({ setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) });
  assert.equal(persistCheckoutCoupon(available, { code: 'WELCOME' }), null);
  assert.deepEqual(JSON.parse(entries.get('coupon')), { code: 'WELCOME' });
  assert.equal(persistCheckoutCoupon(available, null), null);
  assert.equal(entries.has('coupon'), false);
});
test('corrupt saved carts are discarded and valid duplicates are merged with stock limits', () => {
  assert.deepEqual(sanitizeCart({ product: 'p1' }), []);
  assert.deepEqual(sanitizeCart([null, { ...item, price: '450' }, { ...item, qty: -1 }, { ...item, countInStock: 0 }]), []);
  assert.equal(sanitizeCart([{ ...item, qty: 4 }, { ...item, qty: 4 }])[0].qty, 5);
});
test('Pakistani mobile formats normalize consistently and invalid numbers are rejected', () => {
  for (const value of ['0300 1234567', '0300-1234567', '+92 300 1234567', '923001234567']) assert.equal(normalizePakistanPhone(value), '+923001234567');
  for (const value of ['1234567', '+12025550123', '0300123456', '030012345678', '03abc123456']) assert.equal(normalizePakistanPhone(value), null);
});
