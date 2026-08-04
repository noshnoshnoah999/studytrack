# HANDOFF — Journal Import v2 (workout screenshots)

**Date:** 4 August 2026
**File changed:** `studytrack-deploy/index.html` (only)
**Backup:** `studytrack-deploy/archive/index-BACKUP-before-journal-v2-20260804-104547.html`
**Status:** Implemented, syntax-checked, builders unit-tested against three real screenshots. **Not yet tested live on device.**

---

## Why

Noah's coach confirmed that the time spent *writing* the journal counts as study time and must be included. The import feature previously extracted only start/end times and wrote a one-line note. It now produces a full journal, adds the journal-writing time to the session, and sends that journal to the Google Form.

Design spec with all four templates and worked examples: `JOURNAL-TEMPLATES-SPEC-2026-08-04.md`
Noah's writing-voice reference: `JOURNAL_STYLE.md`

---

## What changed

### 1. New "Journal Content" field
- Multi-line `<textarea id="log-journal">` under the existing Notes input, with a Copy button.
- `log-notes` stays a single-line input and still receives the same title, e.g. `1st August - Afternoon Cycle 2`.
- Saved on the session as `journal`; metrics saved as `journalMeta`.
- **History, the PDF report and the coach report are untouched** — they all read `s.notes` only.

### 2. Source picker before the API call
- Pasting or choosing an image no longer fires the API immediately. It asks **Strava or Runna**; if Strava, then **Cycle or Walk**. Runna skips the second question (running only).
- Nothing is uploaded until a choice is made.
- Spinner moved outside the upload/source containers so it stays visible during the call.

### 3. King of Time removed
- The KOT paragraph is gone from the vision prompt and the `isKOT` branch is gone from `useWorkoutResult()`.
- **Electives 4 is untouched** — subject, hours, Google Form and graduation maths all intact. Only the screenshot handling was removed.

### 4. Journal writing time
- Run 10 min, Cycle 10 min, Walk 10 min, Stretches 5 min (`JOURNAL_MINUTES`).
- Added to the **end** time. Start always matches the screenshot so it can be checked against the proof.
- The journal states the arithmetic explicitly: `10 Minutes 29 Seconds of cycling + 10 Minutes of journal writing = 20 Minutes`.

### 5. Effort level — computed on device
- Uses Noah's real Apple Watch zones (resting 67, max 197): Z1 ≤143 Low, Z2 144–156 Medium, Z3 157–169 High, Z4/Z5 170+ Very High.
- Editable in Settings. **The watch recalculates these on the 1st of each month.**
- Falls back to speed thresholds only when the screenshot has no heart rate.
- **No heart-rate or age data is ever sent to the Anthropic API.**

### 6. Weather
- Open-Meteo historical archive, no API key. Verified 4 Aug 2026: CORS passes from the browser, and there is no reanalysis lag.
- Fixed coordinate 35.6528, 139.9022 (Shin-Urayasu) for all activities.
- WMO codes mapped to plain words. If the call fails the line is omitted silently — never guessed.

### 7. Reflection
- Runs always. Cycles and walks only when **15 minutes or longer, time only, distance ignored**.
- Written in Noah's voice using rules condensed from `JOURNAL_STYLE.md`: British spellings, "After that", banned AI words, deliberately unpolished, honest about how it felt, weather tied to how it affected the session.
- The previous same-activity session is passed into the prompt so Claude can make Noah's signature "last time… this time…" comparison with real numbers.

### 8. Model
- **Primary `claude-sonnet-5`**, `max_tokens` raised 120 → 1000.
- Falls back to `claude-haiku-4-5-20251001` on a 404/400, and shows a toast saying so — it never degrades silently.

### 9. Stretches
- Starts 5 min after the run session ends *including* its journal padding. Basing it on the raw workout end would overlap the run session and double-count hours.
- 20 min stretching + 5 min journal = 25 min.
- Fixed content from the stretch guide PDF — **no model call at all**. No reflection, no effort level.

---

## Verification done

`node --check` passes on all five script blocks. Builder functions unit-tested in Node against the three real screenshots; all outputs matched the spec exactly.

| Check | Result |
|---|---|
| Cycle 1 Aug: end 15:32 → 15:52 | ✅ |
| Run 31 Jul: end 20:49 → 21:26 | ✅ |
| Walk 3 Aug: end 15:57 → 16:17 | ✅ |
| HR 143 → Low, 144 → Medium, 157 → High, 170 → Very High | ✅ |
| Sub-1km → `860 Meters (0.86 KM)` | ✅ |
| Exact 1 km → `1 Kilometre (1 KM)` | ✅ (bug found and fixed in testing) |
| Short cycle/walk → no reflection | ✅ |
| Weekdays Sat/Fri/Mon | ✅ |

**Two defects found by the test and fixed:**
1. `1 Kilometre and 0 Meters` — now collapses to `1 Kilometre`.
2. The reflection prompt told Claude to mention the screenshot, which the closing boilerplate also does — it appeared twice. The prompt now forbids it.

---

## NOT verified — test these first

1. **`claude-sonnet-5` from the app.** Confirmed as the correct string in Anthropic's docs, but this exact model ID reportedly 404'd during the AI Coach rewrite. Cannot be tested without the API key. If it 404s, the Haiku fallback fires and a toast says so.
2. **Google Form prefill length.** The journal is roughly 1,000–1,400 characters, URL-encoded into `entry.706383331`. Browsers handle far longer URLs, but Google's own limit is untested. **If the form opens with an empty Contents box, this is why** — the fix is to copy from the app instead (the Copy button exists for this).
3. **Real screenshot → real API round trip.** Everything downstream of the model was tested with mock data.
4. Supabase sync of the enlarged session objects.

---

## Known trade-offs

- A reflection is requested for every import and then discarded for short cycles and walks, because the duration isn't known until the response arrives. Slightly wasteful in output tokens; the alternative is two API calls, which is worse.
- The weather call runs after the model call (it needs the date), adding a second or two.
- **`exportJSON()` deliberately keeps `journal` and `journalMeta`.** That file is a restore point, and stripping fields would silently destroy every journal on restore. The "show notes only" rule is enforced on all teacher-facing output instead. Flagged to Noah — reverse it if he disagrees.
- Auto cycle numbering counts logged sessions, so an unlogged ride would throw it off. The number is editable before generating.

---

---

# v2.1 — FIX: trust the title, not the timestamp (same day, after device testing)

Noah tested v2 with the 1 August cycle screenshot. Two bugs, one root cause: **the app trusted Strava's relative timestamp and its own session count instead of the title Noah wrote.**

### Bug 1 — wrong date, therefore wrong weather
The screenshot's feed header reads `Yesterday at 15:32`. That is relative to when the **screenshot was taken** (2 August), not when the ride happened (1 August). Today being 4 August, the model resolved "Yesterday" to 3 August.

The title said `1st August - Afternoon Cycle 2` all along.

Because the weather is looked up from the parsed date, it fetched 3 August (26.7°C, Mainly Clear) instead of 1 August (36.7°C, Light Drizzle). Wrong day, wrong weather, wrong journal.

### Bug 2 — wrong cycle number
The title said `Cycle 2`. The app ignored it and derived the number by counting logged PE sessions on that date. Noah had logged nothing for August yet — he was waiting for this feature — so it produced `1`.

Counting logged sessions can only ever work if every earlier ride was logged. That assumption was wrong on the very first real use.

### The fix
- The model now returns `activityTitle` — the on-screen title, copied verbatim.
- `_parseTitleDate()` and `_parseTitleNumber()` parse it **in JavaScript**, not in the model.
- The title date overrides the timestamp date, and this happens **before** the weather lookup.
- The title number overrides the session count; the session count is now only a fallback when the title has no number.
- Both remain editable before generating.
- The summary card now states where the date came from: `(from your title, not "3rd August")`, or an orange `(no date in title — from the timestamp, check this)` when it had to fall back.

### Year inference
Titles carry no year. The year is chosen so the date isn't in the future, which handles a late-December ride logged in early January. An explicit year in the title wins outright.

### Tests — 10/10 pass
| Title | Date | Number |
|---|---|---|
| `1st August - Afternoon Cycle 2` | 2026-08-01 | 2 |
| `1st August - Afternoon Cycle` | 2026-08-01 | null |
| `31st July - Evening Run` | 2026-07-31 | null |
| `Afternoon Ride` (Strava default) | null → timestamp | null |
| `Your First Walk Run Back` (Runna default) | null → timestamp | null |
| `28th December - Morning Cycle 3` (today 4 Aug 2026) | 2025-12-28 | 3 |
| `1 August - Afternoon Cycle 10` | 2026-08-01 | 10 |
| `31st February - Morning Run` | null (rejected) | null |
| `2nd August 2025 - Evening Run` | 2025-08-02 | null |

### Still true
A screenshot with **no** date in its title still falls back to the relative timestamp, which is only correct if imported promptly. The summary card now warns in orange when that happens.

---

## Settings added

- Heart Rate Zones — four boundary fields (Z2/Z3/Z4/Z5 start).
- Default Run / Cycle Location — defaults to "Urayasu Area", because Runna reports the wrong ward.

Stored in `localStorage` as `st_hr_zones` and `st_workout_location`. Neither leaves the device.
