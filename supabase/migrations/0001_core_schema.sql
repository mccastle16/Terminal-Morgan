-- ============================================================================
-- CO_ Network — Core Schema (Week 1, REBUILD-PLAN.md D3/D5)
-- Coral Gables business relationship network.
--
-- Design constraints this schema encodes:
--   * Per-field provenance (business_fields) — every enriched value carries
--     source / confidence / observed_at and can be corrected by its owner.
--   * Three independent axes: account role ≠ chamber status ≠ link status.
--   * chamber_member is TRI-STATE (true / false / NULL=unknown). The legacy
--     CSV flattened ~1,081 unknowns into 'N'; the migration script restores
--     NULL from git history (commit 726798f). Never treat NULL as false.
--   * Adverse content (risk_signals) lives in its own table, owner-scoped,
--     hidden until the owner-readability pass marks it owner_visible.
--   * Edges are relational (no graph DB). Deterministic edges generated in
--     SQL (0003); inferred offers/needs edges arrive in Week 4+.
-- ============================================================================

create extension if not exists postgis with schema extensions;
create extension if not exists vector with schema extensions;

-- ── Enums ───────────────────────────────────────────────────────────────────

create type public.account_role as enum
  ('owner', 'chamber_leadership', 'chamber_membership', 'admin');

create type public.link_status as enum
  ('unlinked', 'pending_claim', 'verified_owner');

create type public.business_status as enum
  ('active', 'closed', 'unverified');

create type public.claim_method as enum
  ('sms_otp', 'domain_email', 'sunbiz', 'document', 'manual');

create type public.claim_status as enum
  ('pending', 'awaiting_otp', 'verified', 'rejected', 'contested', 'withdrawn');

create type public.edge_type as enum
  ('near', 'same_category', 'competes_with', 'same_owner', 'offers_needs_match');

create type public.edge_status as enum
  ('suggested', 'confirmed_by_owner', 'rejected_by_owner');

create type public.field_source as enum
  ('owner', 'sunbiz', 'google', 'osm', 'chamber', 'co_platform', 'pipeline', 'other');

-- ── Taxonomy (canonical — fixes the legacy CSV divergence) ─────────────────

create table public.categories (
  id          smallint generated always as identity primary key,
  slug        text not null unique,
  label       text not null,
  high_value  boolean not null default false   -- professional-services tier (ICP segment 1)
);

create table public.neighborhoods (
  id    smallint generated always as identity primary key,
  slug  text not null unique,
  label text not null,
  is_catchall boolean not null default false   -- 'Coral Gables' generic bucket
);

-- ── Businesses (public-safe columns ONLY — no person names here) ───────────

create table public.businesses (
  id                   uuid primary key default gen_random_uuid(),
  legacy_business_id   text unique,             -- CSV business_id for idempotent re-runs
  name                 text not null,
  slug                 text not null unique,    -- SSR directory URL: /b/{slug}
  category_id          smallint references public.categories(id),
  category_secondary   text,
  neighborhood_id      smallint references public.neighborhoods(id),
  address              text,
  postcode             text,
  location             extensions.geography(point, 4326),
  -- 'exact' = per-business geocode (CSV lat/lon cols 7-8, 1,695 distinct pts);
  -- 'approximate' = postcode/neighborhood centroid backfill (CSV latitude/
  -- longitude cols 38-39 — only 28 distinct points for 2,650 rows!).
  -- Distance-based edges (0003) MUST require 'exact' on both endpoints.
  location_precision   text check (location_precision in ('exact','approximate')),
  phone                text,
  website              text,
  price_tier           text check (price_tier in ('$','$$','$$$','$$$$')),
  price_tier_inferred  boolean not null default false,
  rating               numeric(2,1) check (rating between 0 and 5),
  review_count         integer,
  chamber_member       boolean,                 -- TRI-STATE: null = unknown
  chamber_member_verified_at timestamptz,
  status               public.business_status not null default 'active',
  osint_confidence     numeric(3,2),
  validation_tier      text,
  search_tsv           tsvector generated always as (
                         to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(address,''))
                       ) stored,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index businesses_location_gix on public.businesses using gist (location);
create index businesses_search_gin   on public.businesses using gin (search_tsv);
create index businesses_category_ix  on public.businesses (category_id);
create index businesses_neighborhood_ix on public.businesses (neighborhood_id);

-- ── Accounts (1:1 with auth.users) ─────────────────────────────────────────

create table public.accounts (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  display_name text,
  role         public.account_role not null default 'owner',
  link_status  public.link_status not null default 'unlinked',
  business_id  uuid references public.businesses(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.businesses
  add column claimed_by uuid references public.accounts(id) on delete set null;

-- ── Private business data (contact persons — scoped, never public) ─────────

create table public.business_private (
  business_id  uuid primary key references public.businesses(id) on delete cascade,
  contact_name text,
  notes        text,
  updated_at   timestamptz not null default now()
);

-- ── Per-field provenance — the correction/trust mechanism (D4/D10) ─────────

create table public.business_fields (
  id            bigint generated always as identity primary key,
  business_id   uuid not null references public.businesses(id) on delete cascade,
  field         text not null,
  value         text,
  source        public.field_source not null,
  source_detail text,                     -- e.g. 'outscraper', batch id, correction note
  confidence    numeric(3,2),
  observed_at   timestamptz not null default now(),
  is_current    boolean not null default true,
  corrected_by  uuid references public.accounts(id),
  created_at    timestamptz not null default now()
);

create index business_fields_current_ix
  on public.business_fields (business_id, field) where is_current;
create index business_fields_stale_ix
  on public.business_fields (observed_at) where is_current;  -- staleness-targeted refresh

-- ── Claims (D6) ─────────────────────────────────────────────────────────────

create table public.claims (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  account_id      uuid not null references public.accounts(id) on delete cascade,
  method          public.claim_method,
  status          public.claim_status not null default 'pending',
  evidence        jsonb not null default '{}'::jsonb,  -- purge document refs 90d post-decision
  decided_by      uuid references public.accounts(id),
  decided_at      timestamptz,
  decision_reason text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index claims_business_ix on public.claims (business_id);
create index claims_account_ix  on public.claims (account_id);
-- one live claim per (business, account)
create unique index claims_live_uix on public.claims (business_id, account_id)
  where status in ('pending','awaiting_otp','contested');

-- ── Edges (relational graph, D3) ────────────────────────────────────────────

create table public.edges (
  id               bigint generated always as identity primary key,
  src_business_id  uuid not null references public.businesses(id) on delete cascade,
  dst_business_id  uuid not null references public.businesses(id) on delete cascade,
  type             public.edge_type not null,
  weight           numeric(4,3),
  confidence       numeric(3,2),
  evidence         jsonb not null default '{}'::jsonb,  -- ALWAYS explain why (D10)
  status           public.edge_status not null default 'suggested',
  generated_by     text not null default 'rule' check (generated_by in ('rule','model','owner')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint edges_no_self check (src_business_id <> dst_business_id),
  constraint edges_canonical_order check (src_business_id < dst_business_id),  -- undirected, one row per pair+type
  unique (src_business_id, dst_business_id, type)
);

create index edges_src_ix on public.edges (src_business_id);
create index edges_dst_ix on public.edges (dst_business_id);
create index edges_status_ix on public.edges (status);

-- same_category is intentionally NOT materialized (would be ~100k redundant
-- rows derivable from a category join). Query it via this view when needed.
create view public.same_category_pairs as
  select b1.id as src_business_id, b2.id as dst_business_id, b1.category_id
  from public.businesses b1
  join public.businesses b2
    on b1.category_id = b2.category_id and b1.id < b2.id;

-- ── Offers / Needs (Week 4+ matching substrate) ─────────────────────────────

create table public.offers_needs (
  id          bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind        text not null check (kind in ('offers','needs')),
  term        text not null,
  embedding   extensions.vector(1536),
  source      public.field_source not null default 'pipeline',
  confidence  numeric(3,2),
  created_at  timestamptz not null default now(),
  unique (business_id, kind, term)
);

-- ── Scores (batch-computed; scoring-independence firewall lives here — D7) ──
-- Score computation NEVER takes input from CO_ sales activity. Batch layer
-- writes via service role; UI only reads.

create table public.scores (
  id          bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  score_type  text not null,          -- 'visibility','benchmark_percentile','sentiment_css','centrality',...
  value       numeric,
  inputs      jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now(),
  unique (business_id, score_type)
);

-- ── Risk signals (adverse content — owner-scoped, D8 risks #2/#3) ──────────

create table public.risk_signals (
  id            bigint generated always as identity primary key,
  business_id   uuid not null references public.businesses(id) on delete cascade,
  signal_type   text not null,        -- 'low_rating','no_contact_info','suspicious_rating',...
  severity      text not null check (severity in ('info','operational','critical')),
  detail        text,                 -- must pass owner-readability before owner_visible=true
  owner_visible boolean not null default false,
  source        public.field_source not null default 'pipeline',
  observed_at   timestamptz not null default now()
);

create index risk_signals_business_ix on public.risk_signals (business_id);

-- ── Audit log (append-only) ─────────────────────────────────────────────────

create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor       uuid,                   -- accounts.id; null = system/pipeline
  action      text not null,
  entity_type text,
  entity_id   text,
  before      jsonb,
  after       jsonb,
  at          timestamptz not null default now()
);

-- ── Housekeeping triggers ───────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger businesses_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();
create trigger accounts_updated_at before update on public.accounts
  for each row execute function public.set_updated_at();
create trigger claims_updated_at before update on public.claims
  for each row execute function public.set_updated_at();
create trigger edges_updated_at before update on public.edges
  for each row execute function public.set_updated_at();

-- Auto-create an account row when a user signs up (role always 'owner';
-- privileged roles are granted only by admin — never self-selected).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.accounts (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Privilege-escalation guard: only admins (or service-role/pipeline contexts,
-- where auth.uid() is null) may change role / link_status / business_id.
create or replace function public.guard_account_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;  -- service role / SQL console
  if exists (select 1 from public.accounts a where a.id = auth.uid() and a.role = 'admin') then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.link_status is distinct from old.link_status
     or new.business_id is distinct from old.business_id then
    raise exception 'not authorized to change role/link_status/business_id';
  end if;
  return new;
end $$;

create trigger accounts_privilege_guard before update on public.accounts
  for each row execute function public.guard_account_privileges();

-- Anti-abuse: max 2 live claims per account (D6).
create or replace function public.guard_claim_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.claims
      where account_id = new.account_id
        and status in ('pending','awaiting_otp')) >= 2 then
    raise exception 'claim limit reached: at most 2 pending claims per account';
  end if;
  return new;
end $$;

create trigger claims_limit_guard before insert on public.claims
  for each row execute function public.guard_claim_limit();
