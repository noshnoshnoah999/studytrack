# Claude Code prompt — commit & push Greyscale Mode (2026-08-06)

Paste everything below the line into Claude Code.

---

You are working in the StudyTrack repo.

**Repo root is the `studytrack-deploy` SUBFOLDER, not the StudyTrack parent folder:**

```
/Users/noahflouty/Claude/StudyTrack/studytrack-deploy
```

The parent `/Users/noahflouty/Claude/StudyTrack` now has its own separate git repo
(the Swift app, initialised 2026-08-05). **Do not confuse the two.** Everything in
this task is in `studytrack-deploy`. Remote: `https://github.com/noshnoshnoah999/studytrack.git`, branch `main`.

## Step 0 — clear stale lock FIRST

A Cowork sandbox session may have left a zero-byte `.git/index.lock` that the
sandbox cannot delete. If it exists, `git add` will fail with
"Unable to create '.git/index.lock': File exists." Clear it before anything else:

```bash
cd /Users/noahflouty/Claude/StudyTrack/studytrack-deploy
rm -f .git/index.lock .git/HEAD.lock .git/refs/heads/main.lock
```

## Step 1 — confirm the diff is what you expect

```bash
git status
git diff --stat index.html
```

Expected: `index.html` modified, roughly **+66 / −1**. Two new untracked files:
`HANDOFF-2026-08-06-greyscale-mode.md` and this prompt file.

If `index.html` shows a much larger diff than that, **stop and report back** —
something else got changed and I want to see it before it lands.

## Step 2 — sanity check the change

```bash
grep -n "greyscale\|Greyscale" index.html | head -30
```

You should see ~22 hits: one CSS rule block, the pre-paint boot script, the
toggle markup in the settings modal, four JS functions, the `openGoalSettings`
call, the `applyGreyscale()` call after `applyTheme()`, and two cloud-sync hooks.

## Step 3 — commit

Stage **only** `index.html` and the two new markdown files for this feature. There
are ~20 pre-existing untracked `CLAUDE-CODE-PROMPT-*` / `HANDOFF-*` files in the
repo from earlier sessions — **leave those alone**, they are a separate backlog.

```bash
git add index.html HANDOFF-2026-08-06-greyscale-mode.md CLAUDE-CODE-PROMPT-2026-08-06-greyscale-mode.md
git commit -m "Add a greyscale mode I can flip on when colour is distracting

Greyscale is its own switch in Settings rather than a 12th theme, so it
stacks on whatever palette is already picked — Slate stays dark, Mint stays
light, both just lose their colour.

Done as a root grayscale() filter instead of a grey palette because the app
has ~554 hardcoded hex colours and SUBJ_COLORS is duplicated across 10
function scopes; a variable-only theme would have left every subject chip and
chart slice in full colour. The filter catches everything and can't drift out
of sync as new colours get added.

A filter normally makes an element a containing block for position:fixed
children, which would have shifted the bottom nav — <html> measures 847px
against an 802px viewport. The root element is carved out of that rule, and
I verified it in Chrome: the bottom nav and a bottom-anchored probe both
showed 0px drift with the filter on.

Setting saves to st_greyscale and syncs to my other devices like the theme
does, and applies pre-paint so there's no colour flash on load."
```

## Step 4 — push

```bash
git push origin main
```

Report the resulting commit SHA back to me.

## Step 5 — clean up locks before you finish

Whatever happened above, finish by clearing any locks left behind so the next
session starts clean:

```bash
cd /Users/noahflouty/Claude/StudyTrack/studytrack-deploy
rm -f .git/index.lock .git/HEAD.lock .git/refs/heads/main.lock
git status --short | head
```

Confirm no `.lock` files remain and report the final state.
