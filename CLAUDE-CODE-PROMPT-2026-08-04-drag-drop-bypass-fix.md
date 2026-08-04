# Claude Code prompt — commit & push the import bypass fix

**Repo root: `/Users/noahflouty/Claude/StudyTrack/studytrack-deploy`** — not the parent.
**Clear `.git/index.lock` first.**

This is a **behaviour bug**, not cosmetic: two of the three ways of adding a screenshot were
calling the Anthropic API before asking which app the screenshot came from.

---

```
Please commit and push the StudyTrack import bypass fix.

REPO ROOT: /Users/noahflouty/Claude/StudyTrack/studytrack-deploy
(The parent /Users/noahflouty/Claude/StudyTrack is NOT a git repo.)
Remote: https://github.com/noshnoshnoah999/studytrack.git   Branch: main
Last commit should be e1e8394 "Simplify distance and total time in the journal".

STEP 0 — Check for a leftover zero-byte .git/index.lock and delete it before
anything else, or `git add` will fail with "Unable to create '.git/index.lock':
File exists". Confirm no git process is genuinely running first.

CONTEXT
The Strava/Runna question was added to the paste path only. Drag-and-drop and
Choose File each had their own duplicated copy of the image-handling logic and
called runWorkoutAnalysis() directly, so both fired at the API before Noah was
asked anything — meaning the model was told the wrong activity type.

STEPS
1. Run `git status` and show me the output.
2. Expect modified: index.html, version.txt
   Expect new: CLAUDE-CODE-PROMPT-2026-08-04-drag-drop-bypass-fix.md
   LEAVE the older untracked CLAUDE-CODE-PROMPT-* / HANDOFF-* backlog alone.
   Stage nothing under archive/.
3. Stage only those three files.
4. Commit with this message:

Fix: drag-drop and Choose File skipped the Strava/Runna question

The source picker was only wired into the paste path. Drag-and-drop and Choose
File each carried their own duplicate of the image-handling code and called
runWorkoutAnalysis() directly, so both sent the screenshot to the API before
asking anything — and the request then claimed the wrong activity type.

- All four entry points (paste via Clipboard API, paste via the native event,
  drag-and-drop, Choose File) now funnel through _handleWorkoutBlob
- The duplicated compress/preview/analyse blocks are gone, so the paths cannot
  drift apart again
- Removed a hidden "Analyse" button that was still wired straight to the API

5. Push to origin main and show me the new commit SHA.
6. Remove any git lock or stale lock files (.git/index.lock, .git/HEAD.lock,
   .git/refs/heads/*.lock) so the next session starts cleanly. Report what was found.

DO NOT change any application code.
```

---

## Verified before commit

`runWorkoutAnalysis()` is now reachable from exactly two places, both of which run **after**
Noah has answered:

- `pickWorkoutApp('Runna')` — Runna is running-only, so it goes straight through
- `pickWorkoutActivity('Cycle'|'Walk')` — after the Strava follow-up question

Traced every entry point:

| Entry point | Goes via `_handleWorkoutBlob` | Calls the API directly |
|---|---|---|
| `handleWorkoutFile` (Choose File / photo) | yes | no |
| `_wDrop` (drag and drop) | yes | no |
| `pasteWorkoutImage` (Clipboard API) | yes | no |
| native `paste` listener | yes | no |

---

## Test after pushing

Try all three, and each should show the "Which app is this from?" step before anything happens:

1. **Drag** a screenshot onto the drop zone
2. **Choose File** / photo library
3. **Paste**

If any of them goes straight to "Reading the screenshot…", it's still bypassing.
