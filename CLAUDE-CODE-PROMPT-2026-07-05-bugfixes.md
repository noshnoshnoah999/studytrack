# Claude Code prompt — commit & push the 2026-07-05 StudyTrack bug fixes

Copy everything below the line into Claude Code, opened in
`/Users/noahflouty/Claude/StudyTrack/studytrack-deploy`.

---

You are committing and pushing already-made, on-disk changes for StudyTrack. Do NOT change any
code logic — only stage, commit, and push what's on disk. Repo:
`/Users/noahflouty/Claude/StudyTrack/studytrack-deploy` (remote `origin`, branch `main`).

## Step 0 — clear the stale locks FIRST (they will block committing)
There are stale, empty lock files left by the Cowork sandbox. Remove them before anything else:
```
cd /Users/noahflouty/Claude/StudyTrack/studytrack-deploy
rm -f .git/index.lock .git/HEAD.lock
git status
```
Confirm `git status` runs cleanly and shows: modified `index.html`, `.github/workflows/study-notify.yml`,
`StudyTrack-Widget.js`, the four `StudyTrack.*.sh`; deleted `notify.js`, `package.json`,
`valtown-notify.js`; untracked `archive/` and several `HANDOFF*/OPUS*/CLAUDE-CODE*` docs + `.DS_Store`.

## Step 1 — show me the diff summary and WAIT for my "go"
Run `git diff --stat` and `git status`, show me the plan below, and do not commit until I say go.

## Step 2 — make these commits, in order (one logical fix per commit)
`index.html` contains several unrelated logical changes interleaved, so for its commits use
`git add -p index.html` and stage ONLY the hunks named. Use `s` to split and `e` to hand-edit a
hunk if git bundles unrelated lines together. Verify with `git diff --cached` before each commit.

**Commit 1 — audit fixes F1–F3 (index.html only)**
Stage the hunks in these functions: `_coachPasteHandler` / the coach image handler (data-URL
split into mime + base64), `archiveOldSessions` (folds archived hours into subject `base`),
`stopTimerAndLog` (adds `timerSyncPush()` + full state clear).
```
git commit -m "Fix coach-scan callback, archive-hours data loss, Stop&Log timer resurrection (audit F1-F3)"
```

**Commit 2 — B1 biweekly parity (3 files, keep identical)**
Stage the `getWeekParity()` hunk in `index.html`, plus whole files `.github/workflows/study-notify.yml`
and `StudyTrack-Widget.js` (their `weekParity()`).
```
git add .github/workflows/study-notify.yml StudyTrack-Widget.js
git add -p index.html   # stage only the getWeekParity() hunk
git commit -m "Fix biweekly Week A/B parity time-bomb via epoch-anchored counter (B1)"
```

**Commit 3 — B4 notif prefs/templates sync (index.html only)**
Stage the hunks in: `syncFromCloud` KEYS array, the LWW `else if(...)` branch (adds the two
notif keys), the two emergency-cleanup lists (`_writeSessionsSafe` + the `catch` quota block),
and `saveNotifTemplates` / `onNotifToggle` / `saveNotifPrefs` (the `*_updated_at` sets).
```
git commit -m "Sync st_notif_prefs/st_notif_templates via timestamped LWW (B4)"
```

**Commit 4 — B3 SwiftBar widgets (4 files)**
```
git add StudyTrack.1s.sh StudyTrack.30s.sh StudyTrack.45s.sh StudyTrack.1m.sh
git commit -m "Fix SwiftBar widgets: exclude extra-credit, honor biweekly recurrence, use Tokyo time (B3)"
```

**Commit 5 — B5 archive dead notifiers**
```
git add -A archive notify.js valtown-notify.js package.json
git commit -m "Archive dead notifiers (notify.js, valtown-notify.js, package.json) — superseded by workflow (B5)"
```

**Commit 6 — minor cleanup (index.html remainder)**
Everything left in `index.html`: `exportReport` pace fallback, the two `nowLocal()` cutoffs,
`escHtml(s.notes)` in the dup-warn card, the pomodoro-countdown timer bubble, and the removed
Quick Log modal (JS + markup).
```
git add index.html
git commit -m "Cleanup: report pace fallback, Tokyo cutoffs, escape dup-warn notes, pomodoro bubble, drop dead Quick Log"
```

**Commit 7 — session docs (optional but recommended)**
```
git add HANDOFF-2026-07-05-bugfixes-applied.md HANDOFF-2026-07-05-bug-audit.md HANDOFF-2026-07-03-graduation-date-bug.md OPUS-PROMPT-2026-07-05-bug-fixes.md CLAUDE-CODE-PROMPT-2026-07-05-bugfixes.md
git commit -m "Add 2026-07-05 bug-fix handoff + prompt docs"
```

## Step 3 — stop tracking .DS_Store (optional housekeeping)
```
printf '.DS_Store\n' >> .gitignore
git rm --cached .DS_Store .github/.DS_Store 2>/dev/null || true
git add .gitignore
git commit -m "Ignore .DS_Store"
```

## Step 4 — push
```
git push origin main
```
GitHub Pages auto-deploys. After it deploys, fully close and reopen the app so the service
worker refreshes.

## Step 5 — clean up locks again for next time
```
rm -f .git/*.lock
```

## Safety notes
- Do not paste or echo any secrets. The only secret in the client is the public Supabase anon
  key, which is already committed and is meant to be public.
- If `git add -p` bundles unrelated lines into one hunk, split (`s`) or edit (`e`) it rather than
  committing mixed changes. If anything looks wrong, stop and show me before continuing.
