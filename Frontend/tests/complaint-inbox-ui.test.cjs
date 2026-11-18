const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:3001', pretendToBeVisual: true });
for (const name of ['window', 'document', 'HTMLElement', 'Node', 'MutationObserver', 'navigator']) {
  Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true, writable: true });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node', jsx: 'react-jsx' } });
const React = require('react');
const { render, screen, fireEvent, waitFor, act, cleanup } = require('@testing-library/react');
const originalLoad = Module._load;
let session;
Module._load = function (name, parent, isMain) {
  if (name === 'next/link') return ({ children, ...props }) => React.createElement('a', props, children);
  if (name === '@/context/AuthContext') return { useAuth: () => ({ user: session, authReady: true }) };
  if (name.startsWith('@/')) return originalLoad.call(this, path.join(__dirname, '..', name.slice(2)), parent, isMain);
  return originalLoad.call(this, name, parent, isMain);
};
const ComplaintInbox = require('../components/ComplaintInbox.tsx').default;
const ComplaintsPage = require('../app/complaints/page.tsx').default;
Module._load = originalLoad;
const originalFetch = global.fetch;
const user = (id) => ({ _id: id, name: id, email: `${id}@example.test`, isAdmin: false, token: `token-${id}` });
const complaint = (id, owner) => ({ id, userId: owner, name: owner, email: `${owner}@example.test`, category: 'Other',
  subject: `${id} request`, message: `${id} private message`, orderId: null, status: 'open', createdAt: '2026-11-17T10:00:00Z', updatedAt: '2026-11-17T10:00:00Z' });
const pageBody = (records, overrides = {}) => ({ complaints: records, total: records.length, page: 1, pageSize: 20,
  statusCounts: { open: records.length, in_progress: 0, resolved: 0 }, ...overrides });
test.afterEach(() => { cleanup(); global.fetch = originalFetch; });
test.after(() => dom.window.close());

test('switching accounts immediately removes loaded private messages and ignores a late old-account response', async () => {
  let oldCalls = 0;
  let resolveOld;
  let oldSignal;
  global.fetch = async (url, options) => {
    if (options.headers.Authorization === 'Bearer token-first') {
      if (++oldCalls === 1) return Response.json(pageBody([complaint('first', 'first')]));
      oldSignal = options.signal;
      return new Promise(resolve => { resolveOld = resolve; });
    }
    return Response.json(pageBody([complaint('second', 'second')]));
  };
  const view = render(React.createElement(ComplaintInbox, { user: user('first') }));
  await screen.findByText('first request');
  fireEvent.click(screen.getByRole('button', { name: /first request/ }));
  assert.ok(screen.getByText('first private message'));
  fireEvent.click(screen.getByRole('button', { name: 'Open (1)' }));
  await waitFor(() => assert.equal(typeof resolveOld, 'function'));
  view.rerender(React.createElement(ComplaintInbox, { user: user('second') }));
  assert.equal(screen.queryByText('first private message'), null);
  assert.equal(screen.queryByText('first request'), null);
  assert.equal(oldSignal.aborted, true);
  await screen.findByText('second request');
  await act(async () => { resolveOld(Response.json(pageBody([complaint('late-first', 'first')]))); });
  assert.equal(screen.queryByText('late-first request'), null);
  assert.ok(screen.getByText('second request'));
});

test('failed inbox loads show a persistent retry instead of an empty history', async () => {
  let attempts = 0;
  global.fetch = async () => ++attempts === 1
    ? Response.json({ message: 'Support is temporarily unavailable.' }, { status: 503 })
    : Response.json(pageBody([complaint('retried', 'first')]));
  render(React.createElement(ComplaintInbox, { user: user('first') }));
  await screen.findByRole('alert');
  assert.equal(screen.queryByText('No complaints yet'), null);
  assert.ok(screen.getByText('Support is temporarily unavailable.'));
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByText('retried request');
  assert.equal(screen.queryByRole('alert'), null);
});

test('a role downgrade hides privileged results even when the account ID and token stay the same', async () => {
  let administrator = true;
  global.fetch = async () => Response.json(pageBody([complaint(administrator ? 'privileged' : 'personal', 'first')]));
  const view = render(React.createElement(ComplaintInbox, { user: { ...user('first'), isAdmin: true } }));
  await screen.findByText('privileged request');
  administrator = false;
  view.rerender(React.createElement(ComplaintInbox, { user: user('first') }));
  assert.equal(screen.queryByText('privileged request'), null);
  await screen.findByText('personal request');
});

test('inbox next page and status filters request the selected page without losing full counts', async () => {
  const requests = [];
  global.fetch = async (url) => {
    const params = new URL(String(url), 'http://localhost:3001').searchParams;
    const page = Number(params.get('page'));
    const status = params.get('status');
    requests.push({ page, status });
    return Response.json(pageBody([complaint(`page-${page}-${status}`, 'first')], { page, total: status === 'all' ? 225 : 25, statusCounts: { open: 200, in_progress: 0, resolved: 25 } }));
  };
  render(React.createElement(ComplaintInbox, { user: user('first') }));
  await screen.findByText('page-1-all request');
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await screen.findByText('page-2-all request');
  assert.ok(screen.getByText('Showing 21–40 of 225'));
  assert.equal(document.activeElement, screen.getByRole('heading', { name: 'My complaints' }));
  fireEvent.click(screen.getByRole('button', { name: 'Resolved (25)' }));
  await screen.findByText('page-1-resolved request');
  assert.deepEqual(requests, [{ page: 1, status: 'all' }, { page: 2, status: 'all' }, { page: 1, status: 'resolved' }]);
});

test('saved complaint confirmation distinguishes unavailable email and prevents duplicate rapid submissions', async () => {
  session = user('first');
  let submitCalls = 0;
  let resolveSubmission;
  global.fetch = async () => {
    submitCalls++;
    return new Promise(resolve => { resolveSubmission = resolve; });
  };
  render(React.createElement(ComplaintsPage));
  fireEvent.change(screen.getByLabelText('Category *'), { target: { value: 'Other' } });
  fireEvent.change(screen.getByLabelText('Subject *'), { target: { value: 'My request' } });
  fireEvent.change(screen.getByLabelText('Your Message *'), { target: { value: 'Please review this order question.' } });
  const form = screen.getByRole('button', { name: 'Submit Complaint' }).closest('form');
  fireEvent.submit(form);
  fireEvent.submit(form);
  assert.equal(submitCalls, 1);
  await act(async () => { resolveSubmission(Response.json({ id: 'saved-request-reference', emailSent: false }, { status: 201 })); });
  assert.ok(screen.getByText('Reference: saved-request-reference'));
  assert.equal(document.activeElement, screen.getByRole('heading', { name: 'Complaint submitted' }));
  assert.ok(screen.getByText(/Email confirmation is currently unavailable; your complaint is still saved/));
  assert.equal(screen.queryByText(/A confirmation email was sent/), null);
});
