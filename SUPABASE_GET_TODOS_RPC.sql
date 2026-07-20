-- ============================================================================
--  StudyTrack — GET-compatible read path for the digital teacher session
--  Function: get_todos_get(token)
--
--  Why this exists: the existing read-only get_study_data(k, token) RPC only
--  works via HTTP POST (PostgREST RPCs take their args in a JSON body). The
--  digital teacher session's tool can only make GET requests, so it could
--  never actually call get_study_data — it was reading stale/no data every
--  morning and didn't have a way to tell you that clearly. This function is
--  a second, narrower entry point built specifically for a GET-only caller.
--
--  ⚠️  BEFORE RUNNING:
--    1. Replace GET_READ_SECRET_HERE below with a NEW, strong random secret.
--       Do NOT reuse the existing get_study_data read token — this token
--       will travel in a URL query string (GET), which is more exposed to
--       logging (server access logs, proxies, browser history, screenshots)
--       than a POST body. Keeping it a separate secret means a leak here
--       can't be used to read st_sched, st_sessions, st_ai_history, etc.
--    2. Run this whole file once in the Supabase SQL editor.
--    3. Give the digital teacher session ONLY: the endpoint URL below, the
--       anon apikey (already public/embedded in the app, safe to share),
--       and this new token. Do not give it the get_study_data token.
--
--  Safety properties (by construction):
--    • Token-gated: a wrong/absent token raises and returns nothing.
--    • Read-only: this function does not (and cannot, given its body) write
--      or modify any row.
--    • Hard-scoped: it ALWAYS reads the literal key 'st_todos' — there is no
--      caller-supplied key parameter, so this token can never be used to
--      read st_sched, st_sessions, st_goals, st_ai_history, st_teacher_plan,
--      or anything else. Even if this token leaks, the blast radius is
--      "today's todo list," not "everything in study_data."
--    • SECURITY DEFINER so it can read regardless of the caller's auth
--      state (the caller here is an anon-tier automated session, not a
--      logged-in browser), same pattern as set_teacher_plan's write side.
--    • Does NOT touch or replace get_study_data — that function is
--      unmodified and still used by the app itself and by POST-capable
--      callers.
-- ============================================================================

create or replace function public.get_todos_get(
  token text
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  -- 🔑 REPLACE THIS before running. Must be a NEW secret — do not reuse the
  -- existing get_study_data read token. Generate with e.g.
  -- `openssl rand -hex 20` in a terminal, or any password manager's
  -- "generate random string" feature. Never paste the generated secret into
  -- a chat session — paste it directly into this file / the SQL editor.
  get_read_secret constant text := 'GET_READ_SECRET_HERE';
  -- The ONLY key this function will ever read. Not caller-controllable.
  target_key      constant text := 'st_todos';
  result           jsonb;
begin
  -- 1. Auth ---------------------------------------------------------------
  if token is null or token is distinct from get_read_secret then
    raise exception 'unauthorized';
  end if;

  -- 2. Read the st_todos value only ---------------------------------------
  select value into result
    from study_data
   where key = target_key
   limit 1;

  return coalesce(result, '[]'::jsonb);
end;
$$;

-- Callable via GET as a PostgREST RPC with query params:
--   GET /rest/v1/rpc/get_todos_get?token=<GET_READ_SECRET>
-- Marked STABLE above specifically so PostgREST allows calling it via GET
-- (PostgREST rejects GET on VOLATILE functions with a 405) — correct here
-- since this function only reads and never writes.
grant execute on function public.get_todos_get(text) to anon;
