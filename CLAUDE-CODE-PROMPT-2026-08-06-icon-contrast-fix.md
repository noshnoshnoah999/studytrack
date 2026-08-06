# Claude Code prompt — icons, remaining animations, orange glow, in-app notifications (2026-08-06)

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

## Context — four rounds of fixes on top of `71ebfc0`, committed together

**1. Icons too dark, settings icon looked like a sun.** `.btn-dark`, `.btn-notif` and
`#btn-holiday` set no `color`, so `stroke="currentColor"` inherited a dim ancestor
value — the emoji had carried their own colour, so nothing had ever needed to declare
it. The "gear" was a circle with 8 radiating spokes, i.e. a sun, sitting next to the
actual holiday sun. Now a sliders icon, 16px at 2.2 stroke.

**2. Animation that survived the CSS strip.** `71ebfc0` removed CSS `transition:`,
`animation:` and `@keyframes` but missed motion applied via **JS property assignment**
(`el.style.transition='width 1s …'`), which is not the CSS token and matched no search.
That left the graduation bar, subject bars, history 7-day bars and the schedule
day-swipe animating. Also removed: a 600ms `setInterval` count-up, 17 dead
`animationDelay` assignments, entrance staggers, and two `setTimeout` delays (300ms /
450ms) that existed only to let exit animations finish.

**3. Orange glow on the Save button.** A "Button hover lift" CSS block still had
`box-shadow: 0 6px 20px rgba(249,115,22,0.45)` — original orange — plus
`transform:translateY(-1px)`. Purged along with 8 hover lifts, a `scale(1.01)` grow on
input focus, and every other `rgba(249,115,22,…)` tint. **Zero orange left in the app.**

**4. In-app notifications removed entirely.** Push is untouched and still works.

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
- HEAD is `71ebfc0`
- `index.html` around **+31 / −203** (heavily deletions — that is the point)
- `HANDOFF-2026-08-06-monochrome-no-motion.md` modified
- One new untracked file: this prompt

If `index.html` shows large *additions*, stop and report back.

## Step 2 — sanity checks

**No motion of any kind.** All six print `0`:

```bash
grep -c 'transition:'   index.html
grep -c 'animation:'    index.html
grep -c '@keyframes'    index.html
grep -c "style\.\(transition\|animation\|animationDelay\)\s*=" index.html
grep -c 'const timer=setInterval' index.html
grep -c "behavior:'smooth'" index.html
```

**No orange, no in-app notifications.** All print `0`:

```bash
grep -c 'rgba(249,115,22' index.html
grep -ci 'inapp'          index.html
grep -c 'notif-center'    index.html
grep -c 'notif-badge'     index.html
grep -c 'dismissBanner'   index.html
```

**Push survived** — first prints `10` (was 12; the two in-app-only types were removed),
the rest `1`, `1`, `true`:

```bash
sed -n '/^const NOTIF_TYPES/,/^\];/p' index.html | grep -c "id:"
grep -c 'function saveNotifPrefs' index.html
grep -c 'function onNotifToggle' index.html
```

**Icons** — `0`, `0`, `12` (12 not 14: removing the two notification-centre bells
took two SVGs with them):

```bash
grep -c '<svg width="15"' index.html
grep -c 'r="3.2"' index.html
grep -c '<svg width="16"' index.html
```

**Structural parse — all three must be 0 errors, and no undefined handlers.**
This matters: a large deletion can leave orphaned markup or a dangling call that
`grep` will not catch.

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
const missing=[...called].filter(f=>!defined.has(f));
console.log("CSS:",e1.length,"HTML:",e2.length,"JS:",bad,"undefined handlers:",missing.length?missing.join(","):"none");'
```

If any check fails, stop and report rather than committing.

## Step 3 — commit

Stage **only** these three paths. There are ~20 pre-existing untracked
`CLAUDE-CODE-PROMPT-*` / `HANDOFF-*` files from earlier sessions — **leave them alone.**

```bash
git add index.html \
        HANDOFF-2026-08-06-monochrome-no-motion.md \
        CLAUDE-CODE-PROMPT-2026-08-06-icon-contrast-fix.md

git commit -m "Bin the in-app notifications and finish off the leftovers

I dont need notifications inside the app. The bell, the badge, the
notification centre, the banner that slid down from the top, all gone.
Push is untouched and still works. Two of the types only ever existed
in-app - the daily target celebration and the streak warning - so
theyve gone with it, which is the same gamification I deleted the
confetti for.

The bars were still animating everywhere. Turns out Id only deleted the
CSS ones; these were set from JavaScript as el.style.transition, so
nothing I searched for had matched them. Progress, subjects, the seven
day history bars and the schedule day swipe all sit still now. Also went
the count-up on the numbers and two timeouts on the tasks page that were
only there to let an exit animation finish.

The Save button had an orange glow round it. It was in a hover lift
block I never touched, still the original orange, and it lifted the
button a pixel too. Went through and killed every orange value left, so
theres none anywhere in the app now, plus eight hover lifts and a scale
that grew every input when I tapped it.

Icons were too dark because the buttons holding them never set a colour,
and the settings icon was a circle with eight spokes coming off it,
which is a sun, right next to the actual sun for holiday mode."
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

1. **Notification Settings** — should now show a single "Push" column, 10 rows, no
   "In-app" column. Toggle one and hit Save to confirm prefs still persist.
2. **Sidebar** — the bell that opened the notification centre is gone. The remaining
   bell opens Notification Settings; the sliders icon opens Settings.
3. **Save button** in Settings — no orange glow, no lift on hover.
4. Spot-check Progress, Subjects, History and Schedule once more for stationary bars.
