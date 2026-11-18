// Regression: signing out on a protected page (e.g. /order/<id>) must not leave a
// /login?redirect=<that page> behind, or the NEXT account to sign in lands on the
// previous user's order. Protected pages redirect when they render with no user,
// so an explicit sign-out must never expose `user === null` to them.
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { JSDOM, VirtualConsole } = require('jsdom');

const navigations = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', error => { if (/navigation/i.test(error.message)) navigations.push(error.message); });
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:3001/order/abc', pretendToBeVisual: true, virtualConsole });
global.window = dom.window; global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement; global.MutationObserver = dom.window.MutationObserver;
global.localStorage = dom.window.localStorage; global.sessionStorage = dom.window.sessionStorage;
global.IS_REACT_ACT_ENVIRONMENT = true;
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node', jsx: 'react-jsx' } });
const React = require('react');
const { render, screen, fireEvent, waitFor, cleanup, act } = require('@testing-library/react');

const originalLoad = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === '@/lib/browserState') return require('../lib/browserState.ts');
  return originalLoad.call(this, name, parent, isMain);
};
const { AuthProvider, useAuth } = require('../context/AuthContext.tsx');
Module._load = originalLoad;

const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = `${b64({ alg: 'HS256' })}.${b64({ id: 'u1', exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;
const customer = { _id: 'u1', name: 'Test User', email: 'test@example.com', isAdmin: false, token };
const originalFetch = global.fetch;

function ProtectedPage({ guardHits, action }) {
  const auth = useAuth();
  // Mirrors the guard in app/order/[id]/page.tsx and the other protected pages.
  React.useEffect(() => { if (auth.authReady && !auth.user) guardHits.push('/login?redirect=order/abc'); }, [auth.authReady, auth.user, guardHits]);
  return React.createElement('div', null,
    React.createElement('span', null, auth.user ? `signed in as ${auth.user.name}` : 'signed out'),
    React.createElement('button', { onClick: () => auth[action]() }, 'Sign out'));
}

async function signedInPage(action) {
  localStorage.setItem('userInfo', JSON.stringify(customer));
  global.fetch = async () => new Response(JSON.stringify(customer), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const guardHits = [];
  render(React.createElement(AuthProvider, null, React.createElement(ProtectedPage, { guardHits, action })));
  await screen.findByText('signed in as Test User');
  return guardHits;
}

test.afterEach(() => { cleanup(); global.fetch = originalFetch; localStorage.clear(); sessionStorage.clear(); navigations.length = 0; });

test('explicit sign-out clears the session and reloads home without tripping page guards', async () => {
  const guardHits = await signedInPage('signOut');
  await act(async () => { fireEvent.click(screen.getByText('Sign out')); });
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(localStorage.getItem('userInfo'), null);
  assert.equal(sessionStorage.getItem('userInfo'), null);
  assert.deepEqual(guardHits, [], 'a guard redirect here would send the next account to this page');
  assert.equal(navigations.length, 1, 'a full-page navigation to / is requested');
});

test('session expiry (logout) still lets guards send the visitor to sign in and back', async () => {
  const guardHits = await signedInPage('logout');
  await act(async () => { fireEvent.click(screen.getByText('Sign out')); });
  await waitFor(() => assert.deepEqual(guardHits, ['/login?redirect=order/abc']));
  assert.equal(navigations.length, 0);
});
