# Handoff — RLS / Supabase Auth fix (2026-07-15)

## Summary

`study_data` (StudyTrack's table) and `wardrobe_items` / `wardrobe_profile` /
`wardrobe_today` (a separate wardrobe app sharing the same Supabase project)
were discovered wide open: RLS enabled but with `"Allow all"` / `"public
read write"` policies (`qual: true`, role `public`, `cmd: ALL`). Since the
Supabase anon key is hardcoded in `index.html` and `StudyTrack-Widget.js`
(both public, on GitHub Pages / a public repo), anyone who viewed page
source had full read/write access to all rows in these 4 tables.

**This is now fixed and verified.** All 4 tables carry `auth.uid() =
user_id` owner-only policies, matching the pattern already used by
`reminders` / `lists` / `settings` / `smart_lists` / `nudge_data` (the
Nudge app). Confirmed via direct SQL query against `pg_policies`, not
assumed.

## What changed

### Database (Supabase, done directly via SQL editor)
- Added `user_id uuid references auth.users(id)` to all 4 tables.
- Backfilled every existing row to `noah@flouty.uk`'s account
  (`auth.users.id = 5c8b57ab-2646-472d-9996-664c0758f71d`) — verified row
  counts matched before/after (study_data 20, wardrobe_items 53,
  wardrobe_profile 1, wardrobe_today 1 — no data lost).
- Dropped the old open policies, created `own_rows` policies:
  `for all using (auth.uid() = user_id) with check (auth.uid() = user_id)`
  on all 4 tables.

### Application code (committed + pushed to `studytrack-deploy` main)
Commits, in order: `589d79f`, `bb8357c`, `482d12f`, `bd7d57b`.

1. **`index.html`** (`589d79f`, `bd7d57b`) — added a full Supabase Auth OTP
   login flow, hand-rolled with raw `fetch` (no SDK, matching the file's
   existing no-dependency style). Login screen gates `init()` until
   authenticated; email locked to `noah@flouty.uk` (single-user app).
   Session (`access_token`/`refresh_token`/`expires_at`) stored in
   `localStorage` under `st_auth_session`, auto-refreshes on a timer so the
   session behaves as persistent/indefinite per-device. `sbPush`/`sbPull`
   now send the session's access token as the bearer (was: static anon
   key) and `sbPush` includes `user_id` in every write. Follow-up commit
   fixed a misleading error message (was saying "no internet connection"
   for what's actually Supabase's OTP rate limit — a 429, now detected and
   labeled correctly).

2. **`StudyTrack-Widget.js`** (`bb8357c`) — this is read-only (`SELECT`
   only, via Scriptable on iPhone, mirrored to Mac via Continuity — there
   is only one actual Scriptable install/Keychain, not two). Can't do an
   interactive OTP login since it runs unattended. Reads a refresh token
   from Scriptable's on-device **Keychain** (never committed to the repo —
   see the separate, non-committed setup guide referenced below) and
   exchanges it for a fresh access token every run. Shows a "⚠️ Setup
   needed" widget state if Keychain has no token, instead of silently
   rendering blank/zero data (RLS denial and "no sessions today" would
   otherwise look identical). Had to restructure the file into a wrapped
   `async function run()` because Scriptable's JS runtime (unlike Node)
   doesn't support a bare top-level `return` — caught via reasoning about
   the runtime, not caught by `node --check`, which is not a fully
   reliable proxy for Scriptable-specific behavior.

3. **`.github/workflows/study-notify.yml`** (`482d12f`) — the cron
   (every 5 min, push notifications + Resend email digests) now
   authenticates with a new `SB_SERVICE_KEY` GitHub Actions secret
   (Supabase **service-role** key — bypasses RLS entirely, appropriate
   since this is a private server-side-only job never exposed to
   browsers) instead of the old anon `SB_KEY`. The single write path
   (`sbSet`, used for `notif_done_subjs`/`notif_sent`/`email_sent`) now
   includes a hardcoded `OWNER_USER_ID` constant in every write — without
   this, service-role writes would land with `user_id = null` and become
   permanently invisible to the app/widget reading under the owner policy.

### Not committed to git (by design)
- `studytrack-widget-keychain-setup.md` — one-time, per-device setup
  guide for getting a refresh token into Scriptable's Keychain. Lives only
  in the local session's outputs folder, was never added to the repo,
  because putting a live refresh token (or instructions containing one)
  into a public repo would recreate the exact exposure this fix closes.
  If you need it again, ask Claude to regenerate it — the steps are:
  log into the app in a browser → devtools console →
  `JSON.parse(localStorage.getItem('st_auth_session')).refresh_token` →
  copy just the string → Scriptable on iPhone → temp script with
  `Keychain.set("st_refresh_token", "...")` → run → delete temp script.

## Verification performed (all with real evidence, not assumed)

- `pg_tables.rowsecurity = true` on all 4 tables — confirmed via SQL.
- `pg_policies` shows `own_rows` / `auth.uid() = user_id` on all 4 — confirmed via SQL (2026-07-15, this session).
- Cron: manually triggered `study-notify.yml` via `workflow_dispatch` with
  `test_email: true` — green run, test email delivered to
  `noah@flouty.uk`. Confirms `SB_SERVICE_KEY` works.
- App login (MacBook, Safari): full OTP flow tested — send code → email
  arrived → verify → session established → app loaded real data normally.
- Widget (iPhone Scriptable, Continuity-mirrored to Mac): Keychain setup
  completed, `Keychain.contains` returned `true`, widget renders today's
  hours/schedule normally (no "Setup needed" state).

## Open item — not a blocker, just unresolved

Chrome (MacBook) had previously logged in successfully, then later showed
the login screen again (lost its session) for an unknown reason. Ruled
out: Supabase's "Enforce single session per user" setting — confirmed OFF
in Authentication → Sessions. Could not find a root cause because Supabase
**Audit Logs were off** at the time this happened, so there's no
historical record to inspect. Audit Logs have now been turned ON (this
session, 2026-07-15) so if this recurs on any device, there will be actual
log evidence to check instead of reconstructing after the fact. Action
needed: just re-login to Chrome with a fresh code (was blocked by
Supabase's OTP rate-limit at the time of writing — should clear within an
hour or two of the last code request).

## Out of scope / untouched

- `shop_data` still uses its original header-key policy pattern
  (`x-shop-key` header match) — this was already like this before tonight,
  not part of this fix, not evaluated for whether it's adequate.
- Any other tables/apps in this Supabase project beyond the 4 listed.

## For the next session

If asked to work on StudyTrack's Supabase/auth again: this is DONE, not
in-progress. Verify current state with the two queries in this doc's
Verification section before assuming anything has drifted, per this
project's standing rule about checking memory against ground truth.
