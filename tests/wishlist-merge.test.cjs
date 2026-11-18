const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });

let user = { id: 'signed-in-owner' };
let limited = null;
let calls = [];
let result = { data: { savedIds: ['soap'], unavailableIds: [], full: false }, error: null };
const originalLoad = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === '@/lib/supabase') return { supabase: { rpc: async (operation, args) => { calls.push({ operation, args }); return result; } } };
  if (name === '@/lib/auth') return { getAuthUser: async () => user };
  if (name === '@/lib/rateLimit') return { rateLimit: async () => limited };
  return originalLoad.call(this, name, parent, isMain);
};
const merge = require('../app/api/wishlist/merge/route.ts').POST;
Module._load = originalLoad;
const request = (body) => new Request('https://example.test/api/wishlist/merge', { method: 'POST', body: JSON.stringify(body) });

test('wishlist bulk merge binds its account to authentication and retries distinct IDs in one call', async () => {
  calls = [];
  const response = await merge(request({ userId: 'another-account', productIds: ['soap', 'soap', 'lotion'] }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), result.data);
  assert.deepEqual(calls, [{ operation: 'merge_account_wishlist', args: { p_user_id: 'signed-in-owner', p_product_ids: ['soap', 'lotion'] } }]);
});

test('unauthenticated, oversized and rate-limited wishlist merges make no database writes', async () => {
  calls = [];
  user = null;
  assert.equal((await merge(request({ productIds: ['soap'] }))).status, 401);
  user = { id: 'signed-in-owner' };
  assert.equal((await merge(request({ productIds: Array(201).fill('soap') }))).status, 400);
  assert.equal((await merge(request({ productIds: [''] }))).status, 400);
  limited = new Response('{}', { status: 429 });
  assert.equal((await merge(request({ productIds: ['soap'] }))).status, 429);
  limited = null;
  assert.deepEqual(calls, []);
});

test('wishlist storage errors are retryable and do not acknowledge saved favorites', async () => {
  result = { data: null, error: { message: 'private database detail' } };
  const response = await merge(request({ productIds: ['soap'] }));
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.savedIds, undefined);
  assert.doesNotMatch(body.message, /private database/);
});
