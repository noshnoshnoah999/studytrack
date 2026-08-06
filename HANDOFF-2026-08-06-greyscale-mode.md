# HANDOFF — Greyscale Mode (2026-08-06)

**Status:** Implemented in working tree, browser-verified, NOT yet committed.
**File touched:** `studytrack-deploy/index.html` only (+66 / −1).
**Base commit:** `f11749f` (Fix the deadline the app measures me against)

---

## What was built

A **Greyscale** toggle in Goals & Settings, directly under the Theme carousel.
It is a **separate axis from theme**, not a 12th theme card.

- Slate + greyscale → dark monochrome
- Mint + greyscale → light monochrome

Persists to `st_greyscale` (`'1'` / `'0'`) in localStorage and cloud-syncs to
your other devices on the same path `st_theme` uses.

---

## Why a CSS filter and not a grey palette

This was the key design decision, and the obvious approach was wrong.

Adding a `[data-theme="greyscale"]` block of grey CSS variables — which is how
all 11 existing themes work — would only grey the variable-driven surfaces.
`index.html` contains **~554 hardcoded hex colours**. In particular `SUBJ_COLORS`
(`japanese:'#6366f1'`, `pe:'#22c55e'`, `health:'#ef4444'`, …) is **duplicated
verbatim across 10 separate function scopes** (lines ~2406, 2468, 4407, 5136,
5646, 6289, 7786, 7846, 8376, 9407), plus `TYPE_COLORS` and assorted chart
colours.

Result would have been a grey app with **rainbow subject chips, chart slices and
schedule blocks still in full colour**. That is a grey theme, not greyscale mode.

`filter:grayscale(1)` on the root desaturates everything downstream —
subject chips, charts, emoji, `icon.png` — in one line, with no risk of drifting
out of sync as new colours get added later.

---

## The risk that was checked, and the answer

CSS `filter` on an element makes it a **containing block for `position:fixed`
descendants**. This file has 12 `position:fixed` rules: `#sidebar`,
`#sidebar-toggle`, `.modal-overlay`, `#bottom-nav`, `.ai-input-wrap`,
`#timer-bubble`, `#inapp-banner`, toasts, the fullscreen error screen.

If that rule applied, bottom-anchored elements would have shifted, because
`<html>` measures **847px against an 802px viewport** on the live app — a 45px
gap that would have pushed the mobile bottom nav partly off-screen.

**It does not apply.** The containing-block rule has an explicit carve-out for
the **root element**. A filter on `html` still resolves fixed descendants
against the viewport. Verified empirically in Chrome against the live deployed
app (see below) — `<html>` is the one element where this is safe.

### Verification performed (2026-08-06, Chrome, live site)

| Test | Result |
|---|---|
| Bottom-anchored `position:fixed` probe, filter off → on | bottom `802` → `802`, **drift 0px** |
| `#bottom-nav` forced visible, filter off → on | top/bottom `750/802` → `750/802`, **drift 0px**, pinned to viewport |
| `#sidebar` geometry, filter off → on | `0,0,210×802` unchanged |
| `.modal-overlay` geometry, filter off → on | `0,0,1261×802` unchanged |
| Visual screenshot with filter on | full desaturation confirmed; sidebar, cards, progress bars, accents all grey |
| Inline `<script>` syntax check (all 4 blocks, `new Function`) | 0 errors |

Test artifacts were removed and the page reloaded. Nothing was written to
localStorage on the live site — `st_greyscale` read back as `null` afterwards.

---

## Changes, in order

1. **CSS rule** (~line 726, after the crimson theme block)
   `html[data-greyscale="1"]{filter:grayscale(1)}` plus a rule keeping the
   toggle's own "on" state readable (`--o` would otherwise grey out to near the
   track colour). Carries a comment explaining the containing-block caveat and
   the condition under which it must be re-tested.

2. **Pre-paint boot script** (~line 1221, inside the existing no-flash IIFE)
   Reads `st_greyscale` and sets `data-greyscale` before first paint, so the app
   never flashes in colour on load. **This is a deliberate duplicate of
   `applyGreyscale()` — the two must stay in sync**, exactly like the existing
   theme-migration map already duplicated there.

3. **Toggle markup** (~line 1626, Goals & Settings modal, under `#tc-preview`)
   Reuses the existing `.toggle-row` / `.toggle-switch` / `.toggle-slider`
   components. Applies **instantly on change**, matching how the theme carousel
   behaves — it does not wait for Save.

4. **JS** (~line 9200, after `updateThemeSwatches()`)
   `isGreyscale()`, `applyGreyscale()`, `setGreyscale(on)`, `updateGreyscaleToggle()`.
   `setGreyscale` persists, applies, and `sbPush`es silently.

5. **`openGoalSettings()`** — added `updateGreyscaleToggle()` so the switch
   reflects saved state when the modal opens.

6. **Load path** — `applyGreyscale()` added immediately after `applyTheme()`.

7. **Cloud sync** — `st_greyscale` added to the `syncFromCloud` `KEYS` array, plus
   an `else if(k==='st_greyscale')` pull branch mirroring the `st_theme` case.
   Accepts boolean or string from the cloud (`true`/`'1'`) for robustness.
   The existing `if(rows[i]&&rows[i].value!==undefined)` guard means a missing
   row on first run is skipped safely — no crash before the key exists.

---

## Known limitations (deliberate, not bugs)

- **`<meta name="theme-color">` is not greyed.** The PWA status-bar / browser
  chrome tint stays `#0f1923`. Filters do not affect browser chrome. Fixable by
  swapping the meta content in `setGreyscale`, left out to keep the diff small.
- **Theme carousel previews grey out too** while greyscale is on. Correct
  behaviour — you're seeing what you'd actually get — but worth knowing the
  swatches all look identical in that state.
- **Only the web app.** The native SwiftUI app at the StudyTrack root has no
  theming layer at all and was not touched.
- **iOS Safari repaint cost.** A root filter forces the whole page through a
  compositing pass. Not observed to be a problem on desktop; if scrolling feels
  worse on your phone with it on, that's the cause, and the fallback is scoping
  the filter to `#app` + each fixed element instead of `html`.

---

## Next step

Commit + push via Claude Code — see
`CLAUDE-CODE-PROMPT-2026-08-06-greyscale-mode.md`.

Then on-device check: open Settings on your phone, flip Greyscale on, confirm
the bottom nav sits flush at the bottom and the subject chips on the Subjects
page are grey rather than coloured. Then confirm it carried across to desktop.
