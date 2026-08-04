# Claude Code prompt — commit & push the title/date fix (v2.1)

**Repo root: `/Users/noahflouty/Claude/StudyTrack/studytrack-deploy`** — not the parent folder.
**Clear `.git/index.lock` first** — the Cowork sandbox leaves a zero-byte one behind that it
cannot delete itself, and it will block `git add`.

Copy the block below into Claude Code.

---

```
Please commit and push the StudyTrack title/date fix.

REPO ROOT: /Users/noahflouty/Claude/StudyTrack/studytrack-deploy
(The parent /Users/noahflouty/Claude/StudyTrack is NOT a git repo.)
Remote: https://github.com/noshnoshnoah999/studytrack.git   Branch: main

STEP 0 — CLEAR THE STALE LOCK FIRST
Check for a leftover zero-byte .git/index.lock and delete it before anything else,
otherwise `git add` fails with "Unable to create '.git/index.lock': File exists".
Confirm no git process is genuinely running first.

CONTEXT
Device testing of journal import v2 found two bugs with one root cause: the app trusted
Strava's relative timestamp and its own session count instead of the title Noah writes
himself. A ride titled "1st August - Afternoon Cycle 2" was dated 3 August (because the
screenshot header said "Yesterday" and the screenshot was taken on the 2nd), which then
pulled the wrong day's weather. The cycle number came out as 1 instead of 2.

STEPS
1. Run `git status` and show me the output.
2. Expect modified: index.html, version.txt
   Expect new: CLAUDE-CODE-PROMPT-2026-08-04-title-date-fix.md
   HANDOFF-2026-08-04-journal-import-v2.md was updated with a v2.1 section — include it.
   LEAVE the older untracked CLAUDE-CODE-PROMPT-* / HANDOFF-* backlog files alone.
   Do NOT stage anything under archive/.
3. Stage only those four files.
4. Commit with this message:

Fix: trust the activity title for date and cycle number

Strava's "Yesterday at 15:32" is relative to when the SCREENSHOT was taken, not
when the activity happened, so a 1 August ride screenshotted on the 2nd and
imported on the 4th was dated 3 August — and the weather lookup followed it to
the wrong day. The cycle number was derived by counting logged sessions, which
returned 1 for a ride Noah had titled "Cycle 2", because earlier August rides
had not been logged yet.

- Model now returns activityTitle verbatim
- _parseTitleDate / _parseTitleNumber parse it in JS, not in the model
- Title date overrides the timestamp, applied BEFORE the weather lookup
- Title number overrides the session count; the count is now only a fallback
- Year inferred so the date is never in the future (Dec/Jan rollover safe)
- Summary card shows the date source, warning in orange when it fell back
- 10/10 title parsing tests pass, including invalid dates and app defaults

5. Push to origin main.
6. Confirm the push and show me the new commit SHA.
7. Remove any git lock or stale lock files (.git/index.lock, .git/HEAD.lock,
   .git/refs/heads/*.lock) so the next session starts cleanly. Report what was found.

DO NOT change any application code. Commit and push only.
```

---

## Then re-test

Hard-refresh so the service worker picks up the new build, then import the **same 1 August
cycle screenshot** again. You should now see:

- Date: **1st August 2026**, with `(from your title, not "3rd August")` beside it
- Cycle number pre-filled as **2**
- Weather: **36.7°C, Light Drizzle** — the real weather for 1 August at 15:00, not the
  26.7°C Mainly Clear it wrongly pulled for the 3rd
- End time **15:52**, no reflection (under 15 minutes)

If you import something whose title has no date — a fresh Strava activity still called
"Afternoon Ride" — the date line turns **orange** and tells you it fell back to the
timestamp. That is your cue to check it.
