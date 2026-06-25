# StudyTrack — Session Handoff

**Date:** 2026-06-24
**Repo:** `/Users/noahflouty/Claude/studytrack-deploy/` (git, remote `noshnoshnoah999/studytrack`, branch `main`)
**Live:** https://noshnoshnoah999.github.io/studytrack/ (GitHub Pages auto-deploys on push)
**Primary file:** `index.html` (~10.8k lines, single file). Workflow: `.github/workflows/study-notify.yml`.

All work below is **committed and pushed**. GitHub Pages will redeploy automatically.
> ⚠️ To see changes on a device, fully **close and reopen** the app (the service worker needs to refresh).

---

## Changes this session (oldest → newest)

### 1. History: session time range no longer wraps — `02e935b`
- **Bug:** a long note in the flex meta-row squeezed the time, wrapping `15:30 – 16:45` across 3 lines.
- **Fix:** `.hist-card-time` → added `white-space:nowrap` + `flex-shrink:0`.
- Also removed a stray junk file `•github/workflows/study-notify.yml` (bullet-prefixed duplicate). Real workflow untouched.

### 2. Electives 4 requirement locked at 150h — `b08ab92`
- **Bug:** el4's required hours kept reverting from 150 → 75. Cause: migration v5 **forced `el4.req = 75`**, and migrations run **once per device** + push to the shared cloud — so any not-yet-migrated device kept re-introducing 75.
- **Fix:** default seed `el4.req` 75 → 150; removed the force-to-75 line; added **migration v9** (`st_migration_v9_el4_150`) that sets 150 and pushes once per device to heal all devices.
- Cloud value confirmed at 150.

### 3. Notifications: exclude extra-credit (el4) from study hours — `c9b6b74`
- **Bug:** "Daily wrap-up" push counted el4 (extra credit) in `todayH` → e.g. showed `3h 25m logged · 3h 35m to go` when real study was only `25m logged · 6h 35m to go`.
- **Fix (workflow):** added `ecHourIds` set + `countsAsStudy()` helper; filtered `todayH` / `weekH` / `monthH` and the weekly-recap days-hit map. Mirrors the app + email digests, which already excluded extra-credit.
- Server-side — takes effect next workflow run (runs every minute via cron-job.org), no app reopen needed.

### 4. Location: read GPS once/day · History notes on own line — `ff8f19c`
- **Location:** cache the at-school GPS result per day (`st_school_geo = {date, atSchool}`). Later opens reuse it instead of re-reading position, so the OS location prompt fires **at most once per day**, not every open. A manual re-check (Settings toggle / `force`) bypasses the cache.
  - ⚠️ **iOS note:** to stop the prompt *entirely*, also set the home-screen app's permission to **"While Using the App"** in iOS Settings → StudyTrack → Location. The code reduces frequency; that setting makes permission persistent.
- **History notes:** moved session notes onto their **own line below the time** and let them **wrap fully** (removed `white-space:nowrap` / ellipsis / `max-width:160px`). Notes are never truncated/hidden now.

### 5. Splash: shorter intro + skip on quick re-open — `5dec7f4`
- Visible intro trimmed ~1.9s → **~1.3s**; progress-bar fill sped up 1.5s → 1s so it still completes in the window.
- If the app was opened **within the last 10 min** (`st_last_open` timestamp), the intro is **skipped entirely** (`#splash.instant { display:none }`) → straight to dashboard.

---

## Key gotchas (carry forward)
- **Migrations run once PER DEVICE** (`st_migration_vN` keys) and `sbPush` to the shared cloud. Never write a migration that *forces* a value the user controls — it fights manual edits from other devices. (This was the el4 bug.)
- **Work blocks have no `subjectId`** — they log toward the first *incomplete* elective (el1–el4, `getLogged<req && !done`). If all electives are full, the Work prefill chip on the Log page is intentionally hidden. el4 is `extraCredit:true`, req 150h.
- **Extra-credit subjects (el4) are excluded from study-hour totals** everywhere — app, email, and now push notifications. Keep them in sync.
- **Tokyo time:** always `nowLocal()` / `todayStr()`, never raw `new Date()`.
- **Server push (`study-notify.yml`) is the single source of truth** for notifications; in-app notifiers are intentional no-ops.

## Outstanding / not done
- iOS-level location permission ("While Using the App") is a manual user step — not code.
- Native iOS/macOS wrapper (WKWebView shell) was discussed as a future option for reliable push + WidgetKit; not built.
