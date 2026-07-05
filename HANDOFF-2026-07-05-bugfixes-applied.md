# Handoff — 2026-07-05 bug fixes APPLIED (follow-up to the audit)

This session applied the fixes from `HANDOFF-2026-07-05-bug-audit.md` (bug IDs B1–B6 + minors).
Everything below is **saved to disk but NOT committed** — commit via the Claude Code prompt
`CLAUDE-CODE-PROMPT-2026-07-05-bugfixes.md`. The Cowork sandbox cannot commit (git-lock mount bug).

## Gating check performed first
`git log` confirmed the three prior-session audit fixes (F1 coach-scan, F2 archive-hours,
F3 Stop&Log timer) were **still uncommitted** on disk — the OPUS-PROMPT's claim that they
were "already committed" was wrong. Per that prompt's own instruction I stopped, reported,
and (per Noah's decision) stacked the new fixes on top to commit everything at the end.

## What changed

### B1 — Biweekly Week A/B parity time-bomb (FIXED, 3 files kept identical)
Replaced ISO-week%2 with epoch-anchored parity `floor(daysSinceAnchorMonday/7)%2`.
- `index.html` `getWeekParity()`
- `.github/workflows/study-notify.yml` `weekParity()`
- `StudyTrack-Widget.js` `weekParity()`
Anchor Monday = **2026-06-22** (a Week A start), chosen so today's A/B labels are unchanged.
Proof: 0 parity mismatches vs the old method for Jan 1–Dec 20 2026 (current era, incl. today
= Week B unchanged); divergence begins exactly at **2027-01-04** where the old method wrongly
produced two consecutive "Week B" (W53-2026 odd → W1-2027 odd). All three sources agree over
2025–2027.

### B4 — st_notif_prefs / st_notif_templates now sync (FIXED, index.html)
- Added both keys to `syncFromCloud()` `KEYS` and to the timestamped LWW branch (same pattern
  as `st_goals`).
- Set `*_updated_at` in `onNotifToggle()`, `saveNotifPrefs()`, `saveNotifTemplates()`.
- Removed both keys from the **two** localStorage-quota emergency-cleanup lists (deleting them
  made a later Save push all-defaults, silently re-enabling every toggle).

### B3 — SwiftBar widgets (FIXED, all 4 .sh identical logic)
`StudyTrack.1s/30s/45s/1m.sh`: (a) exclude extra-credit (`extraCredit` flag + hard-coded `el4`)
from today's + this-week's hours; (b) filter blocks by `recurrence` using the SAME epoch-anchored
parity (anchor 2026-06-22); (c) compute today/now in Tokyo (UTC+9) instead of Mac local time.
`now_ts` (timer math) left as real UTC epoch. 30s.sh and 1m.sh remain byte-identical.

### B5 — dead notifiers archived (val.town confirmed dead)
Moved `notify.js`, `valtown-notify.js`, **and** `package.json` into `studytrack-deploy/archive/`
(the dead node cron unit — the live workflow installs web-push inline and never used them).
Added `archive/README.md`.

### B2 — legacy Scriptable scripts archived (outside git)
Moved parent-folder `quicklog.js` and `widget.js` into `archive-old-versions/` (plain file move;
these are outside the git repo so they won't appear in commits).
**ACTION FOR NOAH:** if `quicklog.js` is still installed in Scriptable on your iPhone/Mac,
delete it — it double-encodes cloud writes and can drop quick-logged sessions.

### Minor cleanup (index.html)
- `exportReport()` pace fallback now mirrors the Graduation page exactly: `recent>=3 ? recent/4 : goals.weekly`.
- `archiveOldSessions()` + history archive-banner cutoffs: `new Date()` → `nowLocal()` (Tokyo).
- Dup-warn card: wrapped `s.notes` in `escHtml()` (was raw innerHTML).
- Floating timer bubble + sidebar chip: show the pomodoro **countdown** when `pomodoroMode` is on.
- Removed dead **Quick Log** modal (`openQuickLog`/`submitQuickLog` + `#quick-log-modal-overlay`) — had no caller.

### Deliberately NOT changed
- **renderTodos()** — left as-is. `#todo-list` doesn't exist so it's already a harmless no-op
  (`if(!el)return;`). Ripping out its ~8 call sites in a 10k-line file was judged not worth the
  regression risk for zero functional gain. Flagged for Noah to decide later.
- **B6** (notification windows vs */5 cron) — untouched; Noah confirmed cron-job.org still pings
  every minute, so the 2-min windows still work.

## Verification (all passed)
- All 4 inline `<script>` blocks in `index.html`: `node --check` OK after every edit.
- `StudyTrack-Widget.js`: `node --check` OK.
- All 4 `.sh` embedded Python: `py_compile` OK.
- Parity: 3 sources identical over 2025–2027; today unchanged; boundary fixed at 2027-01-04.
- B3 logic unit-tested with synthetic data (pinned 2026-07-05 19:49): el4 excluded from
  today/week hours; biweekly_a hidden on a Week B day; biweekly_b + weekly shown; Tokyo time.
- No live code references to the removed Quick Log (only a removal comment remains).

## Still open (not in scope this session)
See `HANDOFF-2026-07-05-bug-audit.md` "Minor" list for the rest (NAV_ORDER missing pages,
`st_form_tracker_since` per-device, stale AI model labels, `near(todoMins,2,7)` early-fire).
