const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });

const { getJwtSecret } = require('../src/config/auth.ts');
const { assertDisposableLocalSeed } = require('../src/config/seedSafety.ts');

test('patched query parser and watcher matcher retain their supported behavior', () => {
  const parser = require('express/lib/utils').compileQueryParser('extended');
  assert.deepEqual(parser('filter[category]=soaps'), { filter: { category: 'soaps' } });
  const match = require('nodemon/lib/monitor/match');
  const result = match(['src/server.ts', 'src/server.test.ts'], ['**/*.ts', '!**/*.test.ts']);
  assert.equal(result.watched, 1);
  assert.equal(result.ignored, 1);
  assert.ok(result.result[0].endsWith('server.ts'));
});
const secret = 'test-only-auth-secret-7e2a9c4f6b8d1e3a';
const customer = { id: 'customer', name: 'Customer', email: 'customer@example.test', isAdmin: false, authVersion: 2, emailVerified: true };
let databaseResult = { data: null, error: null };
let databaseCalls = 0;
let seedWrites = [];
let seedError = null;
const database = {
  from(table) {
    databaseCalls++;
    return {
      select() { return this; }, eq() { return this; }, order() { return this; },
      single: async () => databaseResult,
      then(resolve) { return Promise.resolve(databaseResult).then(resolve); },
      delete() { return { neq: async () => { seedWrites.push({ table, action: 'delete' }); return { error: seedError }; } }; },
      insert(payload) { seedWrites.push({ table, action: 'insert', payload }); return Promise.resolve({ error: seedError }); },
    };
  },
};

function withMockLoads(load) {
  const original = Module._load;
  Module._load = function (name, parent, isMain) {
    if (name === '../config/supabase' || name === '@/lib/supabase') return { supabase: database };
    if (name === 'next/server') return { NextResponse: { json: (body, init) => Response.json(body, init) } };
    if (name === 'bcryptjs') return bcrypt;
    if (name === 'dotenv') return { config() {} };
    if (name === '@supabase/supabase-js') return { createClient() { throw new Error('Reached disposable seed client'); } };
    if (name === '@prisma/client') return { PrismaClient: class { constructor() { throw new Error('Reached disposable seed client'); } } };
    return original.call(this, name, parent, isMain);
  };
  try { return load(); } finally { Module._load = original; }
}
const orders = withMockLoads(() => require('../src/controllers/order.controller.ts'));
const products = withMockLoads(() => require('../src/controllers/product.controller.ts'));
const users = withMockLoads(() => require('../src/controllers/user.controller.ts'));
const { protect, admin } = withMockLoads(() => require('../src/middleware/authMiddleware.ts'));
const seedRoute = withMockLoads(() => require('../../Frontend/app/api/seed/route.ts'));

function response() {
  return { statusCode: 200, body: undefined, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

function withEnvironment(values, action) {
  const original = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  const restore = () => { for (const [key, value] of Object.entries(original)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } };
  try {
    const result = action();
    if (result?.then) return result.finally(restore);
    restore(); return result;
  } catch (error) { restore(); throw error; }
}

test('legacy signing rejects missing, weak and example secrets in every environment', () => {
  for (const value of [undefined, '', 'secret123', 'your_super_secret_jwt_key_min_32_characters']) {
    withEnvironment({ NODE_ENV: 'development', JWT_SECRET: value }, () => assert.throws(getJwtSecret, /JWT_SECRET/));
  }
  withEnvironment({ JWT_SECRET: secret }, () => assert.equal(getJwtSecret(), secret));
});

test('legacy authentication rejects revoked sessions, unverified accounts and malformed bearer headers', async () => {
  await withEnvironment({ JWT_SECRET: secret }, async () => {
    const authenticate = async (token, user = customer, prefix = 'Bearer ') => {
      databaseResult = { data: user, error: null };
      const req = { headers: { authorization: prefix + token } };
      const res = response(); let nextCalled = false;
      await protect(req, res, () => { nextCalled = true; });
      return { req, res, nextCalled };
    };
    const token = jwt.sign({ userId: customer.id, authVersion: customer.authVersion }, secret, { algorithm: 'HS256' });
    assert.equal((await authenticate(token)).nextCalled, true);
    assert.equal((await authenticate(jwt.sign({ userId: customer.id, authVersion: 1 }, secret))).res.statusCode, 401);
    assert.equal((await authenticate(token, { ...customer, emailVerified: false })).res.statusCode, 401);
    assert.equal((await authenticate(token, customer, 'BearerInvalid ')).res.statusCode, 401);
    assert.equal((await authenticate(jwt.sign({ userId: customer.id, authVersion: 2 }, secret, { algorithm: 'HS384' }))).res.statusCode, 401);
  });
});

test('legacy order reads allow only the owner or an administrator', async () => {
  const order = { id: 'order', userId: customer.id, address: 'Private address' };
  databaseResult = { data: order, error: null };
  const denied = response();
  await orders.getOrderById({ params: { id: order.id }, user: { ...customer, id: 'someone-else' } }, denied);
  assert.equal(denied.statusCode, 403);
  assert.equal(denied.body.address, undefined);
  for (const user of [customer, { ...customer, id: 'admin', isAdmin: true }]) {
    const allowed = response();
    await orders.getOrderById({ params: { id: order.id }, user }, allowed);
    assert.equal(allowed.statusCode, 200);
    assert.equal(allowed.body.id, order.id);
  }
});

test('legacy all-order listing and admin middleware refuse customers before database access', async () => {
  databaseCalls = 0;
  const denied = response();
  await orders.getOrders({ user: customer }, denied);
  assert.equal(denied.statusCode, 403);
  assert.equal(databaseCalls, 0);
  let nextCalled = false;
  const middlewareDenied = response();
  admin({ user: customer }, middlewareDenied, () => { nextCalled = true; });
  assert.equal(middlewareDenied.statusCode, 403);
  assert.equal(nextCalled, false);
  databaseResult = { data: [{ id: 'order' }], error: null };
  const allowed = response();
  await orders.getOrders({ user: { ...customer, isAdmin: true } }, allowed);
  assert.equal(allowed.body.length, 1);
});

test('legacy checkout and registration do not write or accept client supplied prices', async () => {
  databaseCalls = 0;
  for (const handler of [orders.addOrderItems, users.registerUser]) {
    const res = response();
    await handler({ user: customer, body: { totalPrice: 1, orderItems: [{ price: 1 }] } }, res);
    assert.equal(res.statusCode, 503);
  }
  assert.equal(databaseCalls, 0);
});

test('retired order transitions and product management never access the database', async () => {
  databaseCalls = 0;
  for (const handler of [orders.updateOrderToPaid, orders.updateOrderToDelivered, orders.cancelOrder,
    products.createProduct, products.updateProduct, products.deleteProduct]) {
    for (const user of [customer, { ...customer, isAdmin: true }]) {
      const res = response();
      await handler({ user, params: { id: 'existing-record' }, body: { countInStock: 999, totalPrice: 1, isPaid: true } }, res);
      assert.equal(res.statusCode, 503);
      assert.match(res.body.message, /storefront/);
    }
  }
  assert.equal(databaseCalls, 0);
});

test('destructive Supabase seeding requires an explicit disposable loopback development target', () => {
  const allowed = { NODE_ENV: 'development', ALLOW_DESTRUCTIVE_SEED: 'disposable-local-only', SUPABASE_URL: 'http://127.0.0.1:54321' };
  assert.doesNotThrow(() => assertDisposableLocalSeed(allowed));
  for (const change of [
    { NODE_ENV: undefined }, { NODE_ENV: 'production' }, { NODE_ENV: 'test' }, { ALLOW_DESTRUCTIVE_SEED: undefined },
    { SUPABASE_URL: 'https://example.supabase.co' }, { SUPABASE_URL: 'http://localhost.attacker.example' },
    { SUPABASE_URL: 'http://localhost@remote.example' }, { SUPABASE_URL: 'http://localhost:54321?remote=example' },
  ]) assert.throws(() => assertDisposableLocalSeed({ ...allowed, ...change }), /Seeding/);
});

test('both CLI seeders stop before opening a client for unsafe targets', () => {
  const backendFile = require.resolve('../src/seeder.ts');
  const prismaFile = require.resolve('../../Frontend/prisma/seed.ts');
  const runFresh = (file) => { delete require.cache[file]; return withMockLoads(() => require(file)); };
  for (const file of [backendFile, prismaFile]) {
    withEnvironment({ NODE_ENV: 'production', ALLOW_DESTRUCTIVE_SEED: 'disposable-local-only' }, () => assert.throws(() => runFresh(file), /Seeding requires/));
  }
  withEnvironment({ NODE_ENV: 'development', ALLOW_DESTRUCTIVE_SEED: 'disposable-local-only', SUPABASE_URL: 'https://store.supabase.co' }, () => assert.throws(() => runFresh(backendFile), /restricted/));
  for (const urls of [
    { DATABASE_URL: 'postgresql://postgres:password@store.example/lumina_seed', DIRECT_URL: undefined },
    { DATABASE_URL: 'postgresql://postgres:password@localhost/postgres', DIRECT_URL: undefined },
    { DATABASE_URL: 'postgresql://postgres:password@localhost/lumina_seed', DIRECT_URL: 'postgresql://postgres:password@store.example/lumina_seed' },
  ]) withEnvironment({ NODE_ENV: 'development', ALLOW_DESTRUCTIVE_SEED: 'disposable-local-only', ...urls }, () => assert.throws(() => runFresh(prismaFile), /disposable local lumina_seed/));
});

test('HTTP seed is POST-only, unavailable for production or remote databases, and requires a header secret', async () => {
  await withEnvironment({ NODE_ENV: 'development', ALLOW_DESTRUCTIVE_SEED: 'disposable-local-only', SUPABASE_URL: 'http://127.0.0.1:54321', SEED_SECRET: secret }, async () => {
    seedWrites = [];
    assert.equal((await seedRoute.GET()).status, 405);
    assert.equal((await seedRoute.POST(new Request(`http://localhost/api/seed?secret=${secret}`, { method: 'POST' }))).status, 401);
    assert.equal(seedWrites.length, 0);
    await withEnvironment({ NODE_ENV: 'production' }, async () => assert.equal((await seedRoute.POST(new Request('http://localhost/api/seed', { method: 'POST', headers: { 'x-seed-secret': secret } }))).status, 404));
    await withEnvironment({ SUPABASE_URL: 'https://store.supabase.co' }, async () => assert.equal((await seedRoute.POST(new Request('http://localhost/api/seed', { method: 'POST', headers: { 'x-seed-secret': secret } }))).status, 404));
    assert.equal(seedWrites.length, 0);
    const saved = await seedRoute.POST(new Request('http://localhost/api/seed', { method: 'POST', headers: { 'x-seed-secret': secret } }));
    assert.equal(saved.status, 200);
    const products = seedWrites.find((write) => write.table === 'Product' && write.action === 'insert').payload;
    assert.ok(products.length > 0);
    assert.ok(products.every((product) => product.rating === 0 && product.numReviews === 0));
    seedWrites = []; seedError = { message: 'database failure' };
    const failed = await seedRoute.POST(new Request('http://localhost/api/seed', { method: 'POST', headers: { 'x-seed-secret': secret } }));
    assert.equal(failed.status, 500);
    assert.equal(seedWrites.length, 1);
    seedError = null;
  });
});
