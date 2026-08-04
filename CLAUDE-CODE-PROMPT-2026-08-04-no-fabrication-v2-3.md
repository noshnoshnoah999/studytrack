# Claude Code prompt — commit & push the anti-fabrication fix (v2.3)

**Repo root: `/Users/noahflouty/Claude/StudyTrack/studytrack-deploy`** — not the parent.
**Clear `.git/index.lock` first.**

---

```
Please commit and push the StudyTrack reflection anti-fabrication fix.

REPO ROOT: /Users/noahflouty/Claude/StudyTrack/studytrack-deploy
(The parent /Users/noahflouty/Claude/StudyTrack is NOT a git repo.)
Remote: https://github.com/noshnoshnoah999/studytrack.git   Branch: main

STEP 0 — Check for a leftover zero-byte .git/index.lock and delete it before
anything else, or `git add` will fail with "Unable to create '.git/index.lock':
File exists". Confirm no git process is genuinely running first.

CONTEXT
The v2.2 reflection wrote invented physical sensations as fact ("I was sweating a lot",
"the air felt thick and heavy") and claimed Noah had named an activity that Runna had
actually auto-named. These journals are submitted to his school, so nothing in them can
be made up.

STEPS
1. Run `git status` and show me the output.
2. Expect modified: index.html, version.txt
   Expect new: CLAUDE-CODE-PROMPT-2026-08-04-no-fabrication-v2-3.md
   LEAVE the older untracked CLAUDE-CODE-PROMPT-* / HANDOFF-* backlog alone.
   Stage nothing under archive/.
3. Stage only those three files.
4. Commit with this message:

Stop the reflection inventing physical sensations it cannot know

These journals go to school, so the reflection must not assert anything that
isn't in the data. v2.2 wrote "I was sweating a lot more than the distance
should have caused" and "the air felt thick and heavy" purely from a temperature
reading, and opened with "I called this one Your First Walk Run Back for a
reason" — a title Runna generated automatically, not Noah.

- Reflection prompt now bans asserting physical sensations as fact
- Reasoning from real figures is still allowed, but must be hedged
  ("I think the heat pushed my heart rate up") since HR and temperature are real
- Activity title is no longer passed to the reflection call at all, so it can no
  longer claim Noah named something the app named
- "After that" restricted to genuine time transitions, not filler
- Temperature rounded to whole degrees everywhere (journal, preview, prompt) —
  "29.1°C" in a diary reads as machine-generated

5. Push to origin main and show me the new commit SHA.
6. Remove any git lock or stale lock files (.git/index.lock, .git/HEAD.lock,
   .git/refs/heads/*.lock) so the next session starts cleanly. Report what was found.

DO NOT change any application code.
```

---

## What to check on the re-import

Same 31 July Runna screenshot. The reflection should now:

- **State no sensation it cannot know.** No sweating, no heavy air, no burning legs.
- **Still connect the heat to the heart rate**, but hedged — "I think the heat probably pushed my heart rate up" is allowed, because 143 bpm and 29°C are both real figures.
- **Not mention the activity title at all.**
- Read **29°C**, not 29.1°C, in both the journal and the preview card.

Expect it to be a little drier than the last version. That's the trade — it can no longer colour in details it doesn't have. Add the real feeling yourself when you review it; that part was always going to be yours.
