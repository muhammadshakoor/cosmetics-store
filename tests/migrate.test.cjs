const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const load = () => import('../scripts/migrate.mjs');
const dir = path.join(__dirname, '..', 'supabase', 'migrations');

test('migrations are discovered in filename (date) order', async () => {
  const { listMigrationFiles } = await load();
  const files = listMigrationFiles();
  assert.ok(files.length > 0);
  assert.deepEqual(files, [...files].sort());
  assert.ok(files.every(name => /^\d{12}_[a-z0-9_]+\.sql$/.test(name)), 'name files YYYYMMDDNNNN_description.sql');
});

test('checksums ignore Windows vs Unix line endings', async () => {
  const { checksum } = await load();
  assert.equal(checksum('select 1;\r\nselect 2;\r\n'), checksum('select 1;\nselect 2;\n'));
  assert.notEqual(checksum('select 1;'), checksum('select 2;'));
});

test('only top-level transaction lines are neutralised, preserving offsets', async () => {
  const { neutralizeTransactionControl, lineAt } = await load();
  const sql = [
    'BEGIN;',
    'create function f() returns int language plpgsql as $$',
    'begin',
    '  return 1;',
    'end;',
    '$$;',
    'do $$ begin perform 1; end $$;',
    'COMMIT;',
  ].join('\n');
  const out = neutralizeTransactionControl(sql);
  assert.equal(out.length, sql.length);
  const lines = out.split('\n');
  assert.equal(lines[0].trim(), '');
  assert.equal(lines[2], 'begin');
  assert.equal(lines[4], 'end;', 'PL/pgSQL end; must survive');
  assert.equal(lines[6], 'do $$ begin perform 1; end $$;');
  assert.equal(lines[7].trim(), '');
  assert.equal(lineAt(out, sql.indexOf('return 1') + 1), 4);
});

test('no migration uses statements that cannot run inside a transaction', () => {
  for (const name of fs.readdirSync(dir).filter(f => f.endsWith('.sql'))) {
    const sql = fs.readFileSync(path.join(dir, name), 'utf8');
    assert.doesNotMatch(sql, /\bconcurrently\b/i, `${name}: CREATE INDEX CONCURRENTLY cannot run in the runner's transaction`);
    assert.doesNotMatch(sql, /^\s*vacuum\b/im, `${name}: VACUUM cannot run in a transaction`);
  }
});
