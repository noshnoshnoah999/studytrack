# Prompt for Opus — continue the 2026-07-05 StudyTrack bug fixes

Copy everything below into a new session (Claude Code or Cowork with the StudyTrack folder mounted):

---

I'm Noah, a TIHS homeschool student in Tokyo. StudyTrack is my study-hours web app. A full bug audit was completed on 2026-07-05; three major bugs were already fixed and committed. Your job is to fix the remaining bugs from that audit.

## Read these first, in order
1. `/Users/noahflouty/Claude/StudyTrack/STARTUP-PROMPT.md` — architecture, rules, gotchas.
2. `/Users/noahflouty/Claude/StudyTrack/studytrack-deploy/HANDOFF-2026-07-05-bug-audit.md` — the audit findings. Bug IDs below (B1–B6, "Minor") refer to that file.
3. `git -C /Users/noahflouty/Claude/StudyTrack/studytrack-deploy log --oneline -10` — confirm the three audit fixes are committed (coach-scan callback, archive hours, stop-and-log timer). If they are NOT committed, stop and tell me before doing anything.

## Ground rules (do not skip)
- The live app is the single ~10.5k-line `studytrack-deploy/index.html`. GitHub Pages auto-deploys on push to `main`.
- Tokyo time everywhere: `nowLocal()` / `todayStr()` / `toAppTz()`, never raw `new Date()` for dates or day-of-week.
- Never write a migration that forces a value I control from another device.
- Never ask me to paste API keys or secrets. The Supabase anon key in the client is the one public exception.
- Report back what you understood and your plan BEFORE editing anything. Confirm we're aligned first.
- Commit only when I say so. One logical fix per commit, clear messages. At the very end of the session, after committing and pushing, remove any stale lock files under `.git/` (`rm -f .git/*.lock`) so the next session starts clean.

## Tasks, in priority order

### 1. B1 — Biweekly Week A/B parity breaks Dec 2026 → Jan 2027
`getWeekParity()` uses ISO week number % 2; 2026 has 53 ISO weeks, so two consecutive "Week B" weeks occur at New Year. Replace with epoch-anchored parity (`floor(daysSinceAnchorMonday/7) % 2`) in ALL THREE copies, keeping them identical:
- `index.html` → `getWeekParity()`
- `.github/workflows/study-notify.yml` → `weekParity()`
- `StudyTrack-Widget.js` → `weekParity()`
CRITICAL: choose the anchor Monday so that TODAY'S parity is unchanged (compute the current ISO parity for the week you're working in, and pick the anchor so labels don't flip — my schedule's Week A/B assignments must keep meaning the same weeks). Show me the before/after parity for the 8 weeks around 2026-12-28 as proof.

### 2. B4 — st_notif_prefs / st_notif_templates never pulled by sync
Add both keys to `syncFromCloud()`'s KEYS list using the existing timestamped last-writer-wins pattern (`*_updated_at`, same as `st_goals`). Also set the `_updated_at` local timestamp in `onNotifToggle`/`saveNotifPrefs`/`saveNotifTemplates` when saving. Also remove `st_notif_prefs` and `st_notif_templates` from the two localStorage-quota emergency-cleanup lists in `syncFromCloud` (deleting them causes a later Save to push all-defaults to the server, silently re-enabling everything).

### 3. B3 — SwiftBar widgets disagree with the app
In all four `studytrack-deploy/StudyTrack.*.sh` variants: (a) exclude extra-credit subjects (`extraCredit` flag in `st_subjs`, plus hard-coded `el4`) from today's hours; (b) filter blocks by `recurrence` with the SAME epoch-anchored parity as task 1; (c) compute "today"/now in Tokyo (UTC+9) instead of Mac local time. Keep the four variants' shared logic identical — only the display lines differ.

### 4. B2 — legacy quicklog.js
Move `/Users/noahflouty/Claude/StudyTrack/quicklog.js` and `/Users/noahflouty/Claude/StudyTrack/widget.js` into `archive-old-versions/` (they're outside the git repo, so it's a plain file move — prepare the `mv` commands and ask me before executing, per my deletion rule). Remind me to delete them from Scriptable on my iPhone/Mac if still installed — quicklog.js can corrupt cloud data (double-encoded writes).

### 5. B5 — duplicate notifier check
Ask me whether the val.town cron (from `valtown-notify.js`) is still enabled. If I say it's dead, move `notify.js` and `valtown-notify.js` into an `archive/` subfolder inside the repo with a note in the commit message. If I'm not sure, leave them and just tell me how to check on val.town.

### 6. Minor fixes (single cleanup commit, only if time allows)
- `exportReport()` pace fallback: align with the Graduation page — use `recent >= 3 ? recent/4 : goals.weekly`.
- `archiveOldSessions()` + history archive banner: `new Date()` → `nowLocal()`.
- Dup-warn card: wrap `s.notes` in `escHtml()`.
- Timer bubble: show the pomodoro countdown when `pomodoroMode` is on.
- Delete dead code: `renderTodos()` (targets non-existent `#todo-list`) and its callers' calls, and `openQuickLog()`/`submitQuickLog()` + the unused Quick Log modal — CONFIRM with me before deleting the Quick Log modal in case I want a button for it instead.
- B6 (notification windows vs */5 cron): do NOT change yet — ask me whether cron-job.org is still pinging every minute first.

## Verification requirements
- After each `index.html` change, extract all `<script>` blocks and run `node --check` on each.
- For task 1, print a parity table for 2026-12-07 through 2027-01-25.
- For task 3, run one `.sh` file locally and show its output.
- Nothing gets committed until I've seen the diffs and said go.
