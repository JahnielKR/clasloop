# Clasloop schema baseline

This file (`schema.sql`) is the **canonical, current** database schema for Clasloop, regenerated from production via `pg_dump`.

**Source of truth:** this file. NOT the individual `phase*.sql` / `pr*.sql` files in this directory — those are historical migrations that have already been applied to prod.

## To set up a fresh database

1. Create a new Supabase project.
2. Open SQL Editor → New Query.
3. Paste the entire content of `schema.sql`.
4. Run.

That's it. No migrations needed.

## To regenerate this file after schema changes

After any production schema change (a new migration applied, an RPC added, etc.):

```bash
# Requires Docker Desktop running (the Supabase CLI uses a pg_dump image).
npx supabase db dump --schema=public,auth,storage -f /tmp/prod-schema.sql

# Clean up pg_dump noise:
sed -i '/^-- Dumped from database version/d;/^-- Dumped by pg_dump version/d;/^SET /d;/^SELECT pg_catalog\.set_config/d' /tmp/prod-schema.sql

# Prepend the canonical header (see PR 101 README for the template), then commit.
cp /tmp/prod-schema.sql supabase/schema.sql
```

Commit message: `chore(db): regenerate schema.sql baseline (post-<PR-or-feature-name>)`

## Known dump quirks

- pg_dump emits tables using quoted identifiers (`CREATE TABLE IF NOT EXISTS "public"."foo"`). That's fine — Postgres accepts them, and grepping for tables must allow for the quoting.
- `auth` and `storage` schemas are included because Clasloop relies on a few `auth.*` references (RLS policies tied to `auth.uid()`). They are managed by Supabase but the dump captures the version present at dump time.
- Some RPCs include `ALTER FUNCTION ... OWNER TO "postgres";` lines after each definition. Pasting in a fresh project as the project owner is fine; if you run as a non-owner role you may need to drop those lines.

## Per-PR migration files

The `phase*.sql` and `pr*.sql` files in this directory remain for historical reference (and for PR 102, which reorganizes them into `migrations/`). After PR 102 lands, those files move to `migrations/<timestamp>_*.sql` and this directory only contains `schema.sql` + `functions/`.
