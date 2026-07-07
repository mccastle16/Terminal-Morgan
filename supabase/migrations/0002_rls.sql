-- ============================================================================
-- CO_ Network — Row-Level Security (Week 1, REBUILD-PLAN.md D5)
--
-- Scoping matrix this file enforces:
--   * Directory basics (businesses, categories, neighborhoods): public read.
--   * Contact names (business_private): own business / chamber seats for
--     member businesses / admin.
--   * Provenance + corrections (business_fields): own business + admin only.
--   * Risk signals: own business (only rows passed the readability gate) + admin.
--   * Benchmarks/scores: own business + admin. Chamber aggregate access comes
--     later via security-definer functions with min-cell-size >= 5 (never raw rows).
--   * Edges: confirmed edges public; suggested/rejected visible only to the
--     endpoints' verified owners + admin.
--   * Claims: own claims + admin adjudication.
--   * Audit log: admin read; append-only.
--   * Recruit-queue / lead-gen surfaces: admin only (server-side, not here).
-- ============================================================================

-- ── Helper functions (security definer to avoid RLS recursion) ─────────────

create or replace function public.current_role_of(uid uuid)
returns public.account_role
language sql stable security definer set search_path = public as $$
  select role from public.accounts where id = uid
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role_of(auth.uid()) = 'admin', false)
$$;

create or replace function public.is_chamber_seat()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role_of(auth.uid())
                  in ('chamber_leadership','chamber_membership'), false)
$$;

-- Verified ownership of a specific business.
create or replace function public.owns_business(b uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.accounts a
    where a.id = auth.uid()
      and a.business_id = b
      and a.link_status = 'verified_owner'
  )
$$;

-- ── Enable RLS everywhere ───────────────────────────────────────────────────

alter table public.categories       enable row level security;
alter table public.neighborhoods    enable row level security;
alter table public.businesses       enable row level security;
alter table public.business_private enable row level security;
alter table public.business_fields  enable row level security;
alter table public.accounts         enable row level security;
alter table public.claims           enable row level security;
alter table public.edges            enable row level security;
alter table public.offers_needs     enable row level security;
alter table public.scores           enable row level security;
alter table public.risk_signals     enable row level security;
alter table public.audit_log        enable row level security;

-- ── Taxonomy: public read, admin write ──────────────────────────────────────

create policy categories_public_read on public.categories
  for select to anon, authenticated using (true);
create policy categories_admin_write on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy neighborhoods_public_read on public.neighborhoods
  for select to anon, authenticated using (true);
create policy neighborhoods_admin_write on public.neighborhoods
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── Businesses: public directory read; owner-limited update; admin full ─────

create policy businesses_public_read on public.businesses
  for select to anon, authenticated using (true);

-- Verified owners may update their business row directly for low-risk fields.
-- (Identity fields — name, category — go through the corrections queue in the
-- app layer; the API only exposes low-risk columns to owners. Admin unrestricted.)
create policy businesses_owner_update on public.businesses
  for update to authenticated
  using (public.owns_business(id) or public.is_admin())
  with check (public.owns_business(id) or public.is_admin());

create policy businesses_admin_insert on public.businesses
  for insert to authenticated with check (public.is_admin());
-- NOTE: owner "add my missing business" flow inserts via a security-definer
-- RPC (Week 2) that creates the row with status='unverified' + a claim.

create policy businesses_admin_delete on public.businesses
  for delete to authenticated using (public.is_admin());

-- ── business_private: contact persons are NOT public (D5/D8 #8) ─────────────

create policy business_private_read on public.business_private
  for select to authenticated
  using (
    public.is_admin()
    or public.owns_business(business_id)
    or (public.is_chamber_seat() and exists (
          select 1 from public.businesses b
          where b.id = business_id and b.chamber_member is true))
  );

create policy business_private_owner_write on public.business_private
  for update to authenticated
  using (public.owns_business(business_id) or public.is_admin())
  with check (public.owns_business(business_id) or public.is_admin());

create policy business_private_admin_insert on public.business_private
  for insert to authenticated with check (public.is_admin());

-- ── business_fields: provenance is owner-own + admin only ───────────────────

create policy business_fields_read on public.business_fields
  for select to authenticated
  using (public.is_admin() or public.owns_business(business_id));

-- Owners submit corrections as new provenance rows (source='owner').
-- Supersede/apply logic runs in the app layer; owners never edit history.
create policy business_fields_owner_correct on public.business_fields
  for insert to authenticated
  with check (
    public.is_admin()
    or (public.owns_business(business_id)
        and source = 'owner'
        and corrected_by = auth.uid())
  );

create policy business_fields_admin_update on public.business_fields
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ── accounts: self read/update (privilege columns trigger-guarded) ──────────

create policy accounts_self_read on public.accounts
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy accounts_self_update on public.accounts
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
-- role / link_status / business_id changes blocked for non-admins by
-- accounts_privilege_guard trigger (0001).

-- ── claims: own claims; admin adjudicates ────────────────────────────────────

create policy claims_read on public.claims
  for select to authenticated
  using (account_id = auth.uid() or public.is_admin());

create policy claims_create on public.claims
  for insert to authenticated
  with check (
    account_id = auth.uid()
    and status = 'pending'
    and decided_by is null
  );

-- Claimants may only withdraw; every other transition is admin/server-side.
create policy claims_update on public.claims
  for update to authenticated
  using (account_id = auth.uid() or public.is_admin())
  with check (public.is_admin() or (account_id = auth.uid() and status = 'withdrawn'));

-- ── edges: confirmed are public; suggestions are endpoint-owner-scoped ───────

create policy edges_read on public.edges
  for select to anon, authenticated
  using (
    status = 'confirmed_by_owner'
    or public.is_admin()
    or public.owns_business(src_business_id)
    or public.owns_business(dst_business_id)
  );

-- Owners confirm/reject suggestions on their own ego-graph.
create policy edges_owner_moderate on public.edges
  for update to authenticated
  using (
    public.is_admin()
    or public.owns_business(src_business_id)
    or public.owns_business(dst_business_id)
  )
  with check (
    public.is_admin()
    or status in ('confirmed_by_owner','rejected_by_owner')
  );

create policy edges_admin_insert on public.edges
  for insert to authenticated with check (public.is_admin());

create policy edges_admin_delete on public.edges
  for delete to authenticated using (public.is_admin());

-- ── offers_needs: owner-own + admin ─────────────────────────────────────────

create policy offers_needs_read on public.offers_needs
  for select to authenticated
  using (public.is_admin() or public.owns_business(business_id));

create policy offers_needs_owner_write on public.offers_needs
  for insert to authenticated
  with check (
    public.is_admin()
    or (public.owns_business(business_id) and source = 'owner')
  );

create policy offers_needs_owner_delete on public.offers_needs
  for delete to authenticated
  using (public.is_admin() or (public.owns_business(business_id) and source = 'owner'));

-- ── scores: owner-own + admin (aggregates come via definer fns, min-cell ≥5) ─

create policy scores_read on public.scores
  for select to authenticated
  using (public.is_admin() or public.owns_business(business_id));

create policy scores_admin_write on public.scores
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── risk_signals: owner sees only readability-gated rows (D8 #3) ────────────

create policy risk_signals_read on public.risk_signals
  for select to authenticated
  using (
    public.is_admin()
    or (public.owns_business(business_id) and owner_visible)
  );

create policy risk_signals_admin_write on public.risk_signals
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── audit_log: append-only; admin read ──────────────────────────────────────

create policy audit_log_admin_read on public.audit_log
  for select to authenticated using (public.is_admin());

create policy audit_log_append on public.audit_log
  for insert to authenticated with check (actor = auth.uid() or public.is_admin());
-- no update/delete policies: rows are immutable for everyone but service role
