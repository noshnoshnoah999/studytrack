# Handoff — Base sync to 2026-08-06 teacher report (migration v15)

**Date:** 2026-08-06 (Thursday)
**File touched:** `studytrack-deploy/index.html` (one insertion, ~73 lines)
**Status:** written and syntax-verified in Cowork. NOT yet committed — see Claude Code prompt.

## What changed

Added `st_migration_v15_base_recalib_aug06_2026`, inserted directly after the v14 block
and before the `st_migration_v7` block. It syncs each non-elective subject's `base` hours
to the TIHS progress report dated 2026-08-06.

Mechanism is an exact copy of v14, including the `REPORT_DATE` guard:

```
base = teacherTotal - (sum of session hours where session.date <= '2026-08-06')
base = max(0, base)   // clamped, with a console.warn if it would have gone negative
```

The date guard is the important part. Without it, any session logged after the report date
gets absorbed into the subtraction and vanishes from the displayed total. Anything Noah
logs from 2026-08-07 onward stays additive on top of the teacher figure.

## Values (Time column, hh:mm, converted to decimal hours)

| Subject   | Teacher (hh:mm) | Decimal | Was (v14) | Delta  |
|-----------|-----------------|---------|-----------|--------|
| japanese  | 52:30           | 52.5    | 44.8      | +7.7   |
| cwp       | 14:30           | 14.5    | 13.2      | +1.3   |
| english   | 4:36            | 4.6     | 4.0       | +0.6   |
| wa_hist   | 16:36           | 16.6    | 15.1      | +1.5   |
| us_hist   | 24:30           | 24.5    | 24.2      | +0.3   |
| civics    | 2:06            | 2.1     | 1.7       | +0.4   |
| fine_art  | 51:00           | 51.0    | 45.7      | +5.3   |
| pe        | 130:42          | 130.7   | 115.5     | +15.2  |
| health    | 16:18           | 16.3    | 13.3      | +3.0   |
| science   | 0:00            | 0       | 0         | —      |
| lab_sci   | 2:18            | 2.3     | 2.0       | +0.3   |
| algebra1  | 0:00            | 0       | 0         | —      |

All twelve hh:mm → decimal conversions were verified exact programmatically. They also
match the report's own `学習時間合計` decimal column on every row.

## Deliberately NOT changed

- **`req` values.** The teacher's Google Sheet caps every contract at 150:00 or 75:00
  because of a tool limitation on her end. The app's real requirements — PE 225h,
  Japanese 450h — are correct. Only `base` is ever synced from a teacher report.
- **Electives (el1–el4).** Excluded, same as v13 and v14. El4 in particular must stay
  `base: 0` and be driven entirely by sessions (see migration v11 / the El4 base bug).
  Noah confirmed on 2026-08-06: "do not worry about electives anymore."

## Verification done

- All 4 inline `<script>` blocks in `index.html` pass `node --check`.
- All 12 time conversions checked against exact arithmetic — zero mismatches.

## Open item worth raising (NOT fixed here)

`DEFAULT_SUBJECTS` at index.html:2307 still holds pre-v13 base values (japanese 37.5,
pe 50.1, fine_art 28.9, english 3.3, …). Every migration including v15 guards on
`if(raw)` — i.e. it only runs when `st_subjs` already exists in localStorage. A genuinely
fresh install therefore seeds the stale defaults, sets all migration flags, and never
corrects them. In practice the Supabase pull probably overwrites the seed, so this may be
invisible; offline or if the pull fails, it would not be.

Fixing it is not a one-line edit: the correct seed value is `teacherTotal − allSessions`,
which depends on Noah's live session data, so setting the seeds to the raw teacher totals
would double-count. Left alone deliberately. Worth a proper look in a separate session.
