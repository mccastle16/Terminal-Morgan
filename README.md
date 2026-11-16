# Chamber Intelligence — CGCC Reputation Terminal

A reputation-management dashboard for Coral Gables Chamber of Commerce (CGCC) member businesses: a single sign-in where a member can see their ratings/reviews at a glance, and the Chamber gets an admin view across its membership. Built as a Next.js app backed by Supabase (auth + Postgres).

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| Auth + Database | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) |

## Project structure

```
Terminal-Morgan/
|-- web/                      -- the Next.js app (everything runs from here)
|   |-- src/app/
|   |   |-- page.tsx          -- Overview: a member's reputation dashboard (auth-gated)
|   |   |-- login/page.tsx    -- sign in (password or emailed magic link)
|   |   |-- layout.tsx, globals.css
|   |   |-- lib/supabase/     -- client.ts (browser) / server.ts (server components)
|   |-- public/               -- static assets
|
|-- supabase/
|   |-- config.toml           -- local Supabase CLI config
|   |-- migrations/           -- Postgres schema (chambers, businesses, profiles, reviews, ...)
|
|-- data/                     -- reference/seed data, not yet wired into the app
|   |-- master_all_businesses.csv
|   |-- acceptance/sample.csv
|   |-- config/neighborhoods.json
|
|-- CGCC-members.md           -- raw CGCC member directory (candidate seed data)
```

## Running it locally

```bash
cd web
npm install        # first run only
npm run dev
```

Open **http://localhost:3000**. You'll be redirected to `/login` until you sign in with a Supabase user.

The app reads its Supabase connection from `web/.env.local` (git-ignored):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

## Database

Schema lives in [supabase/migrations](./supabase/migrations). Core tables: `chambers`, `profiles` (member/admin role, linked to a chamber), `businesses`, `business_profile`, `business_metrics`, `business_insights`, `business_members` (ownership claims), `business_registrations`, `categories`/`category_groups`, `chamber_businesses`, `reviews`.

To apply migrations against a local or linked Supabase project, use the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/config) from the `supabase/` directory.

## Current status

- Auth and the Overview page UI are built; the Overview page currently renders placeholder ("No data yet") stat cards — it is not yet querying `businesses`/`business_metrics`/`reviews` for the signed-in user's business.
- `data/` and `CGCC-members.md` hold raw/reference data (collected business records, the CGCC member directory) that hasn't been imported into Supabase yet.

## License

Internal use.
