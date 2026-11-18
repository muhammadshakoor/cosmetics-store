#!/usr/bin/env node
/**
 * Applies supabase/migrations/*.sql in filename order and records each one in
 * lumina_meta.schema_migrations so it never runs twice.
 *
 *   npm run db:status                         list applied / pending migrations
 *   npm run db:migrate                        apply every pending migration
 *   node scripts/migrate.mjs --baseline <f>   record files up to <f> as applied
 *                                             WITHOUT running them (for databases
 *                                             migrated by hand before this script)
 *
 * Connection: MIGRATION_DATABASE_URL, then DIRECT_URL, then DATABASE_URL
 * (read from the environment, .env.local and .env). The first that connects wins.
 * Set DATABASE_CA_CERT to the Supabase CA file (Dashboard → Database → SSL) to
 * verify the server certificate; otherwise the link is encrypted but unverified.
 *
 * Each migration runs in ONE transaction together with its history row, so a
 * failure leaves the database unchanged. Files may contain their own top-level
 * `begin;` / `commit;` lines — they are neutralised so the runner owns the
 * transaction. Don't use statements that cannot run in a transaction
 * (e.g. CREATE INDEX CONCURRENTLY) in migration files.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseEnv } from 'node:util';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');
const HISTORY = 'lumina_meta.schema_migrations';
const LOCK_KEY = 7_316_221; // arbitrary constant shared by every runner instance

// ── pure helpers (unit-tested) ─────────────────────────────────────────────

/** Line endings must not matter: git on Windows may check files out as CRLF. */
export function normalize(sql) {
  return sql.replace(/\r\n?/g, '\n');
}

export function checksum(sql) {
  return createHash('sha256').update(normalize(sql)).digest('hex');
}

/**
 * Blanks out top-level `begin;` / `commit;` lines with spaces of equal length,
 * so PostgreSQL error positions still map onto the original file.
 * PL/pgSQL block `begin` never ends with a semicolon, so bodies are untouched.
 * (`end;` is deliberately NOT matched: it closes every PL/pgSQL block.)
 */
export function neutralizeTransactionControl(sql) {
  return normalize(sql).replace(
    /^[ \t]*(begin|start transaction|commit)[ \t]*;[ \t]*$/gim,
    line => ' '.repeat(line.length),
  );
}

/** 1-based line number for a 1-based character position. */
export function lineAt(sql, position) {
  return sql.slice(0, Math.max(0, Number(position) - 1)).split('\n').length;
}

export function listMigrationFiles(dir = MIGRATIONS_DIR) {
  return readdirSync(dir).filter(name => name.endsWith('.sql')).sort();
}

// ── environment & connection ───────────────────────────────────────────────

function loadEnvFiles() {
  // Next.js precedence: real environment > .env.local > .env
  for (const file of ['.env.local', '.env']) {
    const full = path.join(ROOT, file);
    if (!existsSync(full)) continue;
    for (const [key, value] of Object.entries(parseEnv(readFileSync(full, 'utf8')))) {
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

function connectionCandidates() {
  const seen = new Set();
  return ['MIGRATION_DATABASE_URL', 'DIRECT_URL', 'DATABASE_URL']
    .map(name => ({ name, url: process.env[name]?.trim() }))
    .filter(({ url }) => url && !seen.has(url) && seen.add(url));
}

function describe(url) {
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || 5432}`;
  } catch {
    return '(unparseable URL)';
  }
}

function clientConfig(rawUrl) {
  const url = new URL(rawUrl);
  const sslmode = url.searchParams.get('sslmode');
  // pg lets URL ssl params override the ssl object, so strip them and decide here.
  for (const key of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'uselibpqcompat']) url.searchParams.delete(key);
  const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  let ssl = false;
  if (sslmode !== 'disable' && !(local && !sslmode)) {
    const ca = process.env.DATABASE_CA_CERT;
    ssl = ca ? { ca: readFileSync(ca, 'utf8'), rejectUnauthorized: true } : { rejectUnauthorized: false };
  }
  return { connectionString: url.toString(), ssl, connectionTimeoutMillis: 15_000, application_name: 'lumina-migrate' };
}

async function connect() {
  const { default: pg } = await import('pg');
  const candidates = connectionCandidates();
  if (!candidates.length) {
    throw new Error('No database URL found. Set DIRECT_URL or DATABASE_URL in .env (Supabase → Project Settings → Database → Connection string).');
  }
  for (const { name, url } of candidates) {
    const client = new pg.Client(clientConfig(url));
    try {
      await client.connect();
      console.log(`Connected via ${name} (${describe(url)})${process.env.DATABASE_CA_CERT ? '' : ' — TLS certificate not verified (set DATABASE_CA_CERT to verify)'}`);
      return client;
    } catch (error) {
      console.warn(`  ${name} (${describe(url)}) unavailable: ${error.code || ''} ${error.message}`.trimEnd());
      await client.end().catch(() => {});
    }
  }
  throw new Error('Could not connect with any configured database URL.');
}

// ── history table ──────────────────────────────────────────────────────────

async function ensureHistory(client) {
  // Kept outside `public` so the Supabase REST API never exposes it.
  await client.query(`
    create schema if not exists lumina_meta;
    revoke all on schema lumina_meta from public;
    do $$ begin
      if exists (select 1 from pg_roles where rolname = 'anon') then execute 'revoke all on schema lumina_meta from anon, authenticated'; end if;
    end $$;
    create table if not exists ${HISTORY} (
      name text primary key,
      checksum text not null,
      applied_at timestamptz not null default now(),
      baseline boolean not null default false
    );
  `);
}

async function readHistory(client) {
  const { rows } = await client.query(`select name, checksum, baseline from ${HISTORY}`);
  return new Map(rows.map(row => [row.name, row]));
}

function plan(files, history) {
  return files.map(name => {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8');
    const record = history.get(name);
    const sum = checksum(sql);
    const state = !record ? 'pending' : record.checksum === sum ? (record.baseline ? 'baseline' : 'applied') : 'changed';
    return { name, sql, checksum: sum, state };
  });
}

function printPlan(items) {
  const label = { applied: 'applied ', baseline: 'baseline', pending: 'PENDING ', changed: 'CHANGED ' };
  for (const item of items) console.log(`  [${label[item.state]}] ${item.name}`);
}

function assertNoDrift(items) {
  const changed = items.filter(item => item.state === 'changed');
  if (changed.length) {
    throw new Error(`These migrations were edited after being applied: ${changed.map(c => c.name).join(', ')}.\n` +
      'Never edit an applied migration — revert the edit and put the change in a new, later-dated file.');
  }
}

// ── commands ───────────────────────────────────────────────────────────────

async function apply(client, item) {
  const body = neutralizeTransactionControl(item.sql);
  await client.query('begin');
  try {
    await client.query('select pg_advisory_xact_lock($1)', [LOCK_KEY]);
    const { rowCount } = await client.query(`select 1 from ${HISTORY} where name = $1`, [item.name]);
    if (rowCount) {
      await client.query('rollback');
      console.log(`  skip   ${item.name} (applied by another runner)`);
      return;
    }
    const started = Date.now();
    await client.query(body);
    await client.query(`insert into ${HISTORY}(name, checksum) values ($1, $2)`, [item.name, item.checksum]);
    await client.query('commit');
    console.log(`  ✔ applied ${item.name} (${Date.now() - started} ms)`);
  } catch (error) {
    await client.query('rollback').catch(() => {});
    const where = error.position ? ` at line ${lineAt(body, error.position)}` : '';
    error.message = `${item.name}${where}: ${error.message} — rolled back, database unchanged by this file.`;
    throw error;
  }
}

async function migrate(client, items) {
  assertNoDrift(items);
  const pending = items.filter(item => item.state === 'pending');
  if (!pending.length) return console.log('Database is up to date. Nothing to apply.');

  const { rows: [{ has_store, history_empty }] } = await client.query(
    `select to_regclass('public."User"') is not null as has_store,
            not exists (select 1 from ${HISTORY}) as history_empty`);
  if (has_store && history_empty) {
    throw new Error('This database already has store tables but no migration history, so some files were probably applied by hand.\n' +
      'Record those first, naming the LAST file that is already applied:\n' +
      '  node scripts/migrate.mjs --baseline <file.sql>\n' +
      'then run `npm run db:migrate` again.');
  }

  console.log(`Applying ${pending.length} migration(s):`);
  for (const item of pending) await apply(client, item);
  console.log('Done. PostgREST schema cache reload was requested by the migrations that need it.');
}

async function baseline(client, items, upTo) {
  if (!items.some(item => item.name === upTo)) {
    throw new Error(`--baseline: "${upTo}" is not a file in supabase/migrations. Choose one of:\n  ${items.map(i => i.name).join('\n  ')}`);
  }
  assertNoDrift(items);
  const targets = items.slice(0, items.findIndex(item => item.name === upTo) + 1).filter(item => item.state === 'pending');
  for (const item of targets) {
    await client.query(`insert into ${HISTORY}(name, checksum, baseline) values ($1, $2, true) on conflict (name) do nothing`, [item.name, item.checksum]);
    console.log(`  ✔ recorded ${item.name} as already applied (not executed)`);
  }
  if (!targets.length) console.log('Nothing to record.');
}

async function main(argv) {
  const command = argv.includes('--status') ? 'status' : argv.includes('--baseline') ? 'baseline' : 'migrate';
  const upTo = command === 'baseline' ? argv[argv.indexOf('--baseline') + 1] : null;
  if (command === 'baseline' && !upTo) throw new Error('Usage: node scripts/migrate.mjs --baseline <file.sql>');

  loadEnvFiles();
  const client = await connect();
  try {
    await ensureHistory(client);
    const items = plan(listMigrationFiles(), await readHistory(client));
    console.log('Migrations:');
    printPlan(items);
    console.log('');
    if (command === 'baseline') await baseline(client, items, path.basename(upTo));
    else if (command === 'migrate') await migrate(client, items);
  } finally {
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(error => {
    console.error(`\n✖ ${error.message}`);
    process.exit(1);
  });
}
