# Chamber Intelligence — CGCC Reputation Terminal

A reputation-management dashboard for Coral Gables Chamber of Commerce (CGCC) member businesses. The Next.js app currently displays a public Overview, and the Supabase directory contains the database schema.

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
|   |   |-- page.tsx          -- Overview: public reputation dashboard
|   |   |-- login/page.tsx    -- redirect to Overview for legacy links
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

Open **http://localhost:3000** to view the dashboard without signing in or configuring Supabase.

## Database

Schema lives in [supabase/migrations](./supabase/migrations). Core tables: `chambers`, `profiles` (member/admin role, linked to a chamber), `businesses`, `business_profile`, `business_metrics`, `business_insights`, `business_members` (ownership claims), `business_registrations`, `categories`/`category_groups`, `chamber_businesses`, `reviews`.

To apply migrations against a local or linked Supabase project, use the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/config) from the `supabase/` directory.

## Current status

- The Overview page renders placeholder ("No data yet") stat cards.
- `data/` and `CGCC-members.md` hold raw/reference data (collected business records, the CGCC member directory) that hasn't been imported into Supabase yet.

## License

Internal use.
