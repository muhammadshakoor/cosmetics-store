const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:3001', pretendToBeVisual: true });
global.window = dom.window; global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement; global.MutationObserver = dom.window.MutationObserver;
global.IS_REACT_ACT_ENVIRONMENT = true;
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node', jsx: 'react-jsx' } });
const React = require('react');
const { render, screen, fireEvent, waitFor, cleanup, act } = require('@testing-library/react');
const originalFetch = global.fetch;
let currentUser;
let logoutCalls = 0;
let token = 'a'.repeat(64);
const router = { replace() {} };
const originalLoad = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === 'next/navigation') return { useSearchParams: () => new URLSearchParams(token ? { token } : {}), useRouter: () => router };
  if (name === 'next/link') return ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children);
  if (name === '@/context/AuthContext') return { useAuth: () => ({ user: currentUser, logout() { logoutCalls++; }, login() {} }) };
  if (name === '@/lib/accountUi') return require('../lib/accountUi.ts');
  if (name === '@/components/ResendVerificationButton') return require('../components/ResendVerificationButton.tsx');
  return originalLoad.call(this, name, parent, isMain);
};
const ResetPassword = require('../app/reset-password/page.tsx').default;
const VerifyEmail = require('../app/verify-email/page.tsx').default;
const Unsubscribe = require('../app/unsubscribe/page.tsx').default;
Module._load = originalLoad;

test.afterEach(() => { cleanup(); global.fetch = originalFetch; currentUser = undefined; logoutCalls = 0; token = 'a'.repeat(64); });

test('expired verification keeps a failed resend retryable instead of showing success', async () => {
  let resendCalls = 0;
  global.fetch = async url => {
    if (String(url).startsWith('/api/users/verify?')) return Response.json({ expired: true, email: 'customer@example.test', message: 'Your link expired.' }, { status: 400 });
    assert.equal(String(url), '/api/users/resend-verification');
    return ++resendCalls === 1 ? Response.json({ message: 'Email service unavailable.' }, { status: 503 }) : Response.json({ message: 'If registered and unverified, a new link has been sent.' });
  };
  render(React.createElement(VerifyEmail));
  await screen.findByRole('heading', { name: 'Link expired' });
  fireEvent.click(screen.getByRole('button', { name: 'Resend verification email' }));
  assert.match((await screen.findByRole('alert')).textContent, /Email service unavailable/);
  const retry = screen.getByRole('button', { name: 'Retry sending verification email' });
  assert.equal(retry.disabled, false);
  assert.equal(screen.queryByRole('status'), null);
  fireEvent.click(retry);
  assert.match((await screen.findByRole('status')).textContent, /new link has been sent/);
  assert.equal(screen.queryByRole('alert'), null);
  assert.equal(resendCalls, 2);
});

async function submitReset() {
  fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'new-password' } });
  fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'new-password' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Reset password' }).closest('form'));
}

test('successful password reset clears the unchanged current browser session', async () => {
  currentUser = { token: 'starting-session' };
  global.fetch = async () => Response.json({ message: 'Password reset.' });
  render(React.createElement(ResetPassword));
  await submitReset();
  await screen.findByRole('heading', { name: 'Password reset' });
  await waitFor(() => assert.equal(logoutCalls, 1));
});

test('a password reset completing after account switching preserves the new session', async () => {
  currentUser = { token: 'starting-session' };
  let resolveReset;
  global.fetch = () => new Promise(resolve => { resolveReset = resolve; });
  const rendered = render(React.createElement(ResetPassword));
  await submitReset();
  await waitFor(() => assert.equal(typeof resolveReset, 'function'));
  currentUser = { token: 'newly-signed-in-session' };
  rendered.rerender(React.createElement(ResetPassword));
  await act(async () => { resolveReset(Response.json({ message: 'Password reset.' })); });
  await screen.findByRole('heading', { name: 'Password reset' });
  assert.equal(logoutCalls, 0);
});

test('an incomplete unsubscribe link explains recovery without a dead disabled action', () => {
  token = '';
  global.fetch = () => { throw new Error('No request expected'); };
  render(React.createElement(Unsubscribe));
  assert.match(screen.getByRole('alert').textContent, /incomplete or invalid/);
  assert.equal(screen.queryByRole('button', { name: 'Unsubscribe' }), null);
  assert.equal(screen.getByRole('link', { name: 'Contact support for help' }).getAttribute('href'), '/contact');
});
