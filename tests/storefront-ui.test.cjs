const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:3001/products', pretendToBeVisual: true });
for (const name of ['window', 'document', 'Element', 'HTMLElement', 'Node', 'MutationObserver', 'navigator']) {
  Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true, writable: true });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node', jsx: 'react-jsx' } });
const React = require('react');
const { render, within, fireEvent, waitFor, cleanup } = require('@testing-library/react');
const screen = within(dom.window.document.body);
const originalLoad = Module._load;
const navigations = [];
let pathname = '/products';
let currentUser = null;
Module._load = function (name, parent, isMain) {
  if (name === 'next/link') return ({ children, href, onClick, ...props }) => React.createElement('a', { ...props, href, onClick: event => { onClick?.(event); event.preventDefault(); navigations.push(href); } }, children);
  if (name === 'next/navigation') return { usePathname: () => pathname, useRouter: () => ({ push: href => navigations.push(href) }) };
  if (name === '@/context/AuthContext') return { useAuth: () => ({ user: currentUser, authReady: true, logout() {} }) };
  if (name === '@/context/CartContext') return { useCart: () => ({ itemCount: 3 }) };
  if (name === '@/context/WishlistContext') return { useWishlist: () => ({ count: 2 }) };
  if (['@/components/SkinQuizModal', '@/components/SignOutDialog', '@/components/ProductCard'].includes(name)) return () => null;
  if (name === '@/components/ThemeToggle') return () => React.createElement('button', { 'aria-label': 'Switch to dark mode' });
  if (name === '@/components/ProductImage') return () => null;
  if (name.startsWith('@/')) return originalLoad.call(this, path.join(__dirname, '..', name.slice(2)), parent, isMain);
  return originalLoad.call(this, name, parent, isMain);
};
const Navbar = require('../components/Navbar.tsx').default;
const HomePage = require('../app/page.tsx').default;
Module._load = originalLoad;
const originalFetch = global.fetch;
test.beforeEach(() => { pathname = '/products'; currentUser = null; navigations.length = 0; global.fetch = async () => Response.json([]); });
test.afterEach(() => { cleanup(); global.fetch = originalFetch; });
test.after(() => dom.window.close());

test('mounted navigation identifies cart, wishlist and sign-in links and exposes hamburger state', () => {
  render(React.createElement(Navbar));
  assert.equal(screen.getByRole('link', { name: 'View cart (3 items)' }).getAttribute('href'), '/cart');
  assert.equal(screen.getByRole('link', { name: 'View wishlist (2 products)' }).getAttribute('href'), '/wishlist');
  assert.equal(screen.getByRole('link', { name: 'Sign in to your account' }).getAttribute('href'), '/login');
  const toggle = screen.getByRole('button', { name: 'Toggle menu' });
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  fireEvent.click(toggle);
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.ok(screen.getByRole('navigation', { name: 'Mobile navigation' }));
  fireEvent.click(toggle);
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(screen.queryByRole('navigation', { name: 'Mobile navigation' }), null);
});

test('choosing a category or Shop All closes the mobile drawer while the pathname stays /products', () => {
  render(React.createElement(Navbar));
  const toggle = screen.getByRole('button', { name: 'Toggle menu' });
  for (const [name, destination] of [[/Handmade Soaps/, '/products?category=soaps'], ['Shop All', '/products']]) {
    fireEvent.click(toggle);
    const drawer = screen.getByRole('navigation', { name: 'Mobile navigation' });
    fireEvent.click(within(drawer).getByRole('link', { name }));
    assert.equal(navigations.at(-1), destination);
    assert.equal(pathname, '/products');
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(screen.queryByRole('navigation', { name: 'Mobile navigation' }), null);
  }
});

test('the compact account control preserves its accessible name and opens administrator links', () => {
  currentUser = { _id: 'admin', name: 'Admin User', email: 'admin@example.test', isAdmin: true, token: 'test-token' };
  render(React.createElement(Navbar));
  const account = screen.getByRole('button', { name: 'Account menu for Admin User' });
  assert.equal(account.getAttribute('aria-expanded'), 'false');
  fireEvent.click(account);
  assert.equal(account.getAttribute('aria-expanded'), 'true');
  assert.equal(screen.getByRole('link', { name: 'Admin Panel' }).getAttribute('href'), '/admin');
  assert.equal(screen.getByRole('link', { name: 'Sales Dashboard' }).getAttribute('href'), '/admin/dashboard');
  fireEvent.click(account);
  assert.equal(account.getAttribute('aria-expanded'), 'false');
  assert.equal(screen.queryByRole('link', { name: 'Admin Panel' }), null);
});

test('newsletter field has an accessible label, requires consent and retains the address for a failed-signup retry', async () => {
  const subscriptions = [];
  global.fetch = async (url, options) => {
    if (String(url).includes('/products')) return Response.json([]);
    subscriptions.push(JSON.parse(options.body));
    return subscriptions.length === 1 ? Response.json({ message: 'Unavailable' }, { status: 503 }) : Response.json({ message: 'Your subscription is saved.' });
  };
  render(React.createElement(HomePage));
  const email = screen.getByRole('textbox', { name: 'Email address for store updates' });
  assert.equal(email.required, true);
  const submit = screen.getByRole('button', { name: 'Subscribe' });
  assert.equal(submit.disabled, true);
  fireEvent.change(email, { target: { value: 'shopper@example.test' } });
  fireEvent.click(screen.getByRole('checkbox', { name: /I agree to receive Lumina news/ }));
  assert.equal(submit.disabled, false);
  fireEvent.submit(submit.closest('form'));
  await waitFor(() => assert.ok(screen.getByRole('alert')));
  assert.equal(email.value, 'shopper@example.test');
  assert.deepEqual(subscriptions[0], { email: 'shopper@example.test', consent: true });
  fireEvent.submit(submit.closest('form'));
  await screen.findByText('Your subscription is saved.');
  assert.equal(subscriptions.length, 2);
});
