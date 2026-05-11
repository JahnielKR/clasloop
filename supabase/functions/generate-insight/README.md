# `generate-insight` Edge Function — Deploy guide

This function generates the post-session weak-points insight. It's triggered automatically by a Database Webhook when a session's `status` changes to `'completed'`.

## One-time setup

You only do this once, after the first time the function is deployed.

### Step 1: Run the migration

In Supabase Dashboard → SQL Editor, paste and run `supabase/phase13_session_insights.sql`.

This creates the `session_insights` table, RLS policies, and indexes.

### Step 2: Deploy the Edge Function

From your local terminal (in the `clasloop-phase1` directory):

```bash
# First time only: link the project (if not already linked)
supabase link --project-ref mhfwyeczzilcizawixqw

# Deploy the function
supabase functions deploy generate-insight
```

If `supabase` command isn't found, install the CLI:
- macOS: `brew install supabase/tap/supabase`
- Other: see https://supabase.com/docs/guides/cli

You'll be asked to log in (`supabase login`) the first time.

### Step 3: Set the function's secrets

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxx
```

Replace `sk-ant-xxx` with your actual Anthropic API key (the same one used in Vercel).

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set automatically by Supabase — you don't need to set them manually.

### Step 4: Create the Database Webhook

In Supabase Dashboard → Database → Webhooks → "Create a new hook":

| Field | Value |
|---|---|
| Name | `generate-insight-on-session-complete` |
| Table | `sessions` |
| Events | ☑ Update (only Update, not Insert/Delete) |
| Type | Supabase Edge Functions |
| Edge Function | `generate-insight` |
| Method | POST |
| Timeout | 30000 (30 seconds — Haiku can take a few seconds) |

Click **Confirm**.

The webhook fires on EVERY update to `sessions`, including ones where status didn't change. The function itself filters: if `record.status !== 'completed'`, it returns early with `{skipped: 'not_a_session_completion'}`. This is fine — the early return is fast.

### Step 5: Test

End a real session in Clasloop. Within 5-10 seconds:

1. Open Supabase Dashboard → Table Editor → `session_insights`
2. You should see a new row for that session_id
3. `status` should be `'ready'` (or `'empty'` if no question had ≥30% fails with ≥3 students)
4. If `status = 'failed'`, check `error_message` for the cause

If nothing appears at all, check:
- Supabase Dashboard → Edge Functions → `generate-insight` → Logs
- Supabase Dashboard → Database → Webhooks → your webhook → Recent deliveries

## Updating the function

After making code changes in `supabase/functions/generate-insight/`:

```bash
supabase functions deploy generate-insight
```

That's it. Vercel-style "git push and forget" doesn't work here — Edge Functions deploy via CLI.

## How it works (architecture)

```
1. Teacher ends session in UI → SessionFlow.handleEnd()
                                       ↓
2. UPDATE sessions SET status='completed' WHERE id=...
                                       ↓
3. Database Webhook fires → POSTs to /functions/v1/generate-insight
                                       ↓
4. This Edge Function runs (in Deno, in Supabase's runtime):
   - Reads deck, responses, participants
   - Computes candidates (insight-prep.ts)
   - If ≥1 candidate, calls Haiku for labels
   - Saves to session_insights with status='ready' or 'empty' or 'failed'
                                       ↓
5. Meanwhile, teacher navigates to /sessions/<id>/recap
                                       ↓
6. SessionRecap page polls /api/session-insight every 1.5s
                                       ↓
7. When status='ready', the insight bar renders above the leaderboard.
```

## Local development (optional)

To test locally before deploying:

```bash
# Start the local Edge Function runtime
supabase functions serve generate-insight --env-file .env.local

# In another terminal, send a test payload:
curl -X POST http://localhost:54321/functions/v1/generate-insight \
  -H "Content-Type: application/json" \
  -d '{
    "type": "UPDATE",
    "table": "sessions",
    "record": {
      "id": "<a real session id>",
      "status": "completed",
      "deck_id": "<the deck id of that session>"
    }
  }'
```

You'll need a `.env.local` file with `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## Files

| File | Purpose |
|---|---|
| `index.ts` | Main handler — receives webhook, orchestrates the pipeline |
| `insight-prep.ts` | Pure function: raw data → weak-point candidates |
| `insight-prompt.ts` | Haiku prompt + response parser |
| `README.md` | This file |

## Reverting / disabling

If you want to disable insight generation without removing code:

1. Supabase Dashboard → Database → Webhooks → toggle the webhook off

The frontend's polling will time out at 15s and render nothing — no error visible to the teacher. To fully remove: revert the PR via `git revert`, then `supabase functions delete generate-insight` to remove the function.
