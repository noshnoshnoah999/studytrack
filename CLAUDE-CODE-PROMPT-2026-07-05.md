# Prompt for Claude Code — commit & push the 2026-07-05 bug-audit fixes

Copy everything below into a Claude Code session started in `/Users/noahflouty/Claude/StudyTrack/studytrack-deploy`:

---

The repo at `/Users/noahflouty/Claude/StudyTrack/studytrack-deploy` has uncommitted bug fixes saved to disk from a Cowork audit session. Do the following, in order:

1. Remove the stale git lock files first (left behind by the sandbox, which can't delete them):
   `rm -f .git/index.lock .git/HEAD.lock`
2. Run `git status` and `git diff index.html` to confirm the changes are exactly three fixes in `index.html`:
   - Coach Report image-scan callbacks now split the `compressWorkoutImage` data URL into mime + base64 (two call sites: `_coachPasteHandler`, `handleCoachImage`).
   - `archiveOldSessions()` now folds archived sessions' hours into each subject's `base` and subtracts from `st_hours`, so hours survive the `syncFromCloud` recompute.
   - `stopTimerAndLog()` now fully clears timer state and calls `timerSyncPush()` so the stopped timer doesn't resurrect from cloud/realtime sync.
3. Stage and commit ONLY `index.html` and the two new docs, in two commits:
   - `git add index.html` → commit: `Fix coach-scan image callback, archive hours loss, and stop-and-log timer resurrection`
   - `git add HANDOFF-2026-07-05-bug-audit.md HANDOFF-2026-07-03-graduation-date-bug.md CLAUDE-CODE-PROMPT-2026-07-05.md OPUS-PROMPT-2026-07-05-bug-fixes.md` → commit: `Add bug-audit handoff docs (2026-07-05)`
   Do NOT stage `.DS_Store` files.
4. `git push origin main`.
5. Verify with `git log --oneline -3` and `git status` (should be clean apart from `.DS_Store`).
6. **Supabase data integrity check** (read-only — the Cowork sandbox couldn't reach the network, so this was never verified). Use the public anon key already baked into `index.html` (`SB_URL` / `SB_KEY` constants near the "SUPABASE SYNC" section — do NOT ask me to paste any keys). Fetch these two rows with GET requests:
   - `{SB_URL}/rest/v1/study_data?key=eq.st_sessions&select=value`
   - `{SB_URL}/rest/v1/study_data?key=eq.st_hours&select=value`
   (headers: `apikey: {SB_KEY}`, `Authorization: Bearer {SB_KEY}`)
   Then report, without modifying anything in Supabase:
   a. Session count, oldest and newest session date.
   b. Per-subject sum of `hours` from `st_sessions` vs the values in `st_hours` — list any subject where they differ by more than 0.05h. (They should match, because `syncFromCloud` recomputes `st_hours` from sessions.)
   c. Whether sessions older than 4 months still exist. If they DO, the Archive button was likely never used and no hours were lost — say so explicitly. If the oldest session is suspiciously recent, compare per-subject totals (`base` from `st_subjs` + `st_hours`) against `/Users/noahflouty/Claude/StudyTrack/studytrack-backup-2026-07-03.json` if that file exists (also check Downloads), and flag any subject whose total DROPPED — that would mean archived hours were lost and need restoring into `base`.
   This step is read-only: do not POST/PATCH anything to Supabase.
7. Finally, remove any lock files or stale locks under `.git/` again (`rm -f .git/*.lock`) so the next session starts clean.

Do not make any other code changes in this session.
