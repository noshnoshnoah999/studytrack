# Handoff — Full bug audit (2026-07-05)

Full read-through of the codebase: `index.html` (all ~9,300 lines of JS), `sw.js`, `.github/workflows/study-notify.yml`, `notify.js`, `valtown-notify.js`, `StudyTrack-Widget.js`, the four SwiftBar `.sh` widgets, and the legacy parent-folder scripts (`widget.js`, `quicklog.js`, `widget-quicklog.js`, Python PDF tools, Swift app).

## Fixed in this session (saved to disk, NOT committed — see prompt at bottom)

### F1. Coach Report "Scan teacher's screenshot" was completely broken
`handleCoachImage()` and `_coachPasteHandler()` called `compressWorkoutImage(blob, function(b64, mime){...})`, but that helper's callback receives ONE argument — a full data URL (`data:image/jpeg;base64,...`). Result: `_coachImgBase64` held the entire prefixed data URL and `_coachImgMime` was `undefined`, so the Anthropic API call always failed (`media_type: undefined`, invalid base64) and the preview thumbnail was broken. Fixed both call sites to split the data URL into mime + raw base64 (same pattern the workout import already used).

### F2. "Archive" old sessions silently destroyed their hours
`archiveOldSessions()` removed sessions >4 months old and claimed "hours preserved" because they were still in `st_hours`. But `syncFromCloud()` **always recomputes `st_hours` from `st_sessions`** and pushes the result — so on the very next sync, the archived hours vanished from every total (dashboard, graduation %, report, emails) on every device.
Fix: archiving now folds each archived session's hours into the subject's `base` (base = teacher/pre-app hours + archived hours) via `saveSubjects()`, and subtracts them from `st_hours` so `base + st_hours` totals stay constant through the recompute. All consumers (app, exportReport, workflow, AI context) compute `base + st_hours`, so this is consistent everywhere.
**⚠ Check:** if Archive was ever tapped in the past, those hours are ALREADY gone — compare current totals against an old backup JSON (e.g. `studytrack-backup-2026-07-03.json`). Could not verify from this sandbox (no network to Supabase).

### F3. "Stop & Log" notification action resurrected the timer
`stopTimerAndLog()` cleared local timer state but never called `timerSyncPush()` (every other stop path does). Cloud/other devices still said "running", so the 4-second poll or the realtime broadcast restarted the timer seconds later. Fixed: state fully cleared (incl. pause fields/sessionId) and pushed.

All four inline `<script>` blocks pass `node --check` after the edits.

---

## Bugs found but NOT fixed — for a follow-up session

### B1 (medium, time bomb): Biweekly Week A/B breaks at the 2026→2027 year boundary
`getWeekParity()` uses ISO week number % 2. 2026 has **53 ISO weeks**, so W53-2026 (odd) is followed by W1-2027 (odd) → two consecutive "Week B" weeks around 29 Dec 2026 – 10 Jan 2027. Biweekly blocks will repeat or skip a week. The same algorithm is copy-pasted in **three places** that must stay in sync: `index.html` `getWeekParity()`, `study-notify.yml` `weekParity()`, `StudyTrack-Widget.js` `weekParity()`.
Fix approach: switch all three to epoch-anchored parity — `floor(daysSince(anchorMonday)/7) % 2` — choosing the anchor so today's A/B mapping is preserved (verify against the current schedule before shipping).

### B2 (medium, data-corruption risk): legacy `quicklog.js` double-encodes cloud writes
Parent-folder `quicklog.js` (`sbSet`) writes `value: JSON.stringify(val)` — a JSON **string**, not an array. The app's `syncFromCloud` does `Array.isArray(rows[i].value)` → false → treats cloud sessions as empty and pushes the local list back, which can drop the quick-logged session entirely. It also uses device-local time (not Tokyo) and ignores overrides/biweekly recurrence. **If this script is still installed in Scriptable, remove it** (the deploy-folder `StudyTrack-Widget.js` is the live one and is read-only/safe). Same check for legacy `widget.js` (read-only, but device-local time → wrong "today" when travelling).

### B3 (medium): SwiftBar menu-bar widgets disagree with the app
All four `.sh` variants: (a) include EL4/extra-credit in today's hours — app/push/email all exclude it; (b) ignore `recurrence`, so biweekly blocks show in the menu bar every week; (c) use Mac local time, not Tokyo.

### B4 (medium): `st_notif_prefs` is push-only, never pulled
`syncFromCloud`'s KEYS list doesn't include `st_notif_prefs`, so per-type notification toggles live per-device; a device with stale/default prefs pressing "Save & Sync" overwrites the cloud value the server enforces — a toggle you turned OFF can silently flip back ON. Worse, the localStorage-quota emergency cleanup deletes `st_notif_prefs`/`st_notif_templates` locally, so a later Save pushes all-defaults. Fix: add both keys to the sync pull with the `_updated_at` LWW pattern.

### B5 (low/verify): possible duplicate notification senders
`notify.js` (node) and `valtown-notify.js` (val.town cron) are older copies of the workflow logic. If the val.town cron is still enabled, notifications are sent twice; the valtown copy doesn't set `sentAt`, so `sw.js`'s stale-drop can't filter its late pushes. **Confirm dead, then archive both.**

### B6 (low): notification delivery depends entirely on cron-job.org
Workflow cron is `*/5 * * * *` (and GH schedule is best-effort), but most `near()` windows are 2 minutes wide — they only work because cron-job.org dispatches every minute. If that free service lapses, most notifications silently stop. Consider widening windows to ≥5 min with the per-day dedup (already in place) preventing double-sends.

### Minor (fix opportunistically)
- `exportReport()` pace fallback: `recent>0 ? recent/4 : goals.daily*5` vs Graduation page's `recentH>=3` threshold and `goals.weekly` fallback → the two can disagree again when 0–3h logged in 28 days (same bug class as the July 3 fix). Align on `recentH>=3` + `goals.weekly`.
- `archiveOldSessions()` + the history archive banner use `new Date()` instead of `nowLocal()` (Tokyo rule).
- Dup-warn card injects `s.notes` into innerHTML without `escHtml()`.
- `st_form_tracker_since` is per-device → "forms pending" counts differ between devices.
- Floating timer bubble shows elapsed time (not the countdown) in pomodoro mode.
- `NAV_ORDER` (page-slide animation) is missing `subjects`/`tasks`/`ai`.
- Dead code: `renderTodos()` targets a non-existent `#todo-list`; `openQuickLog()`/`submitQuickLog()` + the Quick Log modal have no caller anywhere.
- AI settings model labels are stale ("claude-haiku-4 (fast, cheap)" etc.).
- Todo push reminder `near(todoMins, 2, 7)` can fire 2 minutes early (`near()`'s own comment says never fire early).

## Confirmed working / consistent (checked, no action)
- Extra-credit (EL4) exclusion is consistent across app totals, exportReport (after 62c89d9), push workflow, email digests, and `StudyTrack-Widget.js`.
- Tokyo-time handling consistent in app (`nowLocal`/`todayStr`), workflow (UTC+9 math), and the live Scriptable widget.
- Session sync: tombstones + merge-by-id + st_hours recompute is coherent (with F2 fixed).
- Migrations v4–v10 ordering and the v9/v10 "heal" pattern look correct; no migration currently force-overwrites a user-controlled value.
- sw.js stale-push guards, VAPID-key-mismatch resubscribe, and per-day server dedup all look sound.

## Git state
- Local == origin/main at `2a45082` before this session's edits.
- **Stale locks present**: `.git/index.lock` and `.git/HEAD.lock` (from Jul 3) — the Cowork sandbox cannot delete files under `.git` on the mount. They MUST be removed before committing (Claude Code prompt below handles it).
- Untracked: this handoff + `HANDOFF-2026-07-03-graduation-date-bug.md`; `.DS_Store` noise still present (consider `.gitignore`).
