# Claude Code prompt — icon contrast + kill the remaining JS animations (2026-08-06)

Follow-up to `71ebfc0`. Paste everything below the line into Claude Code.

---

You are working in the StudyTrack repo.

**Repo root is the `studytrack-deploy` SUBFOLDER, not the StudyTrack parent folder:**

```
/Users/noahflouty/Claude/StudyTrack/studytrack-deploy
```

The parent `/Users/noahflouty/Claude/StudyTrack` has its own separate git repo (the
Swift app). **Do not confuse the two.** Remote:
`https://github.com/noshnoshnoah999/studytrack.git`, branch `main`.

## Context

Two rounds of fixes on top of `71ebfc0`, committed together.

**1. Icons.** `71ebfc0` swapped emoji for inline SVG. They rendered too dark, because
`.btn-dark`, `.btn-notif` and `#btn-holiday` set no `color`, so `stroke="currentColor"`
inherited a dim ancestor value — emoji carried their own colour, so nothing had ever
needed to declare it. The settings "gear" was also a circle with 8 radiating spokes,
which reads as a sun and sat right next to the actual holiday sun.

**2. Animation that survived the strip.** `71ebfc0` removed CSS `transition:`,
`animation:` and `@keyframes`. It missed motion applied through **JS property
assignment** (`el.style.transition = 'width 1s …'`), which the CSS-text strip never
matched. That left the graduation bar, subject bars, history 7-day bars and the
schedule day-swipe still animating. Also removed: a 600ms `setInterval` count-up on
numbers, 17 dead `animationDelay` assignments, and two `setTimeout` delays (300ms,
450ms) that existed only to let exit animations finish and now just made the tasks
page feel laggy.

## Step 0 — clear stale locks FIRST

```bash
cd /Users/noahflouty/Claude/StudyTrack/studytrack-deploy
rm -f .git/index.lock .git/HEAD.lock .git/refs/heads/main.lock
```

## Step 1 — confirm the diff

```bash
git log --oneline -1
git status
git diff --stat
```

Expected:
- HEAD is `71ebfc0` ("Strip the app back to one grey palette, no animation, no emoji")
- `index.html` around **+25 / −157** (mostly deletions — that is the point)
- `HANDOFF-2026-08-06-monochrome-no-motion.md` modified
- One new untracked file: this prompt

If `index.html` shows large *additions*, stop and report back.

## Step 2 — sanity checks

**No motion mechanism of any kind may remain.** All six must print `0`:

```bash
grep -c 'transition:'   index.html
grep -c 'animation:'    index.html
grep -c '@keyframes'    index.html
grep -c "style\.\(transition\|animation\|animationDelay\)\s*=" index.html
grep -c 'const timer=setInterval' index.html
grep -c "behavior:'smooth'" index.html
```

**Icon buttons must each declare a colour** — all three print `1`:

```bash
grep -o "\.btn-dark{[^}]*}"  index.html | grep -c "color:var(--text)"
grep -o "\.btn-notif{[^}]*}" index.html | grep -c "color:var(--text)"
grep -c 'flex-shrink:0;color:var(--text)">' index.html
```

**Old icons gone, new ones present** — `0`, `0`, then `14`:

```bash
grep -c '<svg width="15"' index.html
grep -c 'r="3.2"' index.html
grep -c '<svg width="16"' index.html
```

Syntax — must report `errors: 0`:

```bash
node -e "
const fs=require('fs');const h=fs.readFileSync('index.html','utf8');
const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;let m,n=0,bad=0;
while((m=re.exec(h))){n++;try{new Function(m[1])}catch(e){bad++;console.log(e.message)}}
console.log('scripts:',n,'errors:',bad);"
```

If any check fails, stop and report rather than committing.

## Step 3 — commit

Stage **only** these three paths. There are ~20 pre-existing untracked
`CLAUDE-CODE-PROMPT-*` / `HANDOFF-*` files from earlier sessions — **leave them alone.**

```bash
git add index.html \
        HANDOFF-2026-08-06-monochrome-no-motion.md \
        CLAUDE-CODE-PROMPT-2026-08-06-icon-contrast-fix.md

git commit -m "Stop the bars sliding around and make the icons readable

Every time I opened the progress page the graduation bar grew from zero,
same on subjects, same for the seven-day bars on history, and the
schedule slid sideways whenever I picked a different day. I thought I'd
already deleted all of that. I'd only deleted the CSS — these were set
from JavaScript as el.style.transition, which the strip never matched.

Bars now render at their real width straight away. They still move when
the number actually changes, which is the only time a bar should move.

Also went: the six-hundred millisecond count-up on the numbers, and two
timeouts on the tasks page that existed purely to let an exit animation
play, so ticking a task off now happens the moment I tap it instead of
waiting almost half a second.

The SVG icons came out too dark because the buttons holding them never
set a colour — the emoji had brought their own, so nothing needed to.
And the settings icon was a circle with eight spokes coming off it,
which is a sun, sitting next to the actual sun for holiday mode."
```

## Step 4 — push

```bash
git push origin main
```

Report the resulting commit SHA back to me.

## Step 5 — clear locks before finishing

```bash
cd /Users/noahflouty/Claude/StudyTrack/studytrack-deploy
rm -f .git/index.lock .git/HEAD.lock .git/refs/heads/main.lock
git status --short | head
```

Confirm no `.lock` files remain and report the final state.

---

## After the push — check these four, they are the ones that were wrong

1. **Progress page** — graduation bar sits still on load and on re-click.
2. **Subjects page** — no bars growing in.
3. **History** — "Last 7 days" bars do not rise.
4. **Schedule** — clicking a different day swaps instantly, no slide.

Then the two states never seen rendered: **holiday mode switched on** (button fills
near-white, icon should flip dark), and **deleting a task** (should vanish instantly
now, not after a pause).
