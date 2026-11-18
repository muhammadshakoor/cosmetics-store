const test = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const execFileAsync = promisify(execFile);
const connection = process.env.CHECKOUT_TEST_DATABASE_URL;
const enabled = Boolean(connection);
const psql = process.env.PSQL_PATH || 'C:/Program Files/PostgreSQL/18/bin/psql.exe';

function guardedConnection() {
  const endpoint = new URL(connection);
  assert.equal(endpoint.protocol, 'postgresql:', 'Account DB tests require PostgreSQL');
  assert.equal(endpoint.hostname, '127.0.0.1', 'Account DB tests require an isolated loopback cluster');
  assert.equal(endpoint.pathname, '/checkout_test', 'Account DB tests require the disposable checkout_test database');
  assert.ok(endpoint.port && endpoint.port !== '5432', 'Account DB tests refuse the normal PostgreSQL port');
  assert.equal(endpoint.search, '', 'Account DB tests refuse connection overrides');
  assert.equal(endpoint.hash, '', 'Account DB tests refuse connection fragments');
  return connection;
}

async function sql(statement) {
  const result = await execFileAsync(psql, [guardedConnection(), '-X', '-v', 'ON_ERROR_STOP=1', '-At', '-c', statement], { windowsHide: true, timeout: 30000 });
  return result.stdout.trim();
}

test('atomic OAuth credential replacement, wishlist capacity/idempotency and RPC permissions hold in PostgreSQL', { skip: !enabled }, async () => {
  await sql('SELECT 1');
  await execFileAsync(psql, [guardedConnection(), '-X', '-v', 'ON_ERROR_STOP=1', '-f', path.join(__dirname, 'accounts-hardening.integration.sql')], { windowsHide: true, timeout: 30000 });
});

test('simultaneous provider sign-ins revoke unverified credentials once and return one account', { skip: !enabled }, async () => {
  const id = `oauth-race-${randomUUID()}`;
  const email = `${id}@example.test`;
  try {
    await sql(`INSERT INTO public."User"(id,name,email,password,"emailVerified","authVersion") VALUES('${id}','Untrusted signup','${email}','attacker-chosen-hash',false,4)`);
    const results = await Promise.allSettled([
      sql(`SELECT public.oauth_sign_in('${email}','Email owner',NULL)`),
      sql(`SELECT public.oauth_sign_in('${email}','Email owner',NULL)`),
    ]);
    for (const result of results) assert.equal(result.status, 'fulfilled');
    const accounts = results.map((result) => JSON.parse(result.value));
    assert.ok(accounts.every((account) => account.id === id && account.authVersion === 5 && account.isAdmin === false));
    assert.deepEqual(JSON.parse(await sql(`SELECT jsonb_build_object('password',password,'verified',"emailVerified",'version',"authVersion") FROM public."User" WHERE id='${id}'`)), { password: '', verified: true, version: 5 });
    assert.equal(await sql(`SELECT count(*) FROM public."User" WHERE email='${email}'`), '1');
  } finally { await sql(`DELETE FROM public."User" WHERE email='${email}'`); }
});

test('simultaneous first social sign-ins create a single non-admin identity', { skip: !enabled }, async () => {
  const email = `oauth-new-race-${randomUUID()}@example.test`;
  try {
    const results = await Promise.allSettled([
      sql(`SELECT public.oauth_sign_in('${email}','New owner',NULL)`),
      sql(`SELECT public.oauth_sign_in('${email}','New owner',NULL)`),
    ]);
    for (const result of results) assert.equal(result.status, 'fulfilled');
    const accounts = results.map((result) => JSON.parse(result.value));
    assert.equal(accounts[0].id, accounts[1].id);
    assert.ok(accounts.every((account) => account.authVersion === 0 && account.isAdmin === false));
    assert.equal(await sql(`SELECT count(*) FROM public."User" WHERE email='${email}'`), '1');
  } finally { await sql(`DELETE FROM public."User" WHERE email='${email}'`); }
});

test('a bulk wishlist merge racing a single save cannot exceed 200 products', { skip: !enabled }, async () => {
  const owner = `wishlist-race-${randomUUID()}`;
  try {
    await sql(`INSERT INTO public."User"(id,name,email,password,"emailVerified") VALUES('${owner}','Wishlist owner','${owner}@example.test','',true);
      INSERT INTO public."Product"(id,name,image,brand,category,description,price,"countInStock","userId") SELECT '${owner}-'||n,'Product','/test.jpg','Test','soaps','Fixture',100,1,'${owner}' FROM generate_series(1,201) n;
      SELECT public.merge_account_wishlist('${owner}',ARRAY(SELECT '${owner}-'||n FROM generate_series(1,199) n));`);
    const results = await Promise.allSettled([
      sql(`SELECT public.merge_account_wishlist('${owner}',ARRAY['${owner}-200'])`),
      sql(`SELECT public.set_account_wishlist('${owner}','${owner}-201',true)`),
    ]);
    assert.equal(results[0].status, 'fulfilled');
    if (results[1].status === 'rejected') assert.match(results[1].reason.stderr, /WISHLIST_FULL/);
    assert.equal(await sql(`SELECT count(*) FROM public."Wishlist" WHERE "userId"='${owner}'`), '200');
    assert.equal(await sql(`SELECT count(*) FROM public."Wishlist" WHERE "userId"='${owner}' AND "productId" IN('${owner}-200','${owner}-201')`), '1');
  } finally {
    await sql(`DELETE FROM public."Wishlist" WHERE "userId"='${owner}'; DELETE FROM public."Product" WHERE "userId"='${owner}'; DELETE FROM public."User" WHERE id='${owner}'`);
  }
});
