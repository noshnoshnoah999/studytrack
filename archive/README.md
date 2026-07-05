# archive/ — retired notifier code (do not run)

These files are the old push-notification senders. They are **superseded** by the
live GitHub Actions workflow `.github/workflows/study-notify.yml`, which is the
single source of truth for notifications (it installs `web-push` inline and sends
directly). Kept here for reference only.

- `notify.js` — legacy Node cron sender (`web-push`). Was the `main`/`start` of the
  old root `package.json`. The live workflow does **not** use it.
- `valtown-notify.js` — val.town cron copy of the same logic. Confirmed **dead/disabled**
  on 2026-07-05. It never set `sentAt`, so `sw.js`'s stale-drop could not filter its
  late pushes — if it were still running it would cause duplicate notifications.
- `package.json` — the manifest for the dead node cron above (`main`/`start` -> `notify.js`,
  `web-push` dependency). The live workflow installs `web-push` inline and does not use it.
  Moved here so `node notify.js` still resolves within this folder.

Retired 2026-07-05 during the bug-audit follow-up (B5).
