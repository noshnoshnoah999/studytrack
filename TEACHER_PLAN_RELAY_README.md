# StudyTrack — Teacher plan relay (GitHub Actions)

How the digital teacher gets a day's timetable into StudyTrack when its sandbox
can only do GET requests / file writes, never an outbound POST.

The teacher's sandbox **cannot** call `set_teacher_plan` directly (see
`WRITE_PATH_README.md` — that RPC needs a POST, and the teacher's shell/curl has
no outbound POST access). Instead, the teacher commits a plain JSON file to this
repo; a GitHub Actions workflow (`.github/workflows/teacher-plan-relay.yml`,
independent of `study-notify.yml`) notices it and does the actual POST
server-side, where there are no network restrictions.

```
teacher (git commit+push, GET/file-write only)
   → teacher-plan/pending/{YYYY-MM-DD}.json
   → GitHub Actions (unrestricted network)
   → POST set_teacher_plan(p_date, p_plan, token)
   → file moved to teacher-plan/processed/{YYYY-MM-DD}.json
```

---

## What the teacher needs to write

**Path:** `teacher-plan/pending/{YYYY-MM-DD}.json`

The filename **is** `p_date` — it must be exactly `YYYY-MM-DD.json` (e.g.
`2026-07-21.json`) or the relay will reject it.

**Contents:** exactly the `p_plan` shape `set_teacher_plan` expects — see
`WRITE_PATH_README.md` for the full spec. Summary:

```jsonc
{
  "generatedAt": "2026-07-21T06:55:00Z",   // ISO 8601 — when the plan was built
  "blocks": [
    {
      "start": "09:00",                    // "HH:MM" 24h
      "end": "10:30",                      // "HH:MM" 24h
      "subjectId": "algebra1",             // StudyTrack subject id, or null for non-study blocks
      "label": "Algebra 1",                // human label shown in the UI
      "type": "study",                     // "study" | "break" | "lunch" | "admin" | "work"
      "topic": "Quadratic equations",      // optional
      "firstAction": "Open ch.4 and do Q1–5"  // optional
    }
    // … more blocks …
  ]
}
```

Valid `subjectId` values: `japanese, cwp, english, english_11, english_12,
wa_hist, us_hist, civics, fine_art, pe, health, science, lab_sci, algebra1,
geometry, algebra2, el1, el2, el3, el4`. Use `null` for `break` / `lunch` /
`admin` / `work` blocks.

**To publish a day's plan, the teacher just needs to:**

1. Write that JSON to `teacher-plan/pending/{YYYY-MM-DD}.json` in this repo.
2. `git add`, commit, and push to `main`.

That's it — no network call, no token, no auth handling on the teacher's side.
The relay owns the Supabase write token and does the POST.

---

## What the relay does (this repo's side — already built)

On every push that touches `teacher-plan/pending/**`, on `workflow_dispatch`,
and every 30 minutes as a safety net (in case a push event is ever missed):

1. Looks for any `*.json` files under `teacher-plan/pending/`.
2. For each one:
   - Validates the filename is `YYYY-MM-DD.json` and the contents parse as
     JSON with an array `blocks` field.
   - Calls `set_teacher_plan(p_date, p_plan, token)` using the repo's
     `SB_SERVICE_KEY` for Supabase auth and a **separate** GitHub Actions
     secret, `SB_TEACHER_WRITE_TOKEN`, as the RPC's `token` body param (the
     same secret value that's configured in Supabase for that RPC).
   - **On success:** moves the file to `teacher-plan/processed/{same name}`
     and commits + pushes that move, so it's never re-applied.
   - **On failure:** leaves the file exactly where it was in `pending/` (so
     it's retried on the next run) and logs a clear `[RELAY] ✗ …` error in the
     Action's output. The job itself fails (red ✗ in the Actions tab) if any
     file failed that run, so failures are visible without having to read logs.

Each file is independent — one bad file doesn't block others in the same run.

Does **not** touch `study-notify.yml`'s notification logic (7:00 email,
pushes) — this is a new, separate workflow alongside it.

---

## One-time setup still needed before this goes live

`SB_TEACHER_WRITE_TOKEN` must be added as a GitHub Actions secret (Settings →
Secrets and variables → Actions → New repository secret), set to the **same**
write secret that's configured in `set_teacher_plan` in Supabase (the one from
`WRITE_PATH_README.md`'s setup step). Until that secret exists, the relay job
fails immediately with a clear message rather than silently doing nothing.

---

## Manual test — NOT yet run

⚠️ This has **not** been executed. This CLI session has no `gh` CLI and no
GitHub API token available, so it cannot trigger `workflow_dispatch` or read
back the Actions run — only `git push` (via the SSH/HTTPS credential already
configured for this repo) was available.

A sample `teacher-plan/pending/2026-07-21.json` has been committed to this
branch so the test is one click away, but someone with GitHub UI/API access
needs to actually run it:

1. Push/merge this branch (or push it as-is — `workflow_dispatch` works on
   any branch) so `teacher-plan-relay.yml` exists on GitHub.
2. Add the `SB_TEACHER_WRITE_TOKEN` secret if not already present (see setup
   section above) — the job will fail fast with a clear message if it's missing.
3. Actions tab → "Teacher Plan Relay" → Run workflow → pick this branch.
4. Confirm: the run is green, `teacher-plan/pending/2026-07-21.json` is now
   gone and `teacher-plan/processed/2026-07-21.json` exists (via a commit the
   workflow itself pushed), and `get_study_data('st_teacher_plan', token)`
   contains a `2026-07-21` entry matching the sample file's contents.

If step 4 doesn't hold, treat this as unverified and report back before it
gets used for real teacher output.
