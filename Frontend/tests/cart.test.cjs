const { test } = require('node:test');
const assert = require('node:assert/strict');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { addCartItem, sanitizeCart, setCartQuantity } = require('../lib/cart.ts');
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
test('corrupt saved carts are discarded and valid duplicates are merged with stock limits', () => {
  assert.deepEqual(sanitizeCart({ product: 'p1' }), []);
  assert.deepEqual(sanitizeCart([null, { ...item, price: '450' }, { ...item, qty: -1 }, { ...item, countInStock: 0 }]), []);
  assert.equal(sanitizeCart([{ ...item, qty: 4 }, { ...item, qty: 4 }])[0].qty, 5);
});
test('Pakistani mobile formats normalize consistently and invalid numbers are rejected', () => {
  for (const value of ['0300 1234567', '0300-1234567', '+92 300 1234567', '923001234567']) assert.equal(normalizePakistanPhone(value), '+923001234567');
  for (const value of ['1234567', '+12025550123', '0300123456', '030012345678', '03abc123456']) assert.equal(normalizePakistanPhone(value), null);
});
