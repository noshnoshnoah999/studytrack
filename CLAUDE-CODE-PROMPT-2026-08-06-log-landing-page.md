# Claude Code prompt — open on Log Hours instead of Dashboard (2026-08-06)

Small follow-up to `a9f6fdd`. Paste everything below the line into Claude Code.

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

The app should open on **Log Hours**, not Dashboard, so logging is immediate.

Three things set the landing page and all three had to change — changing only the
boot call would have painted the Dashboard first and then swapped to Log on load:

1. `showPage(validPages.includes(hash)?hash:'dashboard')` → `'log'` — the boot call.
   The `#hash` override is deliberately kept, so a deep link still wins.
2. `let currentPage='dashboard'` → `'log'` — the tracking variable.
3. The `active` class moved from `<div class="page" id="page-dashboard">` to
   `id="page-log"` — this is what the browser paints *before* JS runs.

Two dead things were also removed, both left over from the animation strip in
`64684e8`: an empty `if(nextIdx>prevIdx){}` directional-transition block, and the
`NAV_ORDER` and `prevPage` variables that existed only to feed it. `DEFAULT_NAV_ORDER`
is a **different** variable that drives the nav-reorder feature — it stays.

This is a **small** commit: `index.html` about **+4 / −14**.

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

Expected: HEAD is `a9f6fdd`, `index.html` about **+4 / −14**, plus this prompt as a
new untracked file. If the diff is much larger, **stop and report back**.

## Step 2 — sanity checks

Exactly one page is pre-active and it must be `log`:

```bash
grep -c 'class="page active"' index.html          # 1
grep -o 'class="page active" id="page-[a-z]*"' index.html   # ...id="page-log"
```

Boot default and tracking variable both on log — each prints `1`:

```bash
grep -c "hash:'log'" index.html
grep -c "let currentPage='log'" index.html
```

Dead leftovers gone — first two print `0`, the third `2` (the surviving, different
variable: its definition plus one use):

```bash
grep -c '\bNAV_ORDER\b' index.html
grep -c 'prevPage' index.html
grep -c 'DEFAULT_NAV_ORDER' index.html
```

Structural parse — 0 errors and no undefined handlers:

```bash
npm i --silent --prefix /tmp css-tree@2 parse5@7 >/dev/null 2>&1
node -e '
const fs=require("fs");const h=fs.readFileSync("index.html","utf8");
const csstree=require("/tmp/node_modules/css-tree"),parse5=require("/tmp/node_modules/parse5");
let e1=[];csstree.parse(h.match(/<style>([\s\S]*?)<\/style>/)[1],{onParseError(e){e1.push(e.message)}});
let e2=[];parse5.parse(h,{onParseError:e=>e2.push(e.code)});
const re=/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;let m,n=0,bad=0;
while((m=re.exec(h))){n++;try{new Function(m[1])}catch(e){bad++;console.log(e.message)}}
const defined=new Set([...h.matchAll(/function\s+([A-Za-z_$][\w$]*)/g)].map(m=>m[1]));
[...h.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/g)].forEach(m=>defined.add(m[1]));
const called=new Set([...h.matchAll(/on(?:click|change|input|focus)="([A-Za-z_$][\w$]*)\(/g)].map(m=>m[1]));
console.log("CSS:",e1.length,"HTML:",e2.length,"JS:",bad,"undefined handlers:",[...called].filter(f=>!defined.has(f)).join(",")||"none");'
```

If any check fails, stop and report rather than committing.

## Step 3 — commit

Stage **only** these two paths. There are ~20 pre-existing untracked
`CLAUDE-CODE-PROMPT-*` / `HANDOFF-*` files from earlier sessions — **leave them alone.**

```bash
git add index.html CLAUDE-CODE-PROMPT-2026-08-06-log-landing-page.md

git commit -m "Open on Log Hours instead of the dashboard

The whole point of the app is logging hours, and I was landing on the
dashboard and having to tap through every time. It opens straight on the
log page now.

Had to change it in three places, not one. The boot call picks the page,
but currentPage tracks it separately, and the active class in the markup
is what actually gets painted before any JavaScript runs - so changing
only the boot call would have shown the dashboard for a moment and then
jumped to log. Deep links with a #hash still override it.

Also cleared out an empty if block and two variables that only existed
to drive the page slide I deleted earlier."
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

Open the app. It should land on **Log Hours** with no flash of the dashboard first.
Dashboard is still in the nav, just not the landing page.

No cache-busting needed: `sw.js` already serves navigation requests with
`fetch(e.request,{cache:'no-cache'})`, so the HTML is always fresh and the PWA picks
this up on next open without a version bump.
