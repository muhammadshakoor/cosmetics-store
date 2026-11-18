const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { NextRequest } = require('next/server');
const oauth = require('../lib/oauth.ts');

let rpcCalls = [];
let signedPayloads = [];
let rpcResult;
const account = { id: 'email-owner', name: 'Email Owner', email: 'owner@example.test', isAdmin: false, authVersion: 7 };
const originalLoad = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === './supabase' && parent?.filename.endsWith('oauthAccount.ts')) return {
    supabase: { rpc: async (operation, args) => { rpcCalls.push({ operation, args }); return rpcResult; } },
  };
  if (name === '@/lib/oauthAccount') return require('../lib/oauthAccount.ts');
  if (name === '@/lib/auth') return { signToken: (payload) => { signedPayloads.push(payload); return 'signed.session.token'; } };
  if (name === '@/lib/accountTokens') return { getSiteUrl: () => 'https://store.example.test' };
  if (name === '@/lib/oauth') return oauth;
  return originalLoad.call(this, name, parent, isMain);
};
const { signInOAuthAccount } = require('../lib/oauthAccount.ts');
const callbacks = {
  google: require('../app/api/auth/google/callback/route.ts').GET,
  facebook: require('../app/api/auth/facebook/callback/route.ts').GET,
};
Module._load = originalLoad;

async function runCallback(provider, options = {}) {
  rpcCalls = []; signedPayloads = []; rpcResult = options.rpcResult || { data: account, error: null };
  const state = oauth.createOAuthState();
  const parameters = new URLSearchParams({ code: 'provider-authorization-code', state: options.badState ? oauth.createOAuthState() : state });
  const request = new NextRequest(`https://store.example.test/api/auth/${provider}/callback?${parameters}`, {
    headers: { Cookie: `${oauth.oauthStateCookie(provider)}=${state}` },
  });
  const fetchCalls = [];
  const previousFetch = global.fetch;
  const previousMode = process.env.NODE_ENV;
  const previousError = console.error;
  process.env.NODE_ENV = 'production'; console.error = () => {};
  global.fetch = async (url) => {
    fetchCalls.push(String(url));
    if (fetchCalls.length === 1) return Response.json({ access_token: 'provider-access-token' }, { status: options.tokenFailure ? 400 : 200 });
    return Response.json(provider === 'google'
      ? { email: ' Owner@Example.TEST ', name: 'Email Owner', picture: 'https://images.example.test/avatar.jpg', verified_email: true, ...options.profile }
      : { email: ' Owner@Example.TEST ', name: 'Email Owner', id: 'provider-user-id', ...options.profile });
  };
  try { return { response: await callbacks[provider](request), fetchCalls }; }
  finally {
    global.fetch = previousFetch; console.error = previousError;
    if (previousMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousMode;
  }
}

test('social callbacks reject mismatched browser state before provider or account calls', async () => {
  for (const provider of Object.keys(callbacks)) {
    const { response, fetchCalls } = await runCallback(provider, { badState: true });
    assert.equal(response.headers.get('location'), `https://store.example.test/login?error=${provider}_failed`);
    assert.equal(fetchCalls.length, 0);
    assert.equal(rpcCalls.length, 0);
    assert.equal(signedPayloads.length, 0);
    assert.equal(response.cookies.get(oauth.oauthStateCookie(provider)).value, '');
  }
});

test('Google requires a verified email and Facebook requires an email before linking an account', async () => {
  for (const [provider, profile] of [['google', { verified_email: false }], ['google', { email: null }], ['facebook', { email: null }]]) {
    const { response } = await runCallback(provider, { profile });
    assert.match(response.headers.get('location'), /\/login\?error=/);
    assert.equal(rpcCalls.length, 0);
    assert.equal(signedPayloads.length, 0);
    assert.equal(response.cookies.get(oauth.OAUTH_SESSION_COOKIE), undefined);
  }
});

test('social callbacks use the atomic account RPC and issue only its current account version in an HttpOnly handoff', async () => {
  for (const provider of Object.keys(callbacks)) {
    const { response, fetchCalls } = await runCallback(provider);
    assert.equal(fetchCalls.length, 2);
    assert.deepEqual(rpcCalls, [{ operation: 'oauth_sign_in', args: {
      p_email: 'owner@example.test', p_name: 'Email Owner',
      p_picture: provider === 'google' ? 'https://images.example.test/avatar.jpg' : 'https://graph.facebook.com/provider-user-id/picture?type=large',
    } }]);
    assert.deepEqual(signedPayloads, [{ userId: account.id, authVersion: account.authVersion }]);
    assert.equal(response.headers.get('location'), 'https://store.example.test/auth/callback');
    assert.doesNotMatch(response.headers.get('location'), /token|signed\.session/);
    const handoff = response.cookies.get(oauth.OAUTH_SESSION_COOKIE);
    assert.equal(handoff.value, 'signed.session.token');
    assert.equal(handoff.httpOnly, true);
    assert.equal(handoff.secure, true);
    assert.equal(handoff.sameSite, 'lax');
    assert.equal(handoff.path, '/api/auth/session');
    assert.equal(handoff.maxAge, 60);
  }
});

test('provider and database failures never create a social session', async () => {
  for (const provider of Object.keys(callbacks)) {
    for (const options of [{ tokenFailure: true }, { rpcResult: { data: null, error: { message: 'sensitive database error' } } }, { rpcResult: { data: { id: account.id }, error: null } }]) {
      const { response } = await runCallback(provider, options);
      assert.equal(response.headers.get('location'), `https://store.example.test/login?error=${provider}_failed`);
      assert.equal(signedPayloads.length, 0);
      assert.equal(response.cookies.get(oauth.OAUTH_SESSION_COOKIE), undefined);
      assert.doesNotMatch(response.headers.get('location'), /sensitive/);
    }
  }
});

test('atomic social sign-in helper normalizes the email and fails closed on an invalid database identity', async () => {
  rpcCalls = []; rpcResult = { data: account, error: null };
  assert.equal((await signInOAuthAccount(' Owner@Example.TEST ', 'Email Owner', null)).id, account.id);
  assert.equal(rpcCalls[0].args.p_email, 'owner@example.test');
  for (const data of [null, {}, { ...account, id: 1 }, { ...account, authVersion: undefined }]) {
    rpcResult = { data, error: null };
    await assert.rejects(signInOAuthAccount('owner@example.test', 'Owner', null), /Unable to complete/);
  }
});
