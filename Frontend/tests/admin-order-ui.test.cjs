const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:3001', pretendToBeVisual: true });
global.window = dom.window; global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLDialogElement = dom.window.HTMLDialogElement;
global.MutationObserver = dom.window.MutationObserver;
global.getComputedStyle = dom.window.getComputedStyle;
global.IS_REACT_ACT_ENVIRONMENT = true;
// JSDOM does not implement the native modal platform. Verify the component's
// semantics, cancel handling and focus restoration, without emulating focus traps.
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; };
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node', jsx: 'react-jsx' } });
const React = require('react');
const { render, screen, fireEvent, waitFor, cleanup } = require('@testing-library/react');
const originalFetch = global.fetch;
const router = { replace() {} };
const administrator = { _id: 'admin', name: 'Admin', email: 'admin@example.test', token: 'admin-token', isAdmin: true };
let currentUser = administrator;
const originalLoad = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === 'next/navigation') return { useRouter: () => router, useParams: () => ({ id: 'order-one' }) };
  if (name === 'next/link') return ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children);
  if (name === '@/context/AuthContext') return { useAuth: () => ({ user: currentUser, authReady: true }) };
  if (name === 'react-hot-toast') return { success() {}, error() {} };
  const paths = { '@/lib/api': '../lib/api.ts', '@/lib/productInput': '../lib/productInput.ts', '@/lib/site': '../lib/site.ts', '@/components/AccessibleDialog': '../components/AccessibleDialog.tsx' };
  if (paths[name]) return require(paths[name]);
  return originalLoad.call(this, name, parent, isMain);
};
const AdminProducts = require('../app/admin/page.tsx').default;
const AdminCoupons = require('../app/admin/coupons/page.tsx').default;
const AdminOrders = require('../app/admin/orders/page.tsx').default;
const AdminDashboard = require('../app/admin/dashboard/page.tsx').default;
const CustomerOrder = require('../app/order/[id]/page.tsx').default;
Module._load = originalLoad;

test.afterEach(() => { cleanup(); currentUser = administrator; global.fetch = originalFetch; });
const product = { _id: 'soap', name: 'Rose Soap', image: '/soap.jpg', price: 499, countInStock: 3, rating: 0, numReviews: 0, category: 'soaps', brand: 'Lumina', description: 'Handmade rose soap', inventoryVersion: 1 };
const stats = { totalOrders: 1, totalRevenue: 699, pendingOrders: 1, todayOrders: 1, todayRevenue: 699, monthRevenue: 699, monthlyRevenue: {}, statusCounts: { confirmed: 1 }, categoryRevenue: {}, topProducts: [] };
function order(overrides = {}) {
  return { _id: 'order-one', userId: currentUser._id, user: { name: currentUser.name, email: currentUser.email },
    orderItems: [{ _id: 'item', productId: 'soap', name: 'Rose Soap', image: '/soap.jpg', price: 499, qty: 1 }],
    shippingAddress: { address: '123 Main Street', city: 'Lahore', postalCode: '54000', country: 'Pakistan' },
    address: '123 Main Street', city: 'Lahore', postalCode: '54000', country: 'Pakistan',
    itemsPrice: 499, taxPrice: 0, shippingPrice: 200, totalPrice: 699, paymentMethod: 'Cash on Delivery (COD)',
    isPaid: false, isDelivered: false, status: 'confirmed', createdAt: '2026-11-17T08:00:00.000Z', reviewedProductIds: [], ...overrides };
}
function closeByCancel(dialog) { fireEvent(dialog, new dom.window.Event('cancel', { bubbles: true, cancelable: true })); }

test('product read failures have a persistent retry instead of an empty catalog', async () => {
  let productReads = 0;
  global.fetch = async url => {
    if (String(url) === '/api/admin/stats') return Response.json(stats);
    assert.equal(String(url), '/api/products');
    return ++productReads === 1 ? Response.json({ message: 'Unavailable' }, { status: 503 }) : Response.json([product]);
  };
  render(React.createElement(AdminProducts));
  assert.match((await screen.findByRole('alert')).textContent, /Products could not be loaded/);
  assert.equal(screen.queryByText('No products yet'), null);
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await waitFor(() => assert.equal(screen.queryByRole('alert'), null));
  assert.ok(screen.getAllByText('Rose Soap').length > 0);
  assert.equal(productReads, 2);
});

test('product form uses a named native dialog, an accessible file input and cancel focus restoration', async () => {
  global.fetch = async url => Response.json(String(url) === '/api/products' ? [product] : stats);
  render(React.createElement(AdminProducts));
  await screen.findAllByRole('button', { name: 'Edit Rose Soap' });
  const launch = screen.getByRole('button', { name: 'Add Product' });
  launch.focus(); fireEvent.click(launch);
  const dialog = await screen.findByRole('dialog', { name: 'Add New Product' });
  assert.equal(dialog.getAttribute('aria-modal'), 'true');
  const upload = screen.getByLabelText('Upload from device');
  assert.equal(upload.type, 'file');
  assert.equal(upload.classList.contains('hidden'), false);
  assert.equal(upload.disabled, false);
  closeByCancel(dialog);
  await waitFor(() => assert.equal(screen.queryByRole('dialog'), null));
  assert.equal(document.activeElement, launch);
});

test('coupon controls and modal have accessible names and cancel closes the dialog', async () => {
  global.fetch = async () => Response.json([{ _id: 'coupon', code: 'TEST10', type: 'percent', value: 10, minOrder: 0, usedCount: 0, usageLimit: 100, isActive: true, createdAt: '2026-11-17T08:00:00.000Z' }]);
  render(React.createElement(AdminCoupons));
  await screen.findByRole('button', { name: 'Deactivate coupon TEST10' });
  assert.ok(screen.getByRole('button', { name: 'Delete coupon TEST10' }));
  const launch = screen.getByRole('button', { name: 'Create Coupon' });
  launch.focus(); fireEvent.click(launch);
  const dialog = await screen.findByRole('dialog', { name: 'Create Coupon' });
  assert.ok(screen.getByRole('button', { name: 'Close coupon form' }));
  closeByCancel(dialog);
  await waitFor(() => assert.equal(screen.queryByRole('dialog'), null));
  assert.equal(document.activeElement, launch);
});

test('courier dialog links field labels and returns focus without sending a status mutation', async () => {
  const methods = [];
  global.fetch = async (url, options = {}) => {
    methods.push(options.method || 'GET');
    return Response.json(String(url).startsWith('/api/orders/all?') ? { orders: [order()], total: 1, page: 1, pageSize: 25 } : stats);
  };
  render(React.createElement(AdminOrders));
  const launch = await screen.findByRole('button', { name: 'Mark Picked Up' });
  assert.ok(screen.getByRole('button', { name: 'Show details for order RDER-ONE' }));
  launch.focus(); fireEvent.click(launch);
  const dialog = await screen.findByRole('dialog', { name: 'Enter Courier Details' });
  assert.equal(screen.getByLabelText(/Tracking Number/).id, 'orders-tracking-number');
  closeByCancel(dialog);
  await waitFor(() => assert.equal(screen.queryByRole('dialog'), null));
  assert.equal(document.activeElement, launch);
  assert.ok(methods.every(method => method === 'GET'));
});

test('dashboard read errors offer a working retry', async () => {
  let reads = 0;
  global.fetch = async () => ++reads === 1 ? Response.json({ message: 'Unavailable' }, { status: 503 }) : Response.json(stats);
  render(React.createElement(AdminDashboard));
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await waitFor(() => assert.equal(screen.queryByRole('alert'), null));
  assert.ok(screen.getByText('Total Revenue (all time)'));
  assert.equal(reads, 2);
});

test('dashboard exposes an actionable database setup error rather than hiding its cause', async () => {
  const message = 'The store database is not configured. The administrator must apply all database migrations.';
  global.fetch = async () => Response.json({ message }, { status: 503 });
  render(React.createElement(AdminDashboard));
  const alert = await screen.findByRole('alert');
  assert.ok(alert.textContent.includes(message));
  assert.ok(screen.getByRole('button', { name: 'Try again' }));
});

test('a delivered order reload keeps the saved Reviewed state', async () => {
  currentUser = { _id: 'customer', name: 'Customer', email: 'customer@example.test', token: 'customer-token', isAdmin: false };
  global.fetch = async () => Response.json(order({ status: 'delivered', isDelivered: true, reviewedProductIds: ['soap'] }));
  for (let reload = 0; reload < 2; reload++) {
    render(React.createElement(CustomerOrder));
    await screen.findByText(/Reviewed/);
    assert.equal(screen.queryByRole('button', { name: 'Rate Product' }), null);
    cleanup();
  }
});

test('unavailable review state preserves tracking and can retry before exposing a review form', async () => {
  currentUser = { _id: 'customer', name: 'Customer', email: 'customer@example.test', token: 'customer-token', isAdmin: false };
  let reads = 0;
  global.fetch = async () => Response.json(order({ status: 'delivered', isDelivered: true, reviewedProductIds: ++reads === 1 ? null : [] }));
  render(React.createElement(CustomerOrder));
  await screen.findByRole('alert');
  assert.ok(screen.getByText('Live Order Tracking'));
  assert.equal(screen.queryByRole('button', { name: 'Rate Product' }), null);
  fireEvent.click(screen.getByRole('button', { name: 'Retry review status' }));
  const launch = await screen.findByRole('button', { name: 'Rate Product' });
  launch.focus(); fireEvent.click(launch);
  const dialog = await screen.findByRole('dialog', { name: 'Rate Your Purchase' });
  assert.equal(screen.getByLabelText('Your Review *').maxLength, 500);
  closeByCancel(dialog);
  await waitFor(() => assert.equal(screen.queryByRole('dialog'), null));
  assert.equal(document.activeElement, launch);
});
