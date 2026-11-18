# Lumina storefront

This directory is the deployable Next.js application. Setup, environment variables,
database migration order, deployment, and validation are documented in the
[project README](../README.md).

Run npm ci, then npm run dev to start http://localhost:3001.

Before deployment, apply every migration in supabase/migrations in filename order,
then run npm run lint, npm test, and npm run build. Database regression tests
require a disposable loopback PostgreSQL database; see the project README.
