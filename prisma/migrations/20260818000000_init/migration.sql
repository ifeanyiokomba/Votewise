# VoteWise Initial Migration

This migration baselines the database schema as of August 2026.

## How to apply

### For a fresh database:
```bash
DATABASE_URL="your_postgres_url" bunx prisma migrate deploy
```

### For an existing database (already has tables from db:push):
The tables already exist — this migration is for version control going forward.
Future schema changes should use `bunx prisma migrate dev --name <description>`
to generate new migration files, which are then reviewed and committed.

## Why this matters (VW-013)
`db:push --accept-data-loss` was the only schema management method, which is
unreviewable and unaudited. This baseline migration establishes proper
migration history for a system that certifies election results.
