# HANDOFF — Monochrome, No Motion, No Emoji (2026-08-06)

**Status:** Implemented in working tree, structurally verified, NOT yet committed.
**Base commit:** `a8d94d9` ("Add a greyscale mode I can flip on when colour is distracting")
**Files:** `index.html` (−1146 / +672), `StudyTrack-Widget.js` (±46),
2 tracked files **deleted**, 2 new docs added.

> ### Read this first — this commit REVERTS the previous one
> `a8d94d9` shipped a Greyscale *toggle*. Noah then decided a toggle was the wrong
> answer, because a customisation switch is still customisation. This change
> **deletes** the toggle, the whole theme system, all animation and all emoji.
>
> That is why `HANDOFF-2026-08-06-greyscale-mode.md` and
> `CLAUDE-CODE-PROMPT-2026-08-06-greyscale-mode.md` show as **deleted tracked
> files** — they document a feature that no longer exists. The deletions are
> intentional. `st_greyscale`, `data-greyscale` and `setGreyscale()` are all gone.

---

## Why

Noah's own words: *"I added too much customisation, too many animations and too
much colour, to the point where I was getting distracted just looking at the app
instead of studying."*

Everything below follows one principle: **remove the option, don't add a switch.**

---

## What changed

### 1. Theme system — deleted
- All 11 `[data-theme="…"]` blocks gone (sage, slate, rose, ocean, lavender,
  peach, mint, denim, mocha, coral, crimson).
- `applyTheme()`, `setTheme()`, `updateThemeSwatches()`, `THEMES_LIST` and the five
  `_tc*` carousel functions deleted, along with the carousel markup and CSS.
- `st_theme` removed from `syncFromCloud` KEYS and its pull branch deleted.
  **The Supabase row is left in place** — nothing reads it now.
- Greyscale toggle from `a8d94d9` fully reverted (CSS filter, boot guard, toggle
  markup, four JS functions, `st_greyscale` sync).

### 2. One monochrome palette
`:root` is the only source of colour now.

> **`--o` (accent) is near-white `#e8e8e8` on purpose.** 25 elements use it as a
> *button background* and previously had `color:#fff`. Those were flipped to
> `color:var(--bg)` — near-black text on a near-white button. **Darkening `--o`
> without reverting those makes every primary button unreadable.** There is a
> comment in `:root` saying exactly this.

**Surviving colour, deliberately:** `--ok` (muted green), `--warn` (muted amber),
`--err` (muted red) — status only. Without them you cannot read on-track vs behind
at a glance. That is information, not decoration.

### 3. All motion — deleted
| | before | after |
|---|---|---|
| `@keyframes` | 39 | 0 |
| `animation:` | 46 | 0 |
| `transition:` | 109 | 0 |
| JS smooth scrolls | 5 | 0 |

- **Confetti and click-ripple removed at source, not animation-zeroed.** Both
  relied on `animationend` listeners to delete their own DOM nodes — confetti made
  **60 nodes per daily target hit**, the ripple one per click. Setting
  `animation:none` would have left them in the document forever. Both are now
  explicit no-ops so existing call sites still resolve; the
  "Daily target hit!" notification still fires.
- 38 rules left empty by the strip were removed.
- The dashboard bar-fill driver (width→0%, `requestAnimationFrame` back) is gone —
  it depended on a `transition:width` that no longer exists.

### 4. Colour stripped from data
- **12 duplicated subject-colour maps emptied to `{}`.** Every call site is
  `SUBJ_COLORS[id] || 'var(--o)'`, so all 16 lookups fall through to the neutral
  accent and **no call site needed editing**. That is why a change this large
  stayed low-risk.
- `TYPE_COLORS`, hardcoded work/class/break/gradient/extra-credit/brand colours →
  vars. Warning amber → `--warn`; error reds → `--err`.

**14 hex literals left in the whole app; 13 of them are the palette definition.**

### 5. Emoji — removed where removal is safe
Rule applied: **strip decoration, keep anything load-bearing.**

- **130 pictographs removed** across 43 distinct glyphs
  (📋 🎯 🔥 🍅 🎉 📄 📦 📸 🏖 🚴 🏃 🚶 📅 📊 📉 ✅ 📌 📂 ⏰ ✦ 📝 ☕ 😬 🧘 🧭 🏋 🔗 🌿 📈 📖 📚 ➕ 🗑 🎓 🔑 📎 ★ ⚠ 🖼 ✏ ✎ ⏳ …).
- **Kept, because removing them breaks controls:** `→ ← ↑ ↓ ▲ ▼ ✓ ✕ ● ↻ ↺`.
  `✓` is the CSS `content` for checked task boxes; `✕` is the attachment close
  button; `▲ ▼` are the reorder buttons; `●` is a status dot.
- **Kept `─`** — 8,435 of them, but they are the box-drawing character in code
  comment separators, not emoji.
- **Five emoji-only buttons replaced with inline SVG** (settings ×2, notification
  settings, notifications toggle, holiday). Deleting the glyph would have left
  **invisible buttons**. Icons are 15px, `stroke="currentColor"`, matching the
  existing sidebar-toggle SVG, so they inherit the palette automatically.
- `updateNotifBtn()` swapped emoji at runtime (`textContent=on?'🔔':'🔕'`). It now
  swaps `innerHTML` between two new `BELL_SVG` / `BELL_OFF_SVG` constants.
- **Structural icon holders removed entirely**, not just emptied: 7
  `.workout-summary-icon` spans (plus their fixed 22px CSS gutter, which would
  have left a blank column), the `feedbackEmoji` span and its assignments, and 8
  standalone icon divs in empty states.
- The overdue marker `'⚠ '` became `'! '` so the signal survives without a glyph.

### 6. Printable teacher report — untouched on purpose
The export report (from `<h2>Recent Sessions`, ~line 10240+) keeps its light theme
and colours. It is a document for print and for your teacher, not app chrome.
**Do not "finish the job" by greying it — that makes it worse on paper.**

### 7. iOS widget (`StudyTrack-Widget.js`)
- 11-entry `THEMES` map → one mono `T` palette matching `:root`.
- `st_theme` fetch removed from the `Promise.all` (5 reads, not 6).
- Emoji removed (`⚠️ Setup needed`, `⚠️ Sync error`, `🎉`); `●` and `✓` kept.

> **Git does not deploy this file.** It is a Scriptable script on your phone.
> You must open Scriptable and re-paste it by hand.

---

## Verification performed

| Check | Result |
|---|---|
| Inline `<script>` syntax, all 4 blocks | **0 errors** |
| CSS parse (`css-tree`, 68KB) | **0 errors, 0 empty rules** |
| HTML parse (`parse5`) | **0 errors** |
| Widget parse (as ES module — it uses top-level `await`) | **OK** |
| Dangling calls to the 11 deleted functions | **0** |
| Residual `data-theme` / `st_theme` / `greyscale` | **0** |
| Residual pictographs | **0** (only `→ ← ↑ ↓ ▲ ▼ ✓ ✕ ● ↻ ↺` remain) |
| Visual | New palette + motion-kill injected over the live app with real data: dark mono, readable, `--err` on MINIMUM, green sync dot intact. Injection removed, page reloaded. |

**Two real bugs were caught by these checks during the work:**
1. A bad replacement left a Python `and` operator inside a JS expression on the
   Subjects Spotlight bar. Repaired to `s.done||pct>=100?'var(--ok)':subjColor`.
2. The first widget syntax check failed misleadingly — `new Function` rejects
   top-level `await`. Re-checked as a module; the file is fine.

---

## Known limitations — stated, not hidden

- **Not verified in a real browser end-to-end.** The Chrome extension refuses
  `file://` and Playwright cannot install in the sandbox (sudo blocked).
  Verification was parser-level plus a CSS injection over the live site.
  **Click through all ten pages after deploying** — Dashboard, Log Hours, Progress,
  Subjects, Graduation, Timer, History, Tasks, AI Coach, Schedule.
- **A second animation layer was missed on the first pass and is now also gone.**
  The strip removed CSS `transition:` / `animation:` / `@keyframes`, but **not motion
  applied by JS property assignment** — `el.style.transition='width 1s …'` is not the
  CSS `transition:` token, so no text search for it matched. That left four visible
  animations Noah reported from device: the graduation bar, the subject bars, the
  history 7-day bars and the schedule day-swipe pane slide. Also removed in that pass:
  a 600ms `setInterval` count-up in `animateCount()`, 17 dead `animationDelay`
  assignments, the calendar-cell and pace-row entrance staggers, and two `setTimeout`
  delays (300ms / 450ms) on the tasks page that existed only to let exit animations
  finish. **If you ever audit motion in this file again, grep for `style.transition`
  and `style.animation` as well as the CSS tokens — they are separate surfaces.**

- **In-app notifications removed entirely (2026-08-06, later pass).** The bell,
  `.notif-badge`, the notification centre modal, the `#inapp-banner` slide-down and
  all eleven `*InAppNotif*` functions are gone, along with `checkInAppNotifs` and its
  60s `setInterval`. **Push is untouched** — it is scheduled separately and never
  went through `checkInAppNotifs`. The Notification Settings modal lost its "In-app"
  column (grid `1fr 60px 60px` → `1fr 60px`). `NOTIF_TYPES` went 12 → 10: `target_hit`
  and `streak_warn` were `inAppOnly:true` and had no push path, so with in-app gone
  they had no delivery mechanism at all. `st_inapp_notifs` in localStorage is now
  dead data.

- **Every orange value is gone (2026-08-06, later pass).** A "Button hover lift" CSS
  block still carried `box-shadow:0 6px 20px rgba(249,115,22,0.45)` — the original
  orange — which is the glow Noah saw around Save. Removed with 8 `translateY` hover
  lifts, a `scale(1.01)` grow on `.form-input:focus`, timer-bubble glows, and all
  remaining `rgba(249,115,22,…)` tints. `grep -c 'rgba(249,115,22'` is now **0**.

- **SVG icons: rendered, then fixed once already.** Noah checked the first build and
  reported two faults, both now corrected:
  1. **Icons were too dark.** `.btn-dark`, `.btn-notif` and `#btn-holiday` set no
     `color`, so `stroke="currentColor"` inherited a dim ancestor value. Emoji
     carried their own colour, so this never mattered before. All three now set
     `color:var(--text)`, and `renderHolidayBtn()` flips the icon to `var(--bg)`
     when the ON state paints the near-white `--o` background behind it.
  2. **The gear looked like a sun.** It was a circle with 8 radiating spokes —
     visually identical to the holiday sun icon sitting near it. Replaced with a
     sliders icon. Icons also went 15px/2.0 stroke → 16px/2.2 for legibility.

  **Still worth a glance:** the holiday button's ON state (dark icon on the light
  pill) has not been seen.
- **Stale `st_theme` / `st_greyscale` values remain** in Supabase and localStorage.
  Dead data; nothing reads either.
- **Shadows and border radii untouched.** Neither colour nor motion nor emoji.

---

## Next step

`CLAUDE-CODE-PROMPT-2026-08-06-monochrome-no-motion.md`, then re-paste the widget
into Scriptable.
