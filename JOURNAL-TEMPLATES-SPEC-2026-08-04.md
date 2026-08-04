# StudyTrack — Journal Content Templates (v2)

**Date:** 4 August 2026
**Status:** DRAFT FOR REVIEW — no code written yet
**Purpose:** Define the four journal templates the import feature will generate into the new **Journal Content** field.

---

## Background

Noah's coach confirmed that time spent *writing* the journal counts as study time and must be included. Fixed allowances agreed:

| Activity | Journal writing time |
|---|---|
| Cycling | 10 minutes |
| Running | 10 minutes |
| Walking | 10 minutes |
| Post-run stretches | 5 minutes |

This time is added to the **end** of the session (start time always matches the screenshot) and is stated explicitly in the journal so the gap versus the screenshot is self-explaining.

---

## How generation works

Claude does **not** write the journal. Claude returns structured JSON; StudyTrack's JavaScript assembles the template.

**Claude produces:** the metric values read off the screenshot, plus one free-text `reflection`.
**JavaScript produces:** all labels, all boilerplate, date formatting, the end time, the cycle number, the location, the weather, and the effort level.

Rationale: the format cannot drift between imports, changing the template later is a JS edit rather than a prompt rewrite, and the effort level stays consistent for identical inputs. It also means no personal health data (age, max HR) is ever sent to the Anthropic API.

---

## Effort level — computed in JavaScript from Noah's own Apple Watch zones

**VERIFIED 4 August 2026** from the Apple Watch Heart Rate settings (Automatic mode, heart rate reserve method):

- **Resting: 67 BPM**
- **Maximum: 197 BPM**

| Watch zone | Range | Effort level |
|---|---|---|
| Zone 1 | ≤143 | **Low** |
| Zone 2 | 144–156 | **Medium** |
| Zone 3 | 157–169 | **High** |
| Zone 4 | 170–182 | **Very High** |
| Zone 5 | 183+ | **Very High** |

These are Noah's real measured zones, not an estimate, so the earlier `220 − age` approach is dropped entirely. The boundaries are stored in `localStorage` and set once in Settings. **No age or heart-rate data is ever sent to the Anthropic API** — Claude returns `avgHR` as a bare number and the mapping happens on device.

> The zone boundaries sit at roughly 60/70/80/90% of heart rate reserve (197 − 67 = 130), which matches Apple's automatic zone model and confirms the screenshot was read correctly.

**⚠️ These zones are recalculated by the watch on the first of every month.** They will drift as fitness changes. The Settings field must be editable, and the values re-checked periodically — a stale zone table silently mislabels every journal.

**Consequence worth noting:** the 31 July run averaged 143 bpm, which falls in Zone 1 and therefore rates **Low**, not Medium as my earlier percentage-of-max estimate suggested. Using the real zones changed the answer. That is the whole argument for using them.

**When average heart rate is absent** (Strava feed screenshots), fall back to average speed:

| Cycling | Walking | Running | Effort level |
|---|---|---|---|
| Under 15 km/h | Under 4.5 km/h | Slower than 7:30/km | Low |
| 15–22 km/h | 4.5–6 km/h | 6:00–7:30/km | Medium |
| 22–28 km/h | Over 6 km/h | 5:00–6:00/km | High |
| Over 28 km/h | — | Faster than 5:00/km | Very High |

These thresholds are a starting point and should be adjusted once there is real data to compare against.

---

## Reflection rules

| Activity | Reflection included? |
|---|---|
| Running | Always |
| Cycling | Only if the ride is **15 minutes or longer** |
| Walking | Only if the walk is **15 minutes or longer** |
| Stretches | Never |

Threshold is **time only** — distance is ignored. This is what excludes short home-to-station rides.

The reflection is a short first-person diary entry that names the actual numbers. It must be different every time — no reused phrasing between journals.

---

## Reflection voice — from JOURNAL_STYLE.md

`JOURNAL_STYLE.md` (copied into this repo) defines how Noah actually writes. The condensed PE-relevant rules below go into the Sonnet 5 prompt. The rest of that document — book protocols, Japanese, academic registers — is not relevant here and is left out to keep input tokens down.

**Register (JOURNAL_STYLE.md line 31, "Cardio / PE"):** who he went with, route/area, **weather and how it affected the ride**, how he felt after, pics mentioned. Short — 3 to 6 sentences.

**Voice rules:**

- First person, chronological, plain everyday vocabulary. Do not reach for synonyms — repeated words are correct and should be kept.
- **British spellings**: kilometre, realised, organised, colour.
- Connectors Noah actually uses: "After that" (his most common), "Additionally", "This time", "Then", "Carrying on".
- **Banned**: "delve", "furthermore", "moreover", "overall, this was a valuable experience", "valuable insights". Note "Additionally" is a genuine Noah word and must NOT be stripped as an AI tell.
- **Do not write polished prose.** Sentences run simple and sometimes long or comma-spliced. Do not smooth everything into perfect grammar — but never insert deliberate errors either.
- Occasional warmth, sparingly: an exclamation mark when something landed.
- **Honest imperfection.** Never a flawless session. Say how it actually felt, including if it was hard, hot, or he was tired.
- **Mention the attachment casually** — "I included the screenshot from Runna!" — not as formal boilerplate.
- Afterthought closers are very Noah: a tacked-on extra detail at the end.
- No markdown headers, no emoji, no bullet lists inside the reflection.

**Weather must be worked into the reflection, not just listed as a metric.** The style document is explicit that Noah writes about weather *and how it affected the ride*. A 36.7°C drizzly cycle is a different experience from a 20°C clear one, and the reflection should say so.

### Continuity — signature habit #1, needs app support

JOURNAL_STYLE.md line 18 makes this Noah's most distinctive habit: he compares against last time and says what changed. *"last time I just blended the pieces instead of juicing, so I changed that this time"*, *"This time I remembered to blend the ginger for a lot longer"*. The document says: **when a subject has prior entries, always include one of these.**

Claude cannot do this from a screenshot alone — it has no memory of the previous run.

**Recommendation:** StudyTrack already holds every session in `st_sessions`. Before the API call, look up the most recent session of the same activity type and pass its key figures into the prompt:

```
Previous Run (28 July): 4.10 km, 26:32, 6:28/km, avg HR 158
```

Claude can then legitimately write "this was slower than my last run but that was the point" instead of inventing a comparison. This is cheap to implement, uses data already on device, and is the single biggest thing that will make the reflections read as Noah's rather than as generated text.

---

## Location rules

| Activity | Source |
|---|---|
| Cycling | Hardcoded "Urayasu Area" (Strava agrees) |
| Running | Defaults to "Urayasu Area", **editable** |
| Walking | Read from the Strava screenshot |

**Why running is hardcoded:** Runna reported "Tokyo, Chiyoda, Japan" for a run actually done in Urayasu. Runna's location cannot be trusted and is ignored.

Weather uses a single fixed Urayasu coordinate for all activities — Urayasu and central Tokyo are ~10 km apart, well inside the noise for temperature.

---

## Weather source — VERIFIED 4 August 2026

**Endpoint:** `https://archive-api.open-meteo.com/v1/archive`
**Parameters:** `latitude=35.6528&longitude=139.9022&start_date=&end_date=&hourly=temperature_2m,weather_code&timezone=Asia/Tokyo`

Free, no API key, no account.

Two things tested live in a browser:

1. **No reanalysis lag.** Data was present for 1, 2 and 3 August when queried on 4 August. My earlier concern that historical weather archives lag several days behind was wrong for this endpoint — same-day and previous-day imports work.
2. **CORS passes.** A cross-origin `fetch()` from `https://example.com` returned HTTP 200 with full JSON. StudyTrack can call it directly from the browser with no proxy.

Pick the hourly reading nearest the activity start time.

`weather_code` is a WMO 4677 code, mapped to plain words per Open-Meteo's published table:

| Code | Wording |
|---|---|
| 0 | Clear |
| 1 | Mainly Clear |
| 2 | Partly Cloudy |
| 3 | Overcast |
| 45, 48 | Fog |
| 51, 53, 55 | Light / Moderate / Heavy Drizzle |
| 61, 63, 65 | Light / Moderate / Heavy Rain |
| 71, 73, 75 | Light / Moderate / Heavy Snow |
| 80, 81, 82 | Rain Showers |
| 95, 96, 99 | Thunderstorm |

If the call fails, the weather line is omitted silently rather than printing a placeholder.

---

# TEMPLATE 1 — CYCLING

```
{Ordinal Date} - {Daypart} Cycle {N}
Journal Writing Time (Included as Study Time): 10 Minutes

{Weekday} {Ordinal Date} {Year}
Start Time: {HH:MM}
End Time: {HH:MM}
Total Time: {M} Minutes {S} Seconds of cycling + 10 Minutes of journal writing = {TOTAL} Minutes

Urayasu Area
I parked at the JR Shin-Urayasu Bicycle Parking Lot Number 2
Weather at the time of the cycle: {T}°C | {Condition}
Used Strava App for Tracking the Route

Distance: {X} Kilometres and {Y} Meters ({D} KM)
Elevation Gain: {E} Meters
Average Speed: {V} km/h
{Calories: {C} kcal — activity page only}
{Average Heart Rate: {H} bpm — activity page only}

Effort Level: {Low|Medium|High|Very High}

Reflection: {first-person entry — omitted entirely if under 15 minutes}

I included the screenshot from Strava which tracked my route, so you can check all the numbers above match.
Strava's GPS is sometimes a bit off, but the map in the screenshot should give a rough idea of where I cycled.
```

### Worked example — the 1 August screenshot

```
1st August - Afternoon Cycle 2
Journal Writing Time (Included as Study Time): 10 Minutes

Saturday 1st August 2026
Start Time: 15:32
End Time: 15:52
Total Time: 10 Minutes 29 Seconds of cycling + 10 Minutes of journal writing = 20 Minutes

Urayasu Area
I parked at the JR Shin-Urayasu Bicycle Parking Lot Number 2
Weather at the time of the cycle: 36.7°C | Light Drizzle
Used Strava App for Tracking the Route

Distance: 2 Kilometres and 50 Meters (2.05 KM)
Elevation Gain: 5 Meters
Average Speed: 11.7 km/h

Effort Level: Low

I included the screenshot from Strava which tracked my route, so you can check all the numbers above match.
Strava's GPS is sometimes a bit off, but the map in the screenshot should give a rough idea of where I cycled.
```

No reflection — the ride was 10m 29s, under the 15-minute threshold. This is exactly the station-run case.

---

# TEMPLATE 2 — RUNNING

```
{Ordinal Date} - {Daypart} Run
Journal Writing Time (Included as Study Time): 10 Minutes

{Weekday} {Ordinal Date} {Year}
Start Time: {HH:MM}
End Time: {HH:MM}
Total Time: {M} Minutes {S} Seconds of running + 10 Minutes of journal writing = {TOTAL} Minutes

{Location — defaults to Urayasu Area}
Weather at the time of the run: {T}°C | {Condition}
Used the Runna App for Tracking the Route, recorded on my Apple Watch

Distance: {X} Kilometres and {Y} Meters ({D} KM)
Average Pace: {P} per kilometre
Elevation Gain: {E} Meters
Average Heart Rate: {H} bpm
Cadence: {CAD} steps per minute
Calories Burned: {C} kcal

Effort Level: {Low|Medium|High|Very High}

Reflection: {first-person entry — always included}

I included the screenshot from Runna which tracked my route, so you can check all the numbers above match.
The GPS is sometimes a bit off, but the map in the screenshot should give a rough idea of where I ran.
```

### Worked example — the 31 July screenshot

```
31st July - Evening Run
Journal Writing Time (Included as Study Time): 10 Minutes

Friday 31st July 2026
Start Time: 20:49
End Time: 21:26
Total Time: 27 Minutes 10 Seconds of running + 10 Minutes of journal writing = 37 Minutes

Urayasu Area
Weather at the time of the run: 29.1°C | Overcast
Used the Runna App for Tracking the Route, recorded on my Apple Watch

Distance: 3 Kilometres and 260 Meters (3.26 KM)
Average Pace: 8:20 per kilometre
Elevation Gain: 12 Meters
Average Heart Rate: 143 bpm
Cadence: 129 steps per minute
Calories Burned: 128 kcal

Effort Level: Low

Reflection: This was my first walk-run back after having some time off, so I did not want to push
it too much. I kept the pace slow at 8:20 per kilometre and my heart rate stayed at 143 on average
which is still zone 1 for me, so it never really got hard. It was still 29 degrees even at that
time of night which made it feel a lot warmer than it should have for an easy run. My legs felt
alright after, a bit stiff but nothing bad. After that I did my stretches. I included the
screenshot from Runna!

I included the screenshot from Runna which tracked my route, so you can check all the numbers above match.
The GPS is sometimes a bit off, but the map in the screenshot should give a rough idea of where I ran.
```

**Note:** Runna's screen shows a single timestamp (`31 Jul 2026 at 20:49`), not a range. The end time must be computed as start + floored duration. The current app prompt wrongly expects `HH:MM - HH:MM` from Runna and would fail on this screenshot.

---

# TEMPLATE 3 — WALKING

```
{Ordinal Date} - {Daypart} Walk
Journal Writing Time (Included as Study Time): 10 Minutes

{Weekday} {Ordinal Date} {Year}
Start Time: {HH:MM}
End Time: {HH:MM}
Total Time: {M} Minutes {S} Seconds of walking + 10 Minutes of journal writing = {TOTAL} Minutes

{Location from the Strava screenshot}
Weather at the time of the walk: {T}°C | {Condition}
Used Strava App for Tracking the Route

Distance: {X} Kilometres and {Y} Meters ({D} KM)   ← under 1 km: {Y} Meters ({D} KM)
Steps: {STEPS}
{Elevation Gain: {E} Meters — activity page only}
Average Speed: {V} km/h

Effort Level: {Low|Medium|High|Very High}

Reflection: {first-person entry — omitted entirely if under 15 minutes}

I included the screenshot from Strava which tracked my route, so you can check all the numbers above match.
Strava's GPS is sometimes a bit off, but the map in the screenshot should give a rough idea of where I walked.
```

### Worked example — the 3 August screenshot

```
3rd August - Afternoon Walk
Journal Writing Time (Included as Study Time): 10 Minutes

Monday 3rd August 2026
Start Time: 15:57
End Time: 16:17
Total Time: 10 Minutes 34 Seconds of walking + 10 Minutes of journal writing = 20 Minutes

Chuo, Tokyo
Weather at the time of the walk: 26.7°C | Mainly Clear
Used Strava App for Tracking the Route

Distance: 860 Meters (0.86 KM)
Steps: 1,100
Average Speed: 4.9 km/h

Effort Level: Medium

I included the screenshot from Strava which tracked my route, so you can check all the numbers above match.
Strava's GPS is sometimes a bit off, but the map in the screenshot should give a rough idea of where I walked.
```

No reflection — 10m 34s, under the threshold.

**Open question:** `Distance: 0 Kilometres and 860 Meters` reads awkwardly. Suggest collapsing to `860 Meters (0.86 KM)` when under 1 km.

---

# TEMPLATE 4 — POST-RUN STRETCHES

No reflection, no first-person summary, **no effort level**. Content is fixed, drawn from *Runner's Stretch Guide*. The journal describes the **post-run** stretches; the attached PDF is a single file covering both parts, which is fine.

```
{Ordinal Date} - After Run Stretches
Journal Writing Time (Included as Study Time): 5 Minutes

{Weekday} {Ordinal Date} {Year}
Start Time: {HH:MM}
End Time: {HH:MM}
Total Time: 20 Minutes of stretching + 5 Minutes of journal writing = 25 Minutes

Completed my post-run cool-down routine from my Runner's Stretch Guide, which I have attached.
I also complete the guide's pre-run dynamic warm-up before I set off running. The guide's
suggested timings are approximate; I move through the poses more slowly than that, so the two
parts together come to around 20 minutes in practice.

POST-RUN COOL-DOWN
Moved gently within each pose, breathing slowly, without forcing anything.
1. Pigeon Pose, both sides — hips, glutes
2. Toe and Arch Stretch — toes, arches, soles of the feet
3. Deep Lunge, both sides — hips, groin
4. Quad and Hip Flexor Stretch in the Lunge — quads, hip flexors
5. Sphinx Pose / Upward-Facing Dog — abdominals, chest, hip flexors, lower back
6. Seated Wide-Leg Stretch — inner thighs, groin, hips

Source: Run Better with Ash — "5 MIN Pre-Run Stretching Routine" and
"10 MIN Post-Run Stretching Routine," YouTube.

Please check the attached Runner's Stretch Guide PDF, which lists every stretch in this routine.
```

### Why it reads this way

The journal body is the post-run cool-down, as agreed. The single line acknowledging the pre-run warm-up does two jobs: it accounts for the full 20 minutes logged (the cool-down alone is only ~10 minutes in the guide, so listing it on its own against a 20-minute session would look inflated), and it keeps the chronology straight — the warm-up is stated as happening *before* the run, not inside a session that starts afterwards.

---

## JSON contract Claude returns

```json
{
  "app": "Strava | Runna",
  "activity": "Cycle | Run | Walk",
  "date": "YYYY-MM-DD",
  "startTime": "HH:MM",
  "durationSeconds": 629,
  "distanceKm": 2.05,
  "elevationGainM": 5,
  "steps": null,
  "avgPace": null,
  "avgHR": null,
  "cadence": null,
  "calories": null,
  "locationLabel": "Urayasu, Chiba Prefecture",
  "reflection": "..."
}
```

Anything not visible on the screenshot returns `null` — never a guess. JavaScript omits any line whose value is null.

`max_tokens` must rise from the current **120** to around **1000**.

---

## Open items

| # | Item | Status |
|---|---|---|
| 1 | Noah's heart rate zones | **RESOLVED 4 Aug** — real Apple Watch zones captured; resting 67, max 197 |
| 2 | Open-Meteo endpoint (lag + CORS) | **VERIFIED 4 Aug** — no lag, CORS passes, HTTP 200 cross-origin |
| 3 | Sonnet 5 model ID | **CONFIRMED** as `claude-sonnet-5` in Anthropic's docs. Not yet tested from StudyTrack itself — keep a Haiku fallback |
| 4 | Stretches chronology and effort level | RESOLVED 4 Aug — effort level removed, cool-down is the body, warm-up acknowledged in one line |
| 5 | Sub-1km distance wording | RESOLVED 4 Aug — `860 Meters (0.86 KM)` |
| 6 | Speed-based effort thresholds | Provisional — only used when HR is absent, which should now be rare |
| 7 | Fahrenheit | RESOLVED 4 Aug — removed, Celsius only |
| 8 | Per-stretch minute timings | RESOLVED 4 Aug — removed from the list |
| 9 | Reflection length | RESOLVED 4 Aug — ~4 sentences approved |
| 10 | Weather API failure behaviour | RESOLVED — omit the line silently |
| 11 | Stretches session start time | RESOLVED 4 Aug — 5 minutes after the run session ends, *including* its journal writing time |
| 12 | Clock times in the contents box | **RESOLVED 4 Aug — PE is the exception.** Times stay in, because the +10 journal minutes need the arithmetic shown. JOURNAL_STYLE.md line 3 applies to teacher-drafted subjects, not PE. |
| 13 | "Who I went with" | **OPEN** — style doc lists it in the PE register but it isn't on any screenshot. Omitted for now; add a manual field later if Noah wants it. |
| 14 | Closing boilerplate tone | RESOLVED 4 Aug — GPS caveat kept (real information), other two lines softened to match the style doc. Accepted cost: slight tone shift vs older journals. |
| 15 | Previous-session continuity data | **APPROVED 4 Aug** — pass the most recent same-activity session from `st_sessions` into the prompt for all activity types. |

**The weather figures in the worked examples are real**, fetched live from Open-Meteo on 4 August 2026 for the correct dates, times and coordinates. They are not placeholders.
