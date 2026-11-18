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

async function sql(statement) {
  const endpoint = new URL(connection);
  assert.equal(endpoint.hostname, '127.0.0.1', 'DB tests require an isolated loopback cluster');
  assert.equal(endpoint.pathname, '/checkout_test', 'DB tests require the disposable checkout_test database');
  assert.notEqual(endpoint.port || '5432', '5432', 'DB tests refuse the normal PostgreSQL port');
  const result = await execFileAsync(psql, [connection, '-X', '-v', 'ON_ERROR_STOP=1', '-At', '-c', statement], { windowsHide: true });
  return result.stdout.trim();
}

test('SQL checkout transaction, retry, cancellation and permission regression suite', { skip: !enabled }, async () => {
  // Guard the endpoint before invoking the integration fixture.
  await sql('SELECT 1');
  await execFileAsync(psql, [connection, '-X', '-v', 'ON_ERROR_STOP=1', '-f', path.join(__dirname, 'checkout.integration.sql')], { windowsHide: true });
});

async function withFixture(stock, useCoupon, run) {
  const id = randomUUID();
  const fixture = { admin: `admin-${id}`, first: `first-${id}`, second: `second-${id}`, product: `product-${id}`, coupon: `COUPON-${id}`.toUpperCase() };
  try {
    await sql(`INSERT INTO "User"(id,name,email,password,"isAdmin") VALUES ('${fixture.admin}','Admin','${fixture.admin}@example.test','unused',true),('${fixture.first}','First','${fixture.first}@example.test','unused',false),('${fixture.second}','Second','${fixture.second}@example.test','unused',false);
      INSERT INTO "Product"(id,name,image,brand,category,description,price,"countInStock","userId") VALUES ('${fixture.product}','Concurrency fixture','/test.jpg','Test','soaps','Test item',1000,${stock},'${fixture.admin}');
      ${useCoupon ? `INSERT INTO "Coupon"(id,code,type,value,"usageLimit") VALUES ('${fixture.coupon}','${fixture.coupon}','percent',10,1);` : ''}`);
    await run(fixture);
  } finally {
    await sql(`DELETE FROM "Review" WHERE "productId"='${fixture.product}'; DELETE FROM "OrderItem" WHERE "productId"='${fixture.product}'; DELETE FROM "Order" WHERE "userId" IN ('${fixture.first}','${fixture.second}'); DELETE FROM "Product" WHERE id='${fixture.product}'; DELETE FROM "User" WHERE id IN ('${fixture.admin}','${fixture.first}','${fixture.second}'); DELETE FROM "Coupon" WHERE code='${fixture.coupon}';`);
  }
}

function checkout(fixture, customer, key, coupon = false) {
  return sql(`SELECT public.checkout_create_order('${customer}','[{"productId":"${fixture.product}","qty":1}]','{"address":"123 Main Street","city":"Lahore","postalCode":"54000","country":"Pakistan"}','+923001234567','Cash on Delivery (COD)',${coupon ? `'${fixture.coupon}'` : 'NULL'},'${key}',NULL);`);
}

test('simultaneous checkouts cannot oversell the last unit', { skip: !enabled }, async () => {
  await withFixture(1, false, async fixture => {
    const results = await Promise.allSettled([checkout(fixture, fixture.first, 'concurrent-attempt-first'), checkout(fixture, fixture.second, 'concurrent-attempt-second')]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.match(results.find(result => result.status === 'rejected').reason.stderr, /CHECKOUT_STOCK/);
    assert.equal(await sql(`SELECT "countInStock" FROM "Product" WHERE id='${fixture.product}'`), '0');
    assert.equal(await sql(`SELECT count(*) FROM "OrderItem" WHERE "productId"='${fixture.product}'`), '1');
  });
});

test('simultaneous retries create one order and decrement stock once', { skip: !enabled }, async () => {
  await withFixture(1, false, async fixture => {
    const results = await Promise.all([checkout(fixture, fixture.first, 'same-concurrent-attempt'), checkout(fixture, fixture.first, 'same-concurrent-attempt')]);
    const orders = results.map(result => JSON.parse(result));
    assert.equal(orders[0].order.id, orders[1].order.id);
    assert.equal(orders.filter(order => order.replayed).length, 1);
    assert.equal(await sql(`SELECT "countInStock" FROM "Product" WHERE id='${fixture.product}'`), '0');
  });
});

test('simultaneous checkouts cannot exceed coupon usage limit', { skip: !enabled }, async () => {
  await withFixture(5, true, async fixture => {
    const results = await Promise.allSettled([checkout(fixture, fixture.first, 'coupon-concurrent-first', true), checkout(fixture, fixture.second, 'coupon-concurrent-second', true)]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.match(results.find(result => result.status === 'rejected').reason.stderr, /CHECKOUT_COUPON/);
    assert.equal(await sql(`SELECT "usedCount" FROM "Coupon" WHERE code='${fixture.coupon}'`), '1');
    assert.equal(await sql(`SELECT "countInStock" FROM "Product" WHERE id='${fixture.product}'`), '4');
  });
});

test('SQL inventory, verified reviews and reporting beyond the REST row cap', { skip: !enabled }, async () => {
  await sql('SELECT 1');
  await execFileAsync(psql, [connection, '-X', '-v', 'ON_ERROR_STOP=1', '-f', path.join(__dirname, 'commerce.integration.sql')], { windowsHide: true });
});

test('simultaneous reviews preserve the complete product rating and count', { skip: !enabled }, async () => {
  await withFixture(5, false, async fixture => {
    const first = JSON.parse(await checkout(fixture, fixture.first, 'review-first-order-attempt')).order.id;
    const second = JSON.parse(await checkout(fixture, fixture.second, 'review-second-order-attempt')).order.id;
    for (const id of [first, second]) await sql(`SELECT checkout_transition_order('${id}','${fixture.admin}','picked_up'); SELECT checkout_transition_order('${id}','${fixture.admin}','on_the_way'); SELECT checkout_transition_order('${id}','${fixture.admin}','delivered');`);
    await Promise.all([
      sql(`SELECT commerce_create_review('${fixture.first}','${fixture.product}','${first}',5,'Excellent first soap')`),
      sql(`SELECT commerce_create_review('${fixture.second}','${fixture.product}','${second}',1,'Disappointing second soap')`),
    ]);
    assert.equal(await sql(`SELECT "numReviews" || ':' || rating FROM "Product" WHERE id='${fixture.product}'`), '2:3');
    assert.equal(await sql(`SELECT count(*) FROM "Review" WHERE "productId"='${fixture.product}'`), '2');
  });
});

test('a wishlist merge waiting on checkout stock cannot block its account foreign key', { skip: !enabled }, async () => {
  await withFixture(5, false, async fixture => {
    const application = `wishlist-checkout-${randomUUID()}`;
    const capture = promise => promise.then(value => ({ status: 'fulfilled', value }), reason => ({ status: 'rejected', reason }));
    // Hold the same product lock checkout takes before its Order INSERT needs
    // a KEY SHARE lock on User. The merge acquires its account lock meanwhile.
    const checkoutOutcome = capture(sql(`BEGIN;
      SET LOCAL application_name='${application}'; SET LOCAL deadlock_timeout='100ms'; SET LOCAL lock_timeout='5s';
      SELECT id FROM "Product" WHERE id='${fixture.product}' FOR UPDATE;
      SELECT pg_sleep(2);
      SELECT checkout_create_order('${fixture.first}','[{"productId":"${fixture.product}","qty":1}]',
        '{"address":"123 Main Street","city":"Lahore","postalCode":"54000","country":"Pakistan"}',
        '+923001234567','Cash on Delivery (COD)',NULL,'wishlist-checkout-attempt',NULL);
      COMMIT;`));
    let mergeOutcome;
    try {
      let locked = false;
      for (let attempt = 0; attempt < 50; attempt++) {
        locked = await sql(`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='${application}' AND wait_event='PgSleep')`) === 't';
        if (locked) break;
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      assert.equal(locked, true, 'checkout must hold the product row before the merge starts');
      const mergeApplication = `${application}-merge`;
      mergeOutcome = capture(sql(`BEGIN; SET LOCAL application_name='${mergeApplication}'; SET LOCAL deadlock_timeout='100ms'; SET LOCAL lock_timeout='5s';
        SELECT merge_account_wishlist('${fixture.first}',ARRAY['${fixture.product}']); COMMIT;`));
      let mergeWaiting = false;
      for (let attempt = 0; attempt < 50; attempt++) {
        mergeWaiting = await sql(`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='${mergeApplication}' AND wait_event_type='Lock')`) === 't';
        if (mergeWaiting) break;
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      assert.equal(mergeWaiting, true, 'the merge must be waiting on the locked product before checkout inserts its order');
      const results = await Promise.all([checkoutOutcome, mergeOutcome]);
      for (const result of results) assert.equal(result.status, 'fulfilled', result.reason?.stderr || result.reason?.message);
      assert.equal(await sql(`SELECT count(*) FROM "Order" WHERE "userId"='${fixture.first}'`), '1');
      assert.equal(await sql(`SELECT count(*) FROM "Wishlist" WHERE "userId"='${fixture.first}' AND "productId"='${fixture.product}'`), '1');
      assert.equal(await sql(`SELECT "countInStock" FROM "Product" WHERE id='${fixture.product}'`), '4');
    } finally {
      await checkoutOutcome;
      if (mergeOutcome) await mergeOutcome;
    }
  });
});
