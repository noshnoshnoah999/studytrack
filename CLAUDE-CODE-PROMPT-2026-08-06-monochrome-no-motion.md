# Claude Code prompt — commit & push Monochrome / No Motion / No Emoji (2026-08-06)

Paste everything below the line into Claude Code.

---

You are working in the StudyTrack repo.

**Repo root is the `studytrack-deploy` SUBFOLDER, not the StudyTrack parent folder:**

```
/Users/noahflouty/Claude/StudyTrack/studytrack-deploy
```

The parent `/Users/noahflouty/Claude/StudyTrack` has its own separate git repo (the
Swift app, initialised 2026-08-05). **Do not confuse the two.** Everything here is in
`studytrack-deploy`. Remote: `https://github.com/noshnoshnoah999/studytrack.git`, branch `main`.

## Context you need before you look at the diff

The previous commit `a8d94d9` added a **Greyscale toggle**. This commit **reverts
that** and goes much further: it deletes the entire theme system, all animation and
all decorative emoji. So expect a **large net deletion** — that is the whole point,
not a mistake.

**Two tracked files are deleted on purpose:**
`HANDOFF-2026-08-06-greyscale-mode.md` and `CLAUDE-CODE-PROMPT-2026-08-06-greyscale-mode.md`.
They document the reverted feature. **Seeing them as deleted is correct — do not
restore them.**

## Step 0 — clear stale locks FIRST

A Cowork sandbox session can leave a zero-byte `.git/index.lock` it cannot delete,
which blocks `git add` with "Unable to create '.git/index.lock': File exists."

```bash
cd /Users/noahflouty/Claude/StudyTrack/studytrack-deploy
rm -f .git/index.lock .git/HEAD.lock .git/refs/heads/main.lock
```

## Step 1 — confirm the diff

```bash
git log --oneline -2
git status
git diff --stat
```

Expected:
- HEAD is `a8d94d9`
- `index.html` roughly **+672 / −1146**
- `StudyTrack-Widget.js` about **±46**
- `HANDOFF-2026-08-06-greyscale-mode.md` and
  `CLAUDE-CODE-PROMPT-2026-08-06-greyscale-mode.md` shown as **deleted** (correct)
- Two new untracked files: `HANDOFF-2026-08-06-monochrome-no-motion.md` and this prompt

If `index.html` differs wildly from that, **stop and report back** before anything lands.

## Step 2 — sanity checks

All of these must print `0`:

```bash
grep -c "data-theme"        index.html
grep -c "st_theme"          index.html
grep -c "@keyframes"        index.html
grep -c "greyscale"         index.html
grep -c "st_theme\|THEMES"  StudyTrack-Widget.js
```

Syntax — must report `errors: 0`:

```bash
node -e "
const fs=require('fs');const h=fs.readFileSync('index.html','utf8');
const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;let m,n=0,bad=0;
while((m=re.exec(h))){n++;try{new Function(m[1])}catch(e){bad++;console.log(e.message)}}
console.log('scripts:',n,'errors:',bad);"
```

Widget — **must be checked as a module**, it uses top-level `await`. `new Function`
will give a misleading failure:

```bash
cp StudyTrack-Widget.js /tmp/w.mjs && node --check /tmp/w.mjs && echo "widget OK"
```

If any check fails, stop and report rather than committing.

## Step 3 — commit

Stage **only** these paths. There are ~20 pre-existing untracked
`CLAUDE-CODE-PROMPT-*` / `HANDOFF-*` files from earlier sessions — **leave them alone.**

```bash
git add -u index.html StudyTrack-Widget.js \
           HANDOFF-2026-08-06-greyscale-mode.md \
           CLAUDE-CODE-PROMPT-2026-08-06-greyscale-mode.md
git add index.html StudyTrack-Widget.js \
        HANDOFF-2026-08-06-monochrome-no-motion.md \
        CLAUDE-CODE-PROMPT-2026-08-06-monochrome-no-motion.md

git commit -m "Strip the app back to one grey palette, no animation, no emoji

I built this to track study hours and then spent my time looking at it
instead of studying. Eleven themes, a theme carousel, 39 keyframe
animations, confetti on every target hit, emoji on everything.

This reverts the greyscale toggle I added yesterday and deletes the lot
instead. A toggle was the wrong answer — a customisation switch is still
customisation, and I'd have gone straight back to fiddling with it.

One monochrome palette now. Green, amber and red survive but only to show
on-track, warning and behind; that's information, not decoration, and I
can't read my progress at a glance without it.

The accent is near-white because 25 buttons use it as a background, so
their text flipped to near-black. Don't darken the accent without
flipping those back or every primary button goes unreadable.

Confetti and the click ripple are removed at source rather than having
their animations zeroed, because both relied on animationend to delete
their own DOM nodes — 60 of them per target hit — and zeroing the
animation would have left them in the page forever.

The 12 duplicated subject-colour maps are emptied rather than deleted, so
every lookup falls through to the neutral accent and no call site had to
change. 14 hex literals left in the app and 13 of them are the palette.

Emoji are gone where losing them costs nothing. Arrows, ticks, the close
cross and the reorder chevrons stay because they're doing real work, and
the five buttons that were nothing but an emoji now use inline SVG so
they don't render blank.

The printable teacher report keeps its colours on purpose — it's a
document for print, not app chrome.

Widget palette and emoji updated to match, though that one needs
re-pasting into Scriptable by hand."
```

## Step 4 — push

```bash
git push origin main
```

Report the resulting commit SHA back to me.

## Step 5 — clear locks before finishing

Whatever happened above, finish by clearing any locks so the next session starts clean:

```bash
cd /Users/noahflouty/Claude/StudyTrack/studytrack-deploy
rm -f .git/index.lock .git/HEAD.lock .git/refs/heads/main.lock
git status --short | head
```

Confirm no `.lock` files remain and report the final state.

---

## After the push — three things only Noah can do

1. **Click through all ten pages** on the deployed site: Dashboard, Log Hours,
   Progress, Subjects, Graduation, Timer, History, Tasks, AI Coach, Schedule. This
   change was verified by parsers and a CSS injection, **not** a full browser run —
   the Chrome extension won't open `file://` and the sandbox has no headless browser.
2. **Check the five new SVG icons actually render** — gear (settings, two places),
   bell (notification settings), bell-with-slash (notifications toggle), sun
   (holiday). They are hand-written paths that have never been drawn. If any shows
   as a blank square, say so and it gets fixed.
3. **Re-paste `StudyTrack-Widget.js` into Scriptable** on your phone. Git does not
   deploy that file.
