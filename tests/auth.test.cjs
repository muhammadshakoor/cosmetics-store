const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const bcrypt = require('bcryptjs');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { createAccountToken, hashAccountToken, isValidAccountToken } = require('../lib/accountTokens.ts');
const { createOAuthState, isValidOAuthState } = require('../lib/oauth.ts');
const { sendEmail, EmailDeliveryError, escapeHtml } = require('../lib/email.ts');

test('account tokens have independent entropy and only their hash is stored', () => {
  const first = createAccountToken();
  const second = createAccountToken();
  assert.equal(isValidAccountToken(first), true);
  assert.notEqual(first, second);
  assert.notEqual(hashAccountToken(first), first);
  assert.equal(hashAccountToken(first), hashAccountToken(first));
  for (const bad of [null, '', 'a'.repeat(63), 'g'.repeat(64), '<script>']) assert.equal(isValidAccountToken(bad), false);
});

test('OAuth state requires an exact unpredictable browser-bound value', () => {
  const state = createOAuthState();
  assert.equal(isValidOAuthState(state, state), true);
  for (const bad of [null, '', createOAuthState(), `${state}x`, 'x'.repeat(64)]) assert.equal(isValidOAuthState(bad, state), false);
  assert.equal(isValidOAuthState(state, undefined), false);
});

let databaseUser;
let rpcResult;
let rpcArguments;
let resetUpdate;
let resetRecipient;
const supabase = {
  from: () => ({
    select() { return this; }, eq() { return this; },
    single: async () => ({ data: databaseUser, error: null }),
    maybeSingle: async () => ({ data: databaseUser, error: null }),
    update(value) { resetUpdate = value; return this; },
    then(resolve) { return Promise.resolve({ error: null }).then(resolve); },
  }),
  rpc: async (name, args) => { rpcArguments = { name, args }; return rpcResult; },
};
const originalLoad = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === '@/lib/supabase' || (name === './supabase' && parent?.filename.endsWith('auth.ts'))) return { supabase, isSupabaseAvailable: async () => true };
  if (name === '@/lib/accountTokens') return require('../lib/accountTokens.ts');
  if (name === '@/lib/accountEmails') return { sendPasswordResetEmail: async (email) => { resetRecipient = email; } };
  if (name === '@/lib/rateLimit') return { rateLimit: async () => null };
  return originalLoad.call(this, name, parent, isMain);
};
const { getAuthUser, signToken } = require('../lib/auth.ts');
const resetPassword = require('../app/api/users/reset-password/route.ts').POST;
const forgotPassword = require('../app/api/users/forgot-password/route.ts').POST;
Module._load = originalLoad;

test('production authentication preserves real IDs and database roles for demo emails', async () => {
  const original = { mode: process.env.NODE_ENV, secret: process.env.JWT_SECRET };
  try {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'isolated-auth-test-secret';
    databaseUser = { id: 'real-id', name: 'Customer', email: 'admin@lumina.com', isAdmin: false, authVersion: 0 };
    const token = signToken({ userId: 'real-id', email: 'admin@lumina.com', isAdmin: true });
    const user = await getAuthUser(new Request('http://localhost', { headers: { Authorization: `Bearer ${token}` } }));
    assert.equal(user.id, 'real-id');
    assert.equal(user.isAdmin, false);
    databaseUser = null;
    assert.equal(await getAuthUser(new Request('http://localhost', { headers: { Authorization: `Bearer ${token}` } })), null);
    const demoToken = signToken({ userId: 'admin-fallback-id', email: 'admin@lumina.com' });
    assert.equal(await getAuthUser(new Request('http://localhost', { headers: { Authorization: `Bearer ${demoToken}` } })), null);
  } finally {
    if (original.mode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = original.mode;
    if (original.secret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = original.secret;
  }
});

test('a password reset version invalidates an already-issued session', async () => {
  const originalSecret = process.env.JWT_SECRET;
  try {
    process.env.JWT_SECRET = 'isolated-auth-test-secret';
    databaseUser = { id: 'user-id', name: 'Customer', email: 'customer@example.test', isAdmin: false, authVersion: 2 };
    const stale = signToken({ userId: 'user-id', authVersion: 1 });
    assert.equal(await getAuthUser(new Request('http://localhost', { headers: { Authorization: `Bearer ${stale}` } })), null);
    const current = signToken({ userId: 'user-id', authVersion: 2 });
    assert.equal((await getAuthUser(new Request('http://localhost', { headers: { Authorization: `Bearer ${current}` } }))).id, 'user-id');
  } finally {
    if (originalSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = originalSecret;
  }
});

test('reset endpoint passes a token hash and bcrypt password to the atomic database operation', async () => {
  const token = createAccountToken();
  rpcResult = { data: true, error: null };
  const response = await resetPassword(new Request('http://localhost/api/users/reset-password', { method: 'POST', body: JSON.stringify({ token, password: 'new-password' }) }));
  assert.equal(response.status, 200);
  assert.equal(rpcArguments.name, 'reset_account_password');
  assert.equal(rpcArguments.args.p_token_hash, hashAccountToken(token));
  assert.notEqual(rpcArguments.args.p_password_hash, 'new-password');
  assert.equal(await bcrypt.compare('new-password', rpcArguments.args.p_password_hash), true);
  rpcResult = { data: false, error: null };
  const used = await resetPassword(new Request('http://localhost/api/users/reset-password', { method: 'POST', body: JSON.stringify({ token, password: 'new-password' }) }));
  assert.equal(used.status, 400);
  assert.match((await used.json()).message, /expired|already been used/);
});

test('forgot password responds identically for existing and unknown accounts', async () => {
  const original = { key: process.env.RESEND_API_KEY, site: process.env.NEXT_PUBLIC_SITE_URL };
  try {
    process.env.RESEND_API_KEY = 'isolated-email-test-key';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.test';
    databaseUser = { id: 'user-id', name: 'Customer' };
    const existing = await forgotPassword(new Request('http://localhost/api/users/forgot-password', { method: 'POST', body: JSON.stringify({ email: 'customer@example.test' }) }));
    assert.equal(resetRecipient, 'customer@example.test');
    assert.match(resetUpdate.resetPasswordTokenHash, /^[a-f0-9]{64}$/);
    assert.ok(new Date(resetUpdate.resetPasswordTokenExpiry).getTime() > Date.now());
    databaseUser = null;
    const missing = await forgotPassword(new Request('http://localhost/api/users/forgot-password', { method: 'POST', body: JSON.stringify({ email: 'unknown@example.test' }) }));
    assert.equal(existing.status, missing.status);
    assert.deepEqual(await existing.json(), await missing.json());
  } finally {
    if (original.key === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = original.key;
    if (original.site === undefined) delete process.env.NEXT_PUBLIC_SITE_URL; else process.env.NEXT_PUBLIC_SITE_URL = original.site;
  }
});

test('email delivery checks configuration and provider acceptance without live requests', async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.RESEND_API_KEY;
  try {
    delete process.env.RESEND_API_KEY;
    await assert.rejects(sendEmail({ to: 'customer@example.test', subject: 'Test', html: 'test' }), EmailDeliveryError);
    process.env.RESEND_API_KEY = 'isolated-email-test-key';
    global.fetch = async () => new Response('{}', { status: 429 });
    await assert.rejects(sendEmail({ to: 'customer@example.test', subject: 'Test', html: 'test' }), EmailDeliveryError);
    global.fetch = async () => new Response('{}', { status: 200 });
    await sendEmail({ to: 'customer@example.test', subject: 'Test', html: 'test' });
    assert.equal(escapeHtml('<b>"hello" & \'there\'</b>'), '&lt;b&gt;&quot;hello&quot; &amp; &#39;there&#39;&lt;/b&gt;');
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = originalKey;
  }
});
