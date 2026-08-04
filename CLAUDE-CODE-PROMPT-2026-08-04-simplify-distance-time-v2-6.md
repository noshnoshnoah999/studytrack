# Claude Code prompt — commit & push distance/time formatting (v2.6)

**Repo root: `/Users/noahflouty/Claude/StudyTrack/studytrack-deploy`** — not the parent.
**Clear `.git/index.lock` first.**

---

```
Please commit and push the StudyTrack distance and time formatting changes.

REPO ROOT: /Users/noahflouty/Claude/StudyTrack/studytrack-deploy
(The parent /Users/noahflouty/Claude/StudyTrack is NOT a git repo.)
Remote: https://github.com/noshnoshnoah999/studytrack.git   Branch: main

STEP 0 — Check for a leftover zero-byte .git/index.lock and delete it before
anything else, or `git add` will fail with "Unable to create '.git/index.lock':
File exists". Confirm no git process is genuinely running first.

STEPS
1. Run `git status` and show me the output.
2. Expect modified: index.html, version.txt
   Expect new: CLAUDE-CODE-PROMPT-2026-08-04-simplify-distance-time-v2-6.md
   LEAVE the older untracked CLAUDE-CODE-PROMPT-* / HANDOFF-* backlog alone.
   Stage nothing under archive/.
3. Stage only those three files.
4. Commit with this message:

Simplify distance and total time in the journal

- Distance is now just "4.13 KM" instead of "4 Kilometres and 130 Meters (4.13 KM)",
  which also removes the special sub-1km case entirely
- Total Time drops the seconds and abbreviates the two components:
  "23 Mins of cycling + 10 Mins of journal writing = 33 Minutes"
- Same wording applied to the stretches journal for consistency

Minutes stay floored, never rounded up, so the line always adds up and the end
time in the journal matches the session times in the Google Form.

5. Push to origin main and show me the new commit SHA.
6. Remove any git lock or stale lock files (.git/index.lock, .git/HEAD.lock,
   .git/refs/heads/*.lock) so the next session starts cleanly. Report what was found.

DO NOT change any application code.
```

---

## Verified before commit

All four templates:

```
CYCLE  : Total Time: 23 Mins of cycling + 10 Mins of journal writing = 33 Minutes
RUN    : Total Time: 27 Mins of running + 10 Mins of journal writing = 37 Minutes
WALK   : Total Time: 10 Mins of walking + 10 Mins of journal writing = 20 Minutes
STRETCH: Total Time: 20 Mins of stretching + 5 Mins of journal writing = 25 Minutes
```

Singular handled: a 1-minute activity reads `1 Min of cycling`, not `1 Mins`.

Distance renders plainly at every scale — `4.13 KM`, `0.86 KM`, `1 KM`, `10 KM`.

---

## Still open — moving time vs elapsed time

Unchanged. Strava's "Time" (feed) and "Moving Time" (activity page) are the same figure, so
journals record moving time, which excludes time stopped at lights. Waiting on whether the
activity page shows an "Elapsed Time" figure below Calories.
