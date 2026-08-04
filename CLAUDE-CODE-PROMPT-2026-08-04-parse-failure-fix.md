# Claude Code prompt — commit & push parse fix + stretches tidy-up

**Repo root: `/Users/noahflouty/Claude/StudyTrack/studytrack-deploy`** — not the parent.
**Clear `.git/index.lock` first.**

This bundles two things: the import parse failure, and the stretches journal wording.

---

```
Please commit and push the StudyTrack import parse fix and stretches tidy-up.

REPO ROOT: /Users/noahflouty/Claude/StudyTrack/studytrack-deploy
(The parent /Users/noahflouty/Claude/StudyTrack is NOT a git repo.)
Remote: https://github.com/noshnoshnoah999/studytrack.git   Branch: main

STEP 0 — Check for a leftover zero-byte .git/index.lock and delete it before
anything else, or `git add` will fail with "Unable to create '.git/index.lock':
File exists". Confirm no git process is genuinely running first.

CONTEXT
Imports were failing with "Could not read workout data — try a clearer screenshot"
on a perfectly legible screenshot. That message was wrong: it fires on any JSON
parse failure and says nothing about image quality.

STEPS
1. Run `git status` and show me the output.
2. Expect modified: index.html, version.txt
   Expect new: CLAUDE-CODE-PROMPT-2026-08-04-parse-failure-fix.md
   CLAUDE-CODE-PROMPT-2026-08-04-drag-drop-bypass-fix.md may also be untracked if
   that change has not been pushed yet — include it if so.
   LEAVE the older untracked CLAUDE-CODE-PROMPT-* / HANDOFF-* backlog alone.
   Stage nothing under archive/.
3. Stage only those files.
4. Commit with this message:

Fix import parse failure and tidy the stretches journal

"Could not read workout data — try a clearer screenshot" fired on any JSON parse
failure, so a legible screenshot produced a message pointing at the wrong cause.

- Response parsing no longer assumes content[0] is the text block. A model may
  return a thinking block first, in which case content[0].text is not the JSON.
  Both the extraction and reflection calls now find the block by type.
- Added a fallback that extracts the outermost {...} if the JSON is wrapped in prose
- max_tokens raised 1000 -> 2000 for extraction and 600 -> 1500 for the reflection,
  since a thinking block counts against the same budget and would otherwise
  truncate the JSON mid-object
- Error messages now name the real cause, with a specific one for max_tokens, and
  log stop_reason, usage and content to the console; raw response kept in
  _lastWorkoutRaw for diagnosis

Stretches journal:
- "POST-RUN COOL-DOWN" is now sentence case
- Dropped the "Moved gently within each pose" line
- Dropped the per-stretch body-part targets, which are already in the attached PDF
- Source line simplified to "Source: video from YouTube by Run Better with Ash."

5. Push to origin main and show me the new commit SHA.
6. Remove any git lock or stale lock files (.git/index.lock, .git/HEAD.lock,
   .git/refs/heads/*.lock) so the next session starts cleanly. Report what was found.

DO NOT change any application code.
```

---

## Verified before commit

**Parser** tested against six response shapes — plain text, thinking block first, fenced
JSON, prose before, prose after, and thinking-only. All parse correctly except the last,
which throws a clear "no text block" error.

**Stretches journal** now renders as:

```
31st July - After Run Stretches
Journal Writing Time (Included as Study Time): 5 Minutes

Friday 31st July 2026
Start Time: 21:31
End Time: 21:56
Total Time: 20 Mins of stretching + 5 Mins of journal writing = 25 Minutes

Completed my post-run cool-down routine from my Runner's Stretch Guide, which I have attached.
I also complete the guide's pre-run dynamic warm-up before I set off running. The guide's suggested
timings are approximate; I move through the poses more slowly than that, so the two parts together
come to around 20 minutes in practice.

Post-run cool-down
1. Pigeon Pose, both sides
2. Toe and Arch Stretch
3. Deep Lunge, both sides
4. Quad and Hip Flexor Stretch in the Lunge
5. Sphinx Pose / Upward-Facing Dog
6. Seated Wide-Leg Stretch

Source: video from YouTube by Run Better with Ash.

Please check the attached Runner's Stretch Guide PDF, which lists every stretch in this routine.
```

---

## If the import still fails after this

The toast will name the cause:

- **"Reply was cut off before it finished"** — token ceiling; tell me and I'll raise it.
- **"Model did not return usable JSON (...)"** — open the browser console for `stop_reason`,
  `usage` and the full `content`. Typing `_lastWorkoutRaw` prints the entire raw response.

Send me either and I can fix the real cause instead of inferring it.
