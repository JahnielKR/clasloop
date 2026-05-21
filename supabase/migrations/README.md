# Clasloop migrations

This directory holds **historical migrations** that were applied to production, in the order listed by the timestamp prefix. The current canonical schema is in `../schema.sql` (regenerated from prod after every change — see `../schema.README.md`).

## When to use these files

- **Fresh setup:** don't. Use `../schema.sql` instead — it's the canonical baseline.
- **Reading history:** these files document what changed and when.
- **Applying a new migration:** create a new file with timestamp prefix `YYYYMMDDHHMMSS_<slug>.sql` (matching Supabase CLI convention), apply it to prod, then regenerate `../schema.sql`.

## Convention

```
<timestamp>_<short_descriptive_slug>.sql
```

Timestamp is the moment of application (UTC). Slugs are snake_case English.

## Tooling (future)

When the project moves to `supabase db push` workflow, this directory is what `supabase migration list` reads. Until then, it's documentation only.
