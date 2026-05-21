# 🏗️ Clasloop Phase 1 — Setup Guide

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → Sign up (free)
2. Click **"New Project"**
3. Settings:
   - Name: `clasloop`
   - Password: generate a strong one, save it
   - Region: `Northeast Asia (ap-northeast-1)` ← closest to Korea
4. Wait ~2 minutes for the project to be ready

## Step 2: Set Up Database

Clasloop maintains a single canonical schema file regenerated from production via `pg_dump` (see `supabase/schema.README.md`).

### Fresh setup (new Supabase project)

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the **entire** content of `supabase/schema.sql` and paste it
4. Click **"Run"** (or Cmd+Enter)

This creates all tables, RLS policies, functions, triggers, and RPCs needed for Clasloop to run.

> **Note:** the files in `supabase/migrations/<timestamp>_*.sql` are historical migrations already incorporated into `schema.sql`. Do NOT apply them individually on top of `schema.sql` — that would attempt to recreate tables that already exist.

### Existing production project

Don't re-apply `schema.sql` — it's destructive on top of an existing schema. For incremental updates after a fresh setup, apply individual files from `supabase/migrations/` in timestamp order, following any per-PR README that documents new migrations.

### Database history

Production schema is captured in `supabase/schema.sql` (regenerated from `pg_dump` — see `supabase/schema.README.md`). For historical context, individual migrations live in `supabase/migrations/<timestamp>_*.sql`. You don't need to apply them — they're already in `schema.sql`.

### Edge Functions

After the schema, deploy the Edge Functions:

```bash
npx supabase functions deploy generate-insight
npx supabase secrets set WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

Then configure the webhook in Supabase Dashboard → Database → Webhooks (see PR 90 README for details).

### Cron jobs

Enable `pg_cron` and schedule `close_zombie_sessions` (see PR 103) and the existing scan-cleanup cron.

## Step 3: Enable Google Auth (Optional)

1. Go to **Authentication → Providers**
2. Find **Google** and enable it
3. You'll need to set up a Google OAuth app:
   - Go to [console.cloud.google.com](https://console.cloud.google.com)
   - Create a new project or use existing
   - Go to **APIs & Services → Credentials**
   - Create **OAuth 2.0 Client ID** (Web application)
   - Add authorized redirect URI: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
4. Copy the Client ID and Secret back to Supabase

## Step 4: Get API Keys

1. Go to **Settings → API**
2. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJ...` (the long one under "Project API keys")

## Step 5: Configure Project

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` with your Supabase values:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...your-key
   ```

## Step 6: Install & Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000` 🎉

## Project Structure

```
clasloop-phase1/
├── supabase/
│   └── schema.sql          # Database schema (run in Supabase SQL Editor)
├── src/
│   ├── lib/
│   │   ├── supabase.js     # Supabase client
│   │   └── ai.js           # Claude API question generation
│   ├── hooks/
│   │   ├── useAuth.js      # Auth: signup, login, Google, profile
│   │   ├── useSession.js   # Sessions: create, join PIN, real-time, answers
│   │   └── useClass.js     # Classes: create, join with code, manage
│   ├── components/         # UI components (from Phase 0)
│   ├── pages/              # Page components (from Phase 0)
│   └── ...
├── .env.example            # Environment variables template
├── package.json
└── README.md
```

## What's Included

### Database (schema.sql)
- **profiles**: User data, XP, level, streak, avatar
- **classes**: Teacher's classes with auto-generated codes
- **class_members**: Students enrolled in classes
- **sessions**: Warmups/exit tickets with questions JSON
- **session_participants**: Who joined each session
- **responses**: Individual answers with timing
- **topic_retention**: Spaced repetition data per topic
- **student_topic_progress**: Per-student retention
- **achievements**: Unlocked achievements
- **decks**: Community shared decks
- Row Level Security (RLS) on all tables
- Realtime enabled for live sessions
- Auto-create profile on signup trigger

### Auth (useAuth.js)
- Email/password signup & login
- Google OAuth
- Auto-profile creation
- Session persistence
- Profile updates

### Sessions (useSession.js)
- Create session with PIN
- Join session by PIN (no auth needed for students)
- Real-time participant updates (WebSocket)
- Real-time response tracking
- Submit answers with timing
- Session results calculation

### Classes (useClass.js)
- Create class with auto-generated code
- Join class by code
- List teacher's classes with member count

### AI (ai.js)
- Prompt engineering for 6 activity types
- Claude API integration
- Multi-language support

## Next Steps After Setup

1. ✅ Verify database tables exist (Supabase → Table Editor)
2. ✅ Test signup/login flow
3. ✅ Create a class and note the code
4. ✅ Create a session with AI-generated questions
5. ✅ Open another browser tab and join with PIN
6. ✅ Answer questions and see real-time results

## Costs

- Supabase free tier: 500MB database, 50K monthly active users
- Vercel free tier: unlimited deploys
- Claude API: ~$0.02 per question set (Haiku 4.5)
- **Total: ~$20-50/month** depending on usage
