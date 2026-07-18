-- ============================================================================
--  StudyTrack — WRITE path for the digital teacher
--  Function: set_teacher_plan(p_date, p_plan, token)
--
--  Lets the external "digital teacher" push ONE day's timetable into the
--  st_teacher_plan key of study_data. It is the write-side counterpart of the
--  existing read-only get_study_data(k, token) RPC — DO NOT modify that one.
--
--  ⚠️  BEFORE RUNNING:
--    1. Replace WRITE_SECRET_HERE below with a strong random secret.
--    2. That secret MUST be DIFFERENT from the read token used by
--       get_study_data() — this token can WRITE, so treat it accordingly.
--    3. Run this whole file once in the Supabase SQL editor.
--
--  Safety properties (by construction):
--    • Token-gated: a wrong/absent token raises and writes nothing.
--    • Writes ONLY the literal key 'st_teacher_plan'. p_date and p_plan are
--      merged INSIDE that key's JSON — no caller input ever becomes the row key,
--      so no other sync key (st_sched, st_sessions, …) can be touched.
--    • SECURITY DEFINER so it runs with the owner's rights and bypasses RLS,
--      but it hard-codes the row's user_id to the app owner so the app/widget
--      (which read under auth.uid() = user_id) can read the plan back.
--    • p_date must be a real YYYY-MM-DD calendar date.
--    • Keeps only dates within the last 14 days (older days are pruned on write).
-- ============================================================================

create or replace function public.set_teacher_plan(
  p_date text,
  p_plan jsonb,
  token  text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  -- 🔑 REPLACE THIS before running. Must differ from the get_study_data read token.
  write_secret constant text := 'WRITE_SECRET_HERE';
  -- App owner (noah@flouty.uk) — rows must carry this so the app can read them
  -- back under its RLS policy (auth.uid() = user_id). Matches OWNER_USER_ID in
  -- .github/workflows/study-notify.yml.
  owner_id     constant uuid := '5c8b57ab-2646-472d-9996-664c0758f71d';
  -- The ONLY key this function will ever write. Not caller-controllable.
  target_key   constant text := 'st_teacher_plan';
  cutoff       date := current_date - 14;   -- prune anything older than 14 days
  existing     jsonb;
  merged       jsonb;
begin
  -- 1. Auth --------------------------------------------------------------------
  if token is null or token is distinct from write_secret then
    raise exception 'unauthorized';
  end if;

  -- 2. Validate p_date is a real YYYY-MM-DD calendar date ----------------------
  if p_date is null or p_date !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'invalid date format (expected YYYY-MM-DD): %', p_date;
  end if;
  begin
    perform p_date::date;                   -- throws on impossible dates (e.g. 2026-13-40)
  exception when others then
    raise exception 'invalid calendar date: %', p_date;
  end;

  if p_plan is null then
    raise exception 'p_plan is required';
  end if;

  -- 3. Load the existing st_teacher_plan value (this key only) -----------------
  select value into existing
    from study_data
   where key = target_key
   limit 1;

  if existing is null or jsonb_typeof(existing) is distinct from 'object' then
    existing := '{}'::jsonb;
  end if;

  -- 4. Merge the new day in, then prune days older than 14 days ----------------
  merged := existing || jsonb_build_object(p_date, p_plan);

  select coalesce(jsonb_object_agg(k, v), '{}'::jsonb)
    into merged
    from jsonb_each(merged) as e(k, v)
   where k ~ '^\d{4}-\d{2}-\d{2}$'
     and k::date >= cutoff;

  -- 5. Upsert ONLY the st_teacher_plan key -------------------------------------
  --    UPDATE-then-INSERT (rather than ON CONFLICT) so we don't depend on the
  --    exact unique-constraint shape of study_data, and so the "row doesn't
  --    exist yet" case is handled explicitly.
  update study_data
     set value      = merged,
         updated_at = now(),
         user_id    = owner_id
   where key = target_key;

  if not found then
    insert into study_data (key, value, updated_at, user_id)
    values (target_key, merged, now(), owner_id);
  end if;

  return merged;
end;
$$;

-- The digital teacher calls this with the publishable (anon) API key.
grant execute on function public.set_teacher_plan(text, jsonb, text) to anon;
