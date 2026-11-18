// Seed data includes published demo credentials and deletes the existing store.
// Both an explicit acknowledgement and a loopback database are required.
export function assertDisposableLocalSeed(environment: NodeJS.ProcessEnv = process.env): void {
  if (environment.NODE_ENV !== 'development' || environment.ALLOW_DESTRUCTIVE_SEED !== 'disposable-local-only') {
    throw new Error('Seeding requires NODE_ENV=development and ALLOW_DESTRUCTIVE_SEED=disposable-local-only.');
  }
  let target: URL;
  try { target = new URL(environment.SUPABASE_URL || ''); }
  catch { throw new Error('Seeding requires a disposable local Supabase URL.'); }
  if (target.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)
    || target.username || target.password || target.pathname !== '/' || target.search || target.hash) {
    throw new Error('Seeding is restricted to a disposable Supabase instance on a loopback HTTP address.');
  }
}
