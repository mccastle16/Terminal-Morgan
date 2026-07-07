-- ============================================================================
-- CO_ Network — Deterministic edge generation (Week 1, REBUILD-PLAN.md D3)
--
-- Replaces the Neo4j ETL (data/etl/loader.py) edge logic with plain SQL.
-- Three rule-based edge types, each carrying evidence explaining WHY (D10):
--
--   near          — businesses within 200 m of each other
--   competes_with — same category AND (within 1,000 m OR same non-catchall
--                   neighborhood); weight reflects rating proximity
--   same_owner    — SunBiz registrant match (conf 0.9) when that enrichment
--                   exists; shared phone number (conf 0.6) as the available-
--                   today signal (170 phones shared across 369 businesses)
--
-- same_category is NOT materialized — it is a category join, exposed as the
-- same_category_pairs view (0001). Materializing it would add ~100k rows of
-- zero information.
--
-- Idempotent: canonical (src < dst) ordering + ON CONFLICT DO NOTHING, so it
-- never clobbers owner confirm/reject status on existing edges (the flywheel).
-- Run via service role after each data refresh:  select * from public.generate_deterministic_edges();
-- ============================================================================

create or replace function public.generate_deterministic_edges()
returns table (edge_kind text, inserted bigint)
language plpgsql security definer set search_path = public, extensions as $$
declare
  n_near bigint; n_comp bigint; n_owner bigint;
begin
  -- ── NEAR: within 200 m ────────────────────────────────────────────────────
  with ins as (
    insert into public.edges
      (src_business_id, dst_business_id, type, weight, confidence, evidence, generated_by)
    select
      b1.id, b2.id, 'near',
      round((1 - st_distance(b1.location, b2.location) / 200.0)::numeric, 3),
      1.00,
      jsonb_build_object(
        'distance_m', round(st_distance(b1.location, b2.location)::numeric),
        'reason', 'within 200m'),
      'rule'
    from public.businesses b1
    join public.businesses b2
      on b1.id < b2.id
     and st_dwithin(b1.location, b2.location, 200)
    where b1.location is not null and b2.location is not null
      and b1.status <> 'closed' and b2.status <> 'closed'
    on conflict (src_business_id, dst_business_id, type) do nothing
    returning 1
  ) select count(*) into n_near from ins;

  -- ── COMPETES_WITH: same category + geographic overlap ─────────────────────
  with ins as (
    insert into public.edges
      (src_business_id, dst_business_id, type, weight, confidence, evidence, generated_by)
    select
      b1.id, b2.id, 'competes_with',
      round((1 - coalesce(abs(b1.rating - b2.rating), 2.5) / 5.0)::numeric, 3),
      0.85,
      jsonb_build_object(
        'category_id', b1.category_id,
        'basis', case
          when b1.location is not null and b2.location is not null
               and st_dwithin(b1.location, b2.location, 1000)
          then 'same category within 1km'
          else 'same category, same neighborhood' end),
      'rule'
    from public.businesses b1
    join public.businesses b2
      on b1.id < b2.id
     and b1.category_id = b2.category_id
    left join public.neighborhoods n1 on n1.id = b1.neighborhood_id
    where b1.status <> 'closed' and b2.status <> 'closed'
      and (
        (b1.location is not null and b2.location is not null
         and st_dwithin(b1.location, b2.location, 1000))
        or
        (b1.neighborhood_id is not null
         and b1.neighborhood_id = b2.neighborhood_id
         and not coalesce(n1.is_catchall, false))
      )
    on conflict (src_business_id, dst_business_id, type) do nothing
    returning 1
  ) select count(*) into n_comp from ins;

  -- ── SAME_OWNER: SunBiz registrant match (strong) ──────────────────────────
  with sunbiz as (
    select bf.business_id, lower(trim(bf.value)) as registrant
    from public.business_fields bf
    where bf.field = 'sunbiz_name' and bf.is_current and coalesce(bf.value,'') <> ''
  ), ins as (
    insert into public.edges
      (src_business_id, dst_business_id, type, weight, confidence, evidence, generated_by)
    select
      least(s1.business_id, s2.business_id),
      greatest(s1.business_id, s2.business_id),
      'same_owner', 1.000, 0.90,
      jsonb_build_object('basis', 'sunbiz registrant match', 'registrant', s1.registrant),
      'rule'
    from sunbiz s1
    join sunbiz s2
      on s1.registrant = s2.registrant
     and s1.business_id < s2.business_id
    on conflict (src_business_id, dst_business_id, type) do nothing
    returning 1
  ) select count(*) into n_owner from ins;

  -- ── SAME_OWNER: shared phone (weaker signal, available today) ─────────────
  with ins as (
    insert into public.edges
      (src_business_id, dst_business_id, type, weight, confidence, evidence, generated_by)
    select
      b1.id, b2.id, 'same_owner', 0.700, 0.60,
      jsonb_build_object('basis', 'shared phone number'),
      'rule'
    from public.businesses b1
    join public.businesses b2
      on b1.id < b2.id
     and b1.phone = b2.phone
    where coalesce(b1.phone, '') <> ''
      and b1.status <> 'closed' and b2.status <> 'closed'
    on conflict (src_business_id, dst_business_id, type) do nothing
    returning 1
  ) select count(*) + n_owner into n_owner from ins;

  return query values
    ('near', n_near),
    ('competes_with', n_comp),
    ('same_owner', n_owner);
end $$;

-- Ego-graph fetch for the owner dashboard / directory pages (Week 2-3).
-- Depth-1 neighbors of a business, confirmed-first, respecting RLS via the
-- caller (SECURITY INVOKER — RLS on edges applies to the requesting user).
create or replace function public.ego_graph(center uuid, max_edges int default 50)
returns table (
  edge_id bigint, other_business_id uuid, other_name text,
  type public.edge_type, weight numeric, confidence numeric,
  evidence jsonb, status public.edge_status
)
language sql stable security invoker set search_path = public as $$
  select e.id,
         case when e.src_business_id = center then e.dst_business_id else e.src_business_id end,
         b.name,
         e.type, e.weight, e.confidence, e.evidence, e.status
  from public.edges e
  join public.businesses b
    on b.id = case when e.src_business_id = center then e.dst_business_id else e.src_business_id end
  where (e.src_business_id = center or e.dst_business_id = center)
    and e.status <> 'rejected_by_owner'
  order by (e.status = 'confirmed_by_owner') desc, e.weight desc nulls last
  limit max_edges
$$;
