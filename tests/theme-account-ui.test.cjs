const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { themeInitScript, resolveTheme } = require('../lib/theme.ts');
const { requestVerificationEmail, verifyEmailToken, isSameBrowserSession } = require('../lib/accountUi.ts');

test('first paint and hydrated theme agree for invalid or blocked storage', () => {
  for (const saved of ['dark', 'light', 'corrupt', null, 'blocked']) {
    for (const prefersDark of [true, false]) {
      let dark;
      vm.runInNewContext(themeInitScript, {
        localStorage: { getItem() { if (saved === 'blocked') throw new Error('Storage blocked'); return saved; } },
        window: { matchMedia: () => ({ matches: prefersDark }) },
        document: { documentElement: { classList: { toggle(name, enabled) { assert.equal(name, 'dark'); dark = enabled; } } } },
      });
      assert.equal(dark, resolveTheme(saved === 'blocked' ? null : saved, prefersDark) === 'dark');
    }
  }
});

function contrast(first, second) {
  const luminance = hex => {
    const values = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
  };
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('actual shared CSS tokens meet text, focus and field contrast in both themes', () => {
  const css = fs.readFileSync(path.join(__dirname, '../app/globals.css'), 'utf8');
  const variables = pattern => Object.fromEntries([...css.match(pattern)[1].matchAll(/--([a-z-]+):\s*(#[a-f\d]{6});/gi)].map(match => [match[1], match[2]]));
  const light = variables(/:root\s*\{([^}]+)\}/);
  const dark = { ...light, ...variables(/\.dark\s*\{([^}]+)\}/) };
  for (const colors of [light, dark]) {
    assert.ok(contrast(colors['brand'], '#FFFFFF') >= 4.5, 'primary button text');
    assert.ok(contrast(colors['brand-text'], colors.surface) >= 4.5, 'brand text on semantic surface');
    assert.ok(contrast(colors['field-border'], colors['field-bg']) >= 3, 'input boundary');
    assert.ok(contrast(colors['focus-ring'], colors.surface) >= 3, 'focus indicator');
  }
  assert.ok(contrast(dark['brand-text'], '#1E2939') >= 4.5, 'brand text on existing gray-800 cards');
  assert.ok(contrast(dark['focus-ring'], '#1E2939') >= 3, 'focus ring on existing gray-800 cards');
});

test('resend reports HTTP and malformed failures and allows a successful retry', async () => {
  for (const response of [Response.json({ message: 'Please retry later.' }, { status: 503 }), Response.json({ message: 'Too many attempts.' }, { status: 429 }), Response.json({})]) {
    await assert.rejects(requestVerificationEmail('customer@example.test', async () => response));
  }
  const message = await requestVerificationEmail('customer@example.test', async (_url, options) => {
    assert.deepEqual(JSON.parse(options.body), { email: 'customer@example.test' });
    return Response.json({ message: 'If registered and unverified, a new link has been sent.' });
  });
  assert.match(message, /new link/);
});

test('verification never treats a failed HTTP response as successful sign-in', async () => {
  const token = `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.signature`;
  const account = { _id: 'customer', name: 'Customer', email: 'customer@example.test', isAdmin: false, token, verified: true };
  const failed = await verifyEmailToken('email-token', async () => Response.json(account, { status: 503 }));
  assert.equal(failed.status, 'error');
  assert.equal(failed.retryable, true);
  const success = await verifyEmailToken('email-token', async () => Response.json(account));
  assert.equal(success.status, 'success');
  assert.equal(success.user._id, 'customer');
  const expired = await verifyEmailToken('email-token', async () => Response.json({ expired: true, email: account.email, message: 'Expired link' }, { status: 400 }));
  assert.equal(expired.status, 'expired');
  assert.equal(expired.email, account.email);
  await assert.rejects(verifyEmailToken('email-token', async () => Response.json({ verified: true })), /could not be confirmed/);
});

test('reset completion can clear only the browser session that began the request', () => {
  assert.equal(isSameBrowserSession('starting-session', 'starting-session'), true);
  assert.equal(isSameBrowserSession('starting-session', 'newly-signed-in-session'), false);
  assert.equal(isSameBrowserSession('starting-session', undefined), false);
  assert.equal(isSameBrowserSession(undefined, undefined), false);
});
