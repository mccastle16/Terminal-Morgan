SET local check_function_bodies = off;

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "service_role";

CREATE EXTENSION "pg_trgm" SCHEMA "public";

CREATE TABLE "public"."business_insights" (
  "business_id"      uuid                     NOT NULL,
  "summary"          text,
  "top_delights"     text[],
  "top_pain_points"  text[],
  "reviews_analyzed" integer,
  "model"            text,
  "generated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "business_insights_pkey" PRIMARY KEY (business_id)
);

ALTER TABLE "public"."business_insights"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."business_members" (
  "profile_id"  uuid                     NOT NULL,
  "business_id" uuid                     NOT NULL,
  "member_role" text                     NOT NULL DEFAULT 'owner'::text,
  "claimed_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "verified_at" timestamp with time zone,
  "verified_by" uuid,
  CONSTRAINT "business_members_member_role_check" CHECK ((member_role = ANY (ARRAY['owner'::text, 'staff'::text]))),
  CONSTRAINT "business_members_pkey" PRIMARY KEY (profile_id, business_id)
);

ALTER TABLE "public"."business_members"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."business_metrics" (
  "business_id"  uuid         NOT NULL,
  "period"       date         NOT NULL,
  "rating"       numeric(2,1),
  "review_count" integer,
  "new_reviews"  integer,
  CONSTRAINT "business_metrics_pkey" PRIMARY KEY (business_id, period)
);

ALTER TABLE "public"."business_metrics"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."business_profile" (
  "business_id" uuid                     NOT NULL,
  "phone"       text,
  "website"     text,
  "email"       text,
  "description" text,
  "updated_by"  uuid,
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "business_profile_pkey" PRIMARY KEY (business_id)
);

ALTER TABLE "public"."business_profile"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."business_registrations" (
  "business_id"            uuid                     NOT NULL,
  "registry"               text                     NOT NULL,
  "registry_doc_number"    text,
  "legal_name"             text,
  "status"                 text,
  "match_confidence"       numeric,
  "entity_confidence"      numeric,
  "location_confidence"    numeric,
  "operational_confidence" numeric,
  "reason_codes"           text[],
  "checked_at"             timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "business_registrations_pkey" PRIMARY KEY (business_id, registry)
);

ALTER TABLE "public"."business_registrations"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."businesses" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "google_place_id" text                     NOT NULL,
  "name"            text                     NOT NULL,
  "google_type"     text,
  "address"         text,
  "postcode"        text,
  "neighborhood"    text,
  "lat"             double precision,
  "lon"             double precision,
  "google_phone"    text,
  "google_website"  text,
  "price_tier"      text,
  "rating"          numeric(2,1),
  "rating_source"   text,
  "review_count"    integer,
  "business_status" text,
  "extras"          jsonb,
  "source_batch"    text,
  "imported_at"     timestamp with time zone,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "businesses_google_place_id_key" UNIQUE (google_place_id),
  CONSTRAINT "businesses_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."businesses"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."categories" (
  "google_type"        text                     NOT NULL,
  "label"              text,
  "group_slug"         text,
  "classified_by"      text,
  "confidence"         numeric,
  "confirmed_by_human" boolean                  NOT NULL DEFAULT false,
  "first_seen_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "categories_classified_by_check" CHECK ((classified_by = ANY (ARRAY['google'::text, 'llm'::text, 'human'::text]))),
  CONSTRAINT "categories_pkey" PRIMARY KEY (google_type)
);

ALTER TABLE "public"."categories"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."category_groups" (
  "slug"             text    NOT NULL,
  "label"            text    NOT NULL,
  "benchmark_per_1k" numeric,
  "is_recruitable"   boolean NOT NULL DEFAULT true,
  CONSTRAINT "category_groups_pkey" PRIMARY KEY (slug)
);

ALTER TABLE "public"."category_groups"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."chamber_businesses" (
  "chamber_id"        uuid                     NOT NULL,
  "business_id"       uuid                     NOT NULL,
  "is_member"         boolean,
  "membership_status" text,
  "chamber_label"     text,
  "match_status"      text                     NOT NULL DEFAULT 'unmatched'::text,
  "match_method"      text,
  "match_checked_at"  timestamp with time zone,
  "joined_at"         date,
  "notes"             text,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "chamber_businesses_match_status_check" CHECK ((match_status = ANY (ARRAY['matched'::text, 'no_google_presence'::text, 'unmatched'::text, 'member_linked'::text]))),
  CONSTRAINT "chamber_businesses_membership_status_check" CHECK ((membership_status = ANY (ARRAY['active'::text, 'lapsed'::text, 'prospect'::text]))),
  CONSTRAINT "chamber_businesses_pkey" PRIMARY KEY (chamber_id, business_id)
);

ALTER TABLE "public"."chamber_businesses"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."chambers" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "slug"        text                     NOT NULL,
  "name"        text                     NOT NULL,
  "city"        text,
  "state"       text,
  "country"     text                     NOT NULL DEFAULT 'US'::text,
  "region"      text,
  "population"  integer,
  "logo_url"    text,
  "brand_color" text,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "chambers_pkey" PRIMARY KEY (id),
  CONSTRAINT "chambers_slug_key" UNIQUE (slug)
);

ALTER TABLE "public"."chambers"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profiles" (
  "id"              uuid                     NOT NULL,
  "chamber_id"      uuid,
  "email"           text,
  "first_name"      text,
  "last_name"       text,
  "phone"           text,
  "role"            text                     NOT NULL DEFAULT 'member'::text,
  "can_switch_role" boolean                  NOT NULL DEFAULT false,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id),
  CONSTRAINT "profiles_role_check" CHECK ((role = ANY (ARRAY['member'::text, 'admin'::text])))
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."reviews" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "business_id"  uuid                     NOT NULL,
  "author_key"   text,
  "rating"       smallint,
  "body"         text,
  "published_at" timestamp with time zone,
  "source"       text                     NOT NULL DEFAULT 'google'::text,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "reviews_pkey" PRIMARY KEY (id),
  CONSTRAINT "reviews_rating_check" CHECK (((rating >= 1) AND (rating <= 5)))
);

ALTER TABLE "public"."reviews"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."yuh" (
  "id"   bigint                   GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  "Date" timestamp with time zone NOT NULL DEFAULT now(),
  "Name" text,
  CONSTRAINT "yuh_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."yuh"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."profiles"
  ADD COLUMN "full_name" text GENERATED ALWAYS AS (NULLIF(TRIM(BOTH FROM ((COALESCE(first_name, ''::text) || ' '::text) || COALESCE(last_name, ''::text))), ''::text)) STORED;

CREATE OR REPLACE FUNCTION public.claims_business (
  b uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  select exists (
    select 1 from public.business_members
    where profile_id = auth.uid() and business_id = b
  )
$function$;

CREATE OR REPLACE FUNCTION public.complete_my_profile (
  p_first        text,
  p_last         text,
  p_phone        text,
  p_chamber_slug text
)
  RETURNS public.profiles
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  target uuid;
  result public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select id into target from public.chambers where slug = p_chamber_slug;
  if target is null then
    raise exception 'unknown chamber: %', p_chamber_slug;
  end if;

  update public.profiles
     set first_name = nullif(trim(p_first), ''),
         last_name  = nullif(trim(p_last),  ''),
         phone      = nullif(trim(p_phone), ''),
         -- unqualified chamber_id here is the EXISTING value:
         -- set it only if it isn't already set
         chamber_id = coalesce(chamber_id, target)
   where id = auth.uid()
   returning * into result;

  return result;
end $function$;

CREATE OR REPLACE FUNCTION public.dev_switch_role (
  p_role text
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  allowed boolean;
begin
  if p_role not in ('member','admin') then
    raise exception 'invalid role: %', p_role;
  end if;

  select can_switch_role into allowed
  from public.profiles where id = auth.uid();

  if not coalesce(allowed, false) then
    raise exception 'not permitted';
  end if;

  update public.profiles set role = p_role where id = auth.uid();
  return p_role;
end $function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$function$;

CREATE OR REPLACE FUNCTION public.my_chamber_id()
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  select chamber_id from public.profiles where id = auth.uid()
$function$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
  new.updated_at = now();
  return new;
end $function$;

ALTER TABLE "public"."business_insights"
  ADD CONSTRAINT "business_insights_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE "public"."business_members"
  ADD CONSTRAINT "business_members_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE "public"."business_metrics"
  ADD CONSTRAINT "business_metrics_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE "public"."business_profile"
  ADD CONSTRAINT "business_profile_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE "public"."business_registrations"
  ADD CONSTRAINT "business_registrations_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE "public"."businesses"
  ADD CONSTRAINT "businesses_google_type_fkey" FOREIGN KEY (google_type) REFERENCES public.categories(google_type);

ALTER TABLE "public"."categories"
  ADD CONSTRAINT "categories_group_slug_fkey" FOREIGN KEY (group_slug) REFERENCES public.category_groups(slug);

ALTER TABLE "public"."chamber_businesses"
  ADD CONSTRAINT "chamber_businesses_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE "public"."chamber_businesses"
  ADD CONSTRAINT "chamber_businesses_chamber_id_fkey" FOREIGN KEY (chamber_id) REFERENCES public.chambers(id) ON DELETE CASCADE;

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_chamber_id_fkey" FOREIGN KEY (chamber_id) REFERENCES public.chambers(id) ON DELETE SET NULL;

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."business_members"
  ADD CONSTRAINT "business_members_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."business_members"
  ADD CONSTRAINT "business_members_verified_by_fkey" FOREIGN KEY (verified_by) REFERENCES public.profiles(id);

ALTER TABLE "public"."business_profile"
  ADD CONSTRAINT "business_profile_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles(id);

ALTER TABLE "public"."reviews"
  ADD CONSTRAINT "reviews_business_id_fkey" FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

CREATE INDEX business_members_business_id_idx ON public.business_members USING btree (business_id);

CREATE INDEX businesses_google_type_idx ON public.businesses USING btree (google_type);

CREATE INDEX businesses_lat_lon_idx ON public.businesses USING btree (lat, lon);

CREATE INDEX businesses_name_trgm ON public.businesses USING gin (name public.gin_trgm_ops);

CREATE INDEX businesses_postcode_idx ON public.businesses USING btree (postcode);

CREATE INDEX categories_group_slug_idx ON public.categories USING btree (group_slug);

CREATE INDEX chamber_businesses_business_id_idx ON public.chamber_businesses USING btree (business_id);

CREATE INDEX chamber_businesses_chamber_id_is_member_idx ON public.chamber_businesses USING btree (chamber_id, is_member);

CREATE INDEX profiles_chamber_id_idx ON public.profiles USING btree (chamber_id);

CREATE INDEX reviews_business_id_idx ON public.reviews USING btree (business_id);

CREATE UNIQUE INDEX reviews_dedupe ON public.reviews USING btree (business_id, author_key, published_at) NULLS NOT DISTINCT;

CREATE INDEX reviews_published_at_idx ON public.reviews USING btree (published_at);

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER business_profile_touch
  BEFORE UPDATE ON public.business_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER businesses_touch
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER chamber_businesses_touch
  BEFORE UPDATE ON public.chamber_businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "read insights" ON "public"."business_insights"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "admins read claims" ON "public"."business_members"
  FOR SELECT
  TO "authenticated"
  USING (public.is_admin());

CREATE POLICY "claim a business" ON "public"."business_members"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((profile_id = auth.uid()));

CREATE POLICY "read own claims" ON "public"."business_members"
  FOR SELECT
  TO "authenticated"
  USING ((profile_id = auth.uid()));

CREATE POLICY "read metrics" ON "public"."business_metrics"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "member inserts own business profile" ON "public"."business_profile"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.claims_business(business_id));

CREATE POLICY "member updates own business profile" ON "public"."business_profile"
  FOR UPDATE
  TO "authenticated"
  USING (public.claims_business(business_id))
  WITH CHECK (public.claims_business(business_id));

CREATE POLICY "read business profiles" ON "public"."business_profile"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "read registrations" ON "public"."business_registrations"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "read businesses" ON "public"."businesses"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "read categories" ON "public"."categories"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "read groups" ON "public"."category_groups"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "admins edit own chamber's businesses" ON "public"."chamber_businesses"
  FOR UPDATE
  TO "authenticated"
  USING ((public.is_admin() AND (chamber_id = public.my_chamber_id())))
  WITH CHECK ((public.is_admin() AND (chamber_id = public.my_chamber_id())));

CREATE POLICY "read own chamber's businesses" ON "public"."chamber_businesses"
  FOR SELECT
  TO "authenticated"
  USING ((chamber_id = public.my_chamber_id()));

CREATE POLICY "read own chamber" ON "public"."chambers"
  FOR SELECT
  TO "authenticated"
  USING ((id = public.my_chamber_id()));

CREATE POLICY "admins read their chamber's profiles" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING ((public.is_admin() AND (chamber_id = public.my_chamber_id())));

CREATE POLICY "read own profile" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING ((id = auth.uid()));

CREATE POLICY "update own profile" ON "public"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING ((id = auth.uid()));

CREATE POLICY "read reviews" ON "public"."reviews"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE EVENT TRIGGER "ensure_rls"
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION "public"."rls_auto_enable"();

COMMENT ON EXTENSION "pg_trgm" IS 'text similarity measurement and index searching based on trigrams';

COMMENT ON TABLE "public"."yuh" IS 'yuhx3';

GRANT EXECUTE ON FUNCTION "public"."claims_business"(uuid) TO PUBLIC, "postgres";

REVOKE ALL ON FUNCTION "public"."complete_my_profile"(text, text, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."complete_my_profile"(text, text, text, text) TO "authenticated", "postgres";

REVOKE ALL ON FUNCTION "public"."dev_switch_role"(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."dev_switch_role"(text) TO "authenticated", "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."is_admin"() TO PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."my_chamber_id"() TO PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO PUBLIC, "postgres";

GRANT EXECUTE ON FUNCTION "public"."touch_updated_at"() TO PUBLIC, "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."business_insights" TO "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE "public"."business_insights" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."business_insights" TO "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."business_insights" TO "service_role";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."business_members" TO "anon";

GRANT INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE "public"."business_members" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."business_members" TO "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."business_members" TO "service_role";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."business_metrics" TO "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE "public"."business_metrics" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."business_metrics" TO "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."business_metrics" TO "service_role";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."business_profile" TO "anon";

GRANT INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."business_profile" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."business_profile" TO "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."business_profile" TO "service_role";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."business_registrations" TO "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE "public"."business_registrations" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."business_registrations" TO "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."business_registrations" TO "service_role";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."businesses" TO "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE "public"."businesses" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."businesses" TO "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."businesses" TO "service_role";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."categories" TO "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE "public"."categories" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."categories" TO "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."categories" TO "service_role";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."category_groups" TO "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE "public"."category_groups" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."category_groups" TO "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."category_groups" TO "service_role";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."chamber_businesses" TO "anon";

REVOKE ALL ("chamber_label") ON TABLE "public"."chamber_businesses" FROM "authenticated";

GRANT UPDATE ("chamber_label") ON TABLE "public"."chamber_businesses" TO "authenticated";

REVOKE ALL ("is_member") ON TABLE "public"."chamber_businesses" FROM "authenticated";

GRANT UPDATE ("is_member") ON TABLE "public"."chamber_businesses" TO "authenticated";

REVOKE ALL ("joined_at") ON TABLE "public"."chamber_businesses" FROM "authenticated";

GRANT UPDATE ("joined_at") ON TABLE "public"."chamber_businesses" TO "authenticated";

REVOKE ALL ("membership_status") ON TABLE "public"."chamber_businesses" FROM "authenticated";

GRANT UPDATE ("membership_status") ON TABLE "public"."chamber_businesses" TO "authenticated";

REVOKE ALL ("notes") ON TABLE "public"."chamber_businesses" FROM "authenticated";

GRANT UPDATE ("notes") ON TABLE "public"."chamber_businesses" TO "authenticated";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE "public"."chamber_businesses" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."chamber_businesses" TO "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."chamber_businesses" TO "service_role";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."chambers" TO "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE "public"."chambers" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."chambers" TO "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."chambers" TO "service_role";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."profiles" TO "anon";

REVOKE ALL ("first_name") ON TABLE "public"."profiles" FROM "authenticated";

GRANT UPDATE ("first_name") ON TABLE "public"."profiles" TO "authenticated";

REVOKE ALL ("last_name") ON TABLE "public"."profiles" FROM "authenticated";

GRANT UPDATE ("last_name") ON TABLE "public"."profiles" TO "authenticated";

REVOKE ALL ("phone") ON TABLE "public"."profiles" FROM "authenticated";

GRANT UPDATE ("phone") ON TABLE "public"."profiles" TO "authenticated";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE "public"."profiles" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."profiles" TO "service_role";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."reviews" TO "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON TABLE "public"."reviews" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."reviews" TO "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."reviews" TO "service_role";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."yuh" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."yuh" TO "postgres";

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLE "public"."yuh" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLES TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLES TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLES TO "service_role";

