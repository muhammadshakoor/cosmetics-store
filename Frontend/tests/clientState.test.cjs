const test = require('node:test');
const assert = require('node:assert/strict');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });
const { mergeGuestWishlist } = require('../lib/wishlist.ts');

function storage(ids) {
  const entries = new Map([['wishlist', JSON.stringify(ids)]]);
  return {
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: key => entries.delete(key),
    ids: () => JSON.parse(entries.get('wishlist') || '[]'),
  };
}

test('guest wishlist merge persists one batch and preserves favorites added during the request', async () => {
  const saved = storage(['soap', 'lotion']);
  const result = await mergeGuestWishlist(saved, 'session-token', undefined, async (url, options) => {
    assert.equal(url, '/api/wishlist/merge');
    assert.equal(options.headers.Authorization, 'Bearer session-token');
    assert.deepEqual(JSON.parse(options.body), { productIds: ['soap', 'lotion'] });
    saved.setItem('wishlist', JSON.stringify(['soap', 'lotion', 'new-favorite']));
    return Response.json({ savedIds: ['soap', 'lotion'], unavailableIds: [] });
  });
  assert.deepEqual(saved.ids(), ['new-favorite']);
  assert.deepEqual(result.pendingIds, []);
});

test('partial account capacity retains unsaved browser favorites for another retry', async () => {
  const saved = storage(['soap', 'lotion', 'deleted-product']);
  const result = await mergeGuestWishlist(saved, 'session-token', undefined, async () => Response.json({ savedIds: ['soap'], unavailableIds: ['deleted-product'], full: true }));
  assert.deepEqual(saved.ids(), ['lotion']);
  assert.deepEqual(result.pendingIds, ['lotion']);
  assert.deepEqual(result.unavailableIds, ['deleted-product']);
});

test('failed and malformed merge acknowledgements never remove guest favorites', async () => {
  for (const response of [Response.json({ message: 'Unavailable' }, { status: 503 }), Response.json({ savedIds: ['soap'] })]) {
    const saved = storage(['soap']);
    await assert.rejects(mergeGuestWishlist(saved, 'session-token', undefined, async () => response));
    assert.deepEqual(saved.ids(), ['soap']);
  }
});

test('abandoned account merge leaves browser favorites available to recover', async () => {
  const saved = storage(['soap']);
  const controller = new AbortController();
  await assert.rejects(mergeGuestWishlist(saved, 'session-token', controller.signal, async () => {
    controller.abort();
    return Response.json({ savedIds: ['soap'], unavailableIds: [] });
  }));
  assert.deepEqual(saved.ids(), ['soap']);
});

test('an empty browser wishlist needs no merge request', async () => {
  const saved = storage([]);
  await mergeGuestWishlist(saved, 'session-token', undefined, async () => { throw new Error('Unexpected request'); });
});

test('all public contact exports share configuration and have no fallback recipient', () => {
  const originalPhone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const originalEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  function loadContacts() {
    delete require.cache[require.resolve('../lib/store.ts')];
    delete require.cache[require.resolve('../lib/site.ts')];
    return { store: require('../lib/store.ts'), site: require('../lib/site.ts') };
  }
  try {
    delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
    delete process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
    let contacts = loadContacts();
    assert.equal(contacts.site.whatsappLink(), null);
    assert.equal(contacts.site.PHONE_DISPLAY, '');
    assert.equal(contacts.site.SUPPORT_EMAIL, '');
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = '0300 1234567';
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL = 'help@example.test';
    contacts = loadContacts();
    assert.equal(contacts.site.SUPPORT_EMAIL, contacts.store.SUPPORT_EMAIL);
    assert.equal(contacts.site.SUPPORT_EMAIL, 'help@example.test');
    assert.equal(contacts.site.whatsappLink('Order #123?'), `${contacts.store.WHATSAPP_URL}?text=Order%20%23123%3F`);
  } finally {
    if (originalPhone === undefined) delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER; else process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = originalPhone;
    if (originalEmail === undefined) delete process.env.NEXT_PUBLIC_SUPPORT_EMAIL; else process.env.NEXT_PUBLIC_SUPPORT_EMAIL = originalEmail;
    delete require.cache[require.resolve('../lib/store.ts')];
    delete require.cache[require.resolve('../lib/site.ts')];
  }
});
