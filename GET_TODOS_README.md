# StudyTrack — GET-compatible todos read path (`get_todos_get`)

How the digital teacher session (the GET-only chat tool) reads today's todos.

## Why this exists

The existing read RPC, `get_study_data(k, token)`, is POST-only — PostgREST
functions take their arguments in a JSON body, and there's no query-string
form for an arbitrary-key read. The digital teacher session's tool
(`web_fetch`-style) only sends GET requests, so it was never able to call
`get_study_data` correctly. Every "read," including this morning's, was
silently failing or falling back to something that wasn't a real database
read — it just wasn't visible until we checked.

`get_todos_get` is a second, narrower function built specifically for that
GET-only caller. It does **not** replace or modify `get_study_data` — that
function is untouched and still used by the app and by anyone with a
POST-capable tool.

## Setup (one-time, in Supabase)

1. Open `SUPABASE_GET_TODOS_RPC.sql`, replace `GET_READ_SECRET_HERE` with a
   new, strong random secret. **Do not reuse the existing `get_study_data`
   read token.** Generate one with `openssl rand -hex 20` in a terminal, or
   your password manager's random-string generator — paste it directly into
   the SQL file, never into a chat session.
2. Run the whole file once in the Supabase SQL editor.
3. Give the digital teacher session: the endpoint URL below, the anon
   `apikey` (same public key already used elsewhere in this app — safe to
   share, it's gated by RLS/the function's own token check), and the new
   secret from step 1. Do **not** give it the `get_study_data` token.

## Endpoint

```
GET https://epaiazxcdcseijkhrncm.supabase.co/rest/v1/rpc/get_todos_get?token=<GET_READ_SECRET>
```

## Headers

| Header    | Value                                              |
| --------- | --------------------------------------------------- |
| `apikey`  | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwYWlhenhjZGNzZWlqa2hybmNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMjQ0MzQsImV4cCI6MjA5MjYwMDQzNH0.h2t_kFLZ_YPvuJlzPPiyXVbOnW4Ub_52hdaYosMoOus` |

No `Content-Type` or body needed — it's a plain GET.

## Example (curl)

```bash
curl -sS 'https://epaiazxcdcseijkhrncm.supabase.co/rest/v1/rpc/get_todos_get?token=YOUR_NEW_SECRET' \
  -H 'apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwYWlhenhjZGNzZWlqa2hybmNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMjQ0MzQsImV4cCI6MjA5MjYwMDQzNH0.h2t_kFLZ_YPvuJlzPPiyXVbOnW4Ub_52hdaYosMoOus'
```

### Success

Returns the raw `st_todos` array (or `[]` if empty), same shape the app
itself writes — same fields (`id`, `text`, `date`, `time`, `done`,
`updatedAt`, etc.) as `get_study_data('st_todos', token)` returns.

### Errors (HTTP 400, `{"message": "unauthorized"}`)

Wrong or missing `token`.

## Security notes

- **Read-only.** This function cannot write, update, or delete anything —
  it's a single `select`, nothing else.
- **Hard-scoped to `st_todos`.** There is no caller-supplied key parameter.
  Even if this specific token leaks (more likely than the POST token's,
  since it travels in a URL and can end up in server/proxy logs, browser
  history, or screenshots), the exposure is limited to today's todo list —
  not your schedule, session history, AI chat history, or anything else in
  `study_data`.
- **Separate secret from `get_study_data`.** A leak here can't be replayed
  against the POST endpoint to read other keys, and vice versa.
- If this token is ever suspected leaked, rotate it: edit
  `SUPABASE_GET_TODOS_RPC.sql`'s constant, re-run it in the SQL editor
  (`create or replace function` overwrites the old definition in place),
  and give the teacher session the new value.
