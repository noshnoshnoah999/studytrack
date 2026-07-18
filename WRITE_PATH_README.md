# StudyTrack — Teacher write path (`set_teacher_plan`)

How the digital teacher pushes a day's study timetable into StudyTrack.

The teacher writes into a single sync key, **`st_teacher_plan`**, via a token-gated
Supabase RPC. StudyTrack pulls that key on every sync and, when a plan exists for
**today**, uses it for the Home "Today's Plan" card, the Now/Next banner, the timer
subject pre-select, and all notifications (7:00 email + push) — falling back to the
regular `st_sched` schedule only when there is no plan for today.

This is the write-side counterpart of the existing read-only `get_study_data(k, token)`
RPC. It uses a **different secret** (`{WRITE_TOKEN}`) — the read token cannot write.

---

## Endpoint

```
POST https://epaiazxcdcseijkhrncm.supabase.co/rest/v1/rpc/set_teacher_plan
```

## Headers

| Header          | Value                                               |
| --------------- | --------------------------------------------------- |
| `apikey`        | `sb_publishable_p42tVK6brqvDyfx-YeAUrQ_4gzvryni`    |
| `Authorization` | `Bearer sb_publishable_p42tVK6brqvDyfx-YeAUrQ_4gzvryni` |
| `Content-Type`  | `application/json`                                  |

The publishable key maps to the `anon` role; the RPC is `GRANT`ed to `anon`. The
real access check is the `token` in the body, not the API key.

## Body parameters

| Param     | Type     | Required | Description                                                                 |
| --------- | -------- | -------- | --------------------------------------------------------------------------- |
| `p_date`  | `string` | yes      | The day this timetable is for, `YYYY-MM-DD`. Must be a real calendar date.  |
| `p_plan`  | `object` | yes      | The plan for that day: `{ "generatedAt": ISO8601, "blocks": [ … ] }`.       |
| `token`   | `string` | yes      | The write secret (`{WRITE_TOKEN}`). Different from the read token.          |

### `p_plan` shape

```jsonc
{
  "generatedAt": "2026-07-18T06:55:00Z",   // ISO 8601 — when the plan was built
  "blocks": [
    {
      "start": "09:00",                    // "HH:MM" 24h
      "end": "10:30",                      // "HH:MM" 24h
      "subjectId": "algebra1",             // StudyTrack subject id, or null for non-study blocks
      "label": "Algebra 1",                // human label shown in the UI
      "type": "study",                     // "study" | "break" | "lunch" | "admin" | "work"
      "topic": "Quadratic equations",      // optional — what to work on
      "firstAction": "Open ch.4 and do Q1–5"  // optional — the concrete first step (shown when a block is expanded)
    }
    // … more blocks …
  ]
}
```

Valid `subjectId` values are the StudyTrack subject ids, e.g.
`japanese, cwp, english, english_11, english_12, wa_hist, us_hist, civics, fine_art,
pe, health, science, lab_sci, algebra1, geometry, algebra2, el1, el2, el3, el4`.
Use `null` for `break` / `lunch` / `admin` / `work` blocks.

## Behaviour

- Merges `{ p_date: p_plan }` into the existing `st_teacher_plan` object — pushing one
  day does **not** wipe the others.
- Automatically prunes any dates older than 14 days, so the object stays small
  (~14 most recent days).
- Only ever writes the `st_teacher_plan` key; it is impossible to write any other key
  through this RPC.
- Returns the full merged `st_teacher_plan` object on success.

---

## Example (curl)

```bash
curl -sS -X POST \
  'https://epaiazxcdcseijkhrncm.supabase.co/rest/v1/rpc/set_teacher_plan' \
  -H 'apikey: sb_publishable_p42tVK6brqvDyfx-YeAUrQ_4gzvryni' \
  -H 'Authorization: Bearer sb_publishable_p42tVK6brqvDyfx-YeAUrQ_4gzvryni' \
  -H 'Content-Type: application/json' \
  -d '{
    "p_date": "2026-07-18",
    "token": "{WRITE_TOKEN}",
    "p_plan": {
      "generatedAt": "2026-07-18T06:55:00Z",
      "blocks": [
        { "start": "09:00", "end": "10:30", "subjectId": "algebra1", "label": "Algebra 1",
          "type": "study", "topic": "Quadratic equations", "firstAction": "Open ch.4, do Q1–5" },
        { "start": "10:30", "end": "10:45", "subjectId": null, "label": "Break", "type": "break" },
        { "start": "10:45", "end": "12:00", "subjectId": "japanese", "label": "Japanese",
          "type": "study", "topic": "Kanji review", "firstAction": "Run today’s Anki deck" },
        { "start": "12:00", "end": "13:00", "subjectId": null, "label": "Lunch", "type": "lunch" }
      ]
    }
  }'
```

### Success

```json
{ "2026-07-18": { "generatedAt": "2026-07-18T06:55:00Z", "blocks": [ … ] } }
```

### Errors (HTTP 400, `{"message": "..."}`)

| Message                                    | Cause                                              |
| ------------------------------------------ | -------------------------------------------------- |
| `unauthorized`                             | Missing/incorrect `token`.                         |
| `invalid date format (expected YYYY-MM-DD)`| `p_date` is not `YYYY-MM-DD`.                       |
| `invalid calendar date: …`                 | `p_date` is well-formed but not a real date.       |
| `p_plan is required`                       | `p_plan` was null/omitted.                         |

---

## Setup (one-time)

1. Open `SUPABASE_WRITE_RPC.sql`, replace `WRITE_SECRET_HERE` with a strong random
   secret (this becomes `{WRITE_TOKEN}`) — **must differ from the read token**.
2. Run the whole file once in the Supabase SQL editor.
3. Give the digital teacher the endpoint, the publishable `apikey` above, and
   `{WRITE_TOKEN}`.
