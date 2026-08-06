# Claude Code prompt — icon contrast + settings icon fix (2026-08-06)

Small follow-up to `71ebfc0`. Paste everything below the line into Claude Code.

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

`71ebfc0` replaced the app's emoji with inline SVG. Two faults showed up on device:

1. The icons rendered too dark. `.btn-dark`, `.btn-notif` and `#btn-holiday` set no
   `color`, so `stroke="currentColor"` inherited a dim ancestor value. Emoji carried
   their own colour, so this never mattered until they became SVG.
2. The settings "gear" was a circle with 8 radiating spokes — visually a sun, and
   indistinguishable from the holiday-mode sun icon next to it.

This is a **small** commit: `index.html` +13/−13, plus a handoff doc update.

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
- `index.html` **+13 / −13**
- `HANDOFF-2026-08-06-monochrome-no-motion.md` modified (about +16 / −3)
- One new untracked file: this prompt

**If `index.html` shows more than ~13 changed lines, stop and report back.** This
commit should touch nothing but icon colour, icon size and the settings icon path.

## Step 2 — sanity checks

The three icon buttons must now each declare a colour — all three must print `1`:

```bash
grep -o "\.btn-dark{[^}]*}"  index.html | grep -c "color:var(--text)"
grep -o "\.btn-notif{[^}]*}" index.html | grep -c "color:var(--text)"
grep -c "flex-shrink:0;color:var(--text)\">" index.html
```

No old 15px icons should remain, and the sun-like gear must be gone (first prints
`0`, second `0`, third `14`):

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

git commit -m "Make the new icons readable and stop settings looking like a sun

The SVG icons I swapped the emoji for came out too dark on my phone. The
buttons holding them never set a colour, so currentColor was inheriting
something dim from further up. The emoji brought their own colour with
them, so nothing had ever needed to say what colour those buttons were.

The settings icon was also a circle with eight spokes coming off it,
which is a sun, not a gear — and it sat right next to the actual sun for
holiday mode. Swapped it for sliders so I can tell them apart.

Holiday mode ON fills the button with the near-white accent, so the icon
flips to the dark background colour there, same inversion the primary
buttons use, otherwise it would disappear into its own pill.

Icons went from 15px at 2.0 stroke to 16px at 2.2 so they hold up at
this size."
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

## After the push

Check the toolbar icons on device. Left to right in the schedule header: holiday
(sun), notifications (bell / bell-with-slash). In the sidebar: notification settings
(bell), settings (sliders).

**The one state never seen rendered:** holiday mode switched **on** — the button
fills near-white and the icon should go dark. If the icon vanishes there, say so.
