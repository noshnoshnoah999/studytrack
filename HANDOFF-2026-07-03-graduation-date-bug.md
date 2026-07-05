# Handoff — Graduation date discrepancy bug fix (2026-07-03)

## What was reported
Noah noticed two different "estimated graduation date" figures for the same day range:
- Live web app (Graduation page): **Apr 2031**, pace 8h49m/wk
- PDF report generated the day before ("StudyTrack Report — July 2, 2026"): **Dec 2028**, pace 17.4h/wk

No hours had been logged in between, so the two numbers should have matched.

## Investigation summary
1. Confirmed the PDF was a browser print-to-PDF of the app's own `exportReport()` function (studytrack-deploy/index.html), not a separate script (`make_journal.py` was a red herring — unrelated Python/PDF tool, not what generated this report).
2. First hypothesis (a single large day rolling out of the 28-day trailing pace window) was tested and **ruled out** — recalculating both dates from Noah's actual session data gave identical pace either way.
3. Second hypothesis (a holiday gap in late May/June causing a data anomaly) was **also ruled out** as the cause of the date mismatch, though the gap itself is real (no non-EL4 sessions May 21–Jun 11, confirmed against Noah's exported backup `studytrack-backup-2026-07-03.json`).
4. **Actual root cause found:** `exportReport()`'s pace calculation (used for the PDF's "Est. Finish" figure) summed all sessions in the trailing 28-day window with **no extra-credit filter**. Electives 4 (`el4`) is flagged `extraCredit:true` and carries large daily sessions (3–8h) through June. The live Graduation page (`_gradSharedVars()`) and `getTotalLogged()` already correctly exclude extra-credit subjects via `_extraCreditIds()`. `exportReport()` was the one place in the codebase missing this filter.
5. Verified numerically against Noah's real backup data: including EL4 → 17.38h/wk (matches the PDF's 17.4h/wk almost exactly). Excluding EL4 → 8.82h/wk (matches the live app's 8h49m/wk almost exactly).

## Fix applied
File: `studytrack-deploy/index.html`, inside `exportReport()` (~line 9286-9289).

```diff
-  // Pace
+  // Pace — excludes extraCredit subjects (e.g. EL4), same as the live Graduation page
   const cutoff=new Date(now);cutoff.setDate(now.getDate()-28);
   const cutStr=cutoff.getFullYear()+'-'+String(cutoff.getMonth()+1).padStart(2,'0')+'-'+String(cutoff.getDate()).padStart(2,'0');
-  const recent=sessions.filter(s=>s.date>=cutStr).reduce((a,s)=>a+s.hours,0);
+  const ecIdsReport=_extraCreditIds();
+  const recent=sessions.filter(s=>s.date>=cutStr&&!ecIdsReport.has(s.subjectId)).reduce((a,s)=>a+s.hours,0);
```

This is a minimal, isolated change — only affects the pace/Est. Finish figure and footer text in the exported/printed Report. Nothing else in `exportReport()` was touched (subject table and "Hours Logged" were already correct).

## Status: NOT YET COMMITTED
The Cowork sandbox could not commit this change — `.git/index.lock` in the mounted `studytrack-deploy` folder cannot be deleted from the sandbox (permission restriction on the mount: can create files under `.git`, cannot delete them). `index.html` has the fix saved on disk and is staged (`git add` succeeded), but `git commit` fails every time because git can't clean up its own lock file afterward.

**New standing rule (saved to memory):** future git commit/push operations for this project should be handed off to Claude Code via a written prompt, rather than attempted from the Cowork sandbox.

## Next step
Run the Claude Code prompt below (provided separately in chat) to complete the commit and push.

## Other things noticed during this session (not acted on, flagged for awareness)
- Two stray `.DS_Store` changes appeared in git status (`.github/.DS_Store` modified, root `.DS_Store` untracked) — these are macOS metadata files, not source. Left untouched/unstaged intentionally; Noah may want to add `.DS_Store` to `.gitignore` at some point to stop this recurring.
- The 4-week rolling-average pace calculation is inherently volatile in principle (a single large day can swing a multi-year projection). This wasn't the cause of this particular bug, but Noah may want to revisit smoothing/windowing later — parked, not started.
