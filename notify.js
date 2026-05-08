'use strict';
const webpush = require('web-push');

const SB_URL = process.env.SB_URL;
const SB_KEY = process.env.SB_KEY;
const HDR = {
  'apikey': SB_KEY,
  'Authorization': 'Bearer ' + SB_KEY,
  'Content-Type': 'application/json'
};

webpush.setVapidDetails(
  'mailto:' + process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC,
  process.env.VAPID_PRIVATE
);

// ── Supabase helpers ──────────────────────────────────────────────────────────
async function sbGet(key) {
  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/study_data?key=eq.${key}&select=value`,
      { headers: HDR }
    );
    if (!r.ok) { console.error('sbGet ' + key + ' failed: ' + r.status); return null; }
    const rows = await r.json();
    if (!rows || !rows[0]) return null;
    const val = rows[0].value;
    if (typeof val === 'string') { try { return JSON.parse(val); } catch(e) { return val; } }
    return val;
  } catch(e) { console.error('sbGet error:', e.message); return null; }
}

async function sbSet(key, val) {
  try {
    await fetch(`${SB_URL}/rest/v1/study_data`, {
      method: 'POST',
      headers: { ...HDR, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ key, value: val, updated_at: new Date().toISOString() })
    });
  } catch(e) {}
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function toMins(t) {
  if (!t) return 0;
  const [h, m] = t.split(':');
  return parseInt(h) * 60 + parseInt(m || 0);
}

function fmtH(h) {
  const tot = Math.round(h * 60);
  const hrs = Math.floor(tot / 60);
  const mins = tot % 60;
  if (hrs && mins) return `${hrs}h ${mins}m`;
  if (hrs) return `${hrs}h`;
  return `${mins}m`;
}

// ── Send helper ───────────────────────────────────────────────────────────────
// ttl: seconds the push server keeps the message if device unreachable.
//      Short TTL = stale notifications are dropped rather than delivered late.
// urgency: 'high' bypasses iOS/Android battery-saving delivery delays.
async function send(sub, title, body, tag, extra = {}, ttl = 120, urgency = 'high') {
  try {
    // sentAt: real UTC ms so the service worker can drop stale deliveries
    // even when the payload has no expiresAt (e.g. morning/evening summaries)
    await webpush.sendNotification(
      sub,
      JSON.stringify({ title, body, tag, url: '/studytrack/', sentAt: Date.now(), ...extra }),
      { TTL: ttl, urgency }
    );
    console.log(`[OK] [${tag}] ${title} - ${body}`);
  } catch(e) {
    if (e.statusCode === 410 || e.statusCode === 404) {
      console.log('[GONE] subscription expired, skipping');
    } else {
      console.error(`[ERR] [${tag}] ${e.statusCode || e.message}`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  // Current time in Perth (AWST = UTC+8, no DST)
  // Use direct UTC offset math — avoids toLocaleString parsing bugs on Linux
  const nowDate = new Date(Date.now() + 8 * 3600000);
  const dow     = nowDate.getUTCDay();
  const nowMins = nowDate.getUTCHours() * 60 + nowDate.getUTCMinutes();
  const todayStr =
    nowDate.getUTCFullYear() + '-' +
    String(nowDate.getUTCMonth() + 1).padStart(2, '0') + '-' +
    String(nowDate.getUTCDate()).padStart(2, '0');
  const DAY = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  console.log(`${DAY[dow]} ${nowDate.getUTCHours()}:${String(nowDate.getUTCMinutes()).padStart(2,'0')} Perth | ${nowMins}m | ${todayStr}`);

  function near(targetMins, lo = 2, hi = 5) {
    return nowMins >= targetMins - lo && nowMins < targetMins + hi;
  }

  const [schedule, subjectsRaw, sessionsRaw, hoursRaw, subsRaw, notifDone, todosRaw, overridesRaw, goalsRaw, sentTodosRaw] = await Promise.all([
    sbGet('st_sched'),
    sbGet('st_subjs'),
    sbGet('st_sessions'),
    sbGet('st_hours'),
    sbGet('push_subscriptions'),
    sbGet('notif_done_subjs'),
    sbGet('st_todos'),
    sbGet('st_sched_overrides'),
    sbGet('st_goals'),
    sbGet('notif_sent_todos_' + todayStr)   // tracks which todos fired today
  ]);

  if (!subsRaw) { console.log('No push subscriptions found'); return; }
  const subs = Array.isArray(subsRaw) ? subsRaw : [subsRaw];
  console.log(`Sending to ${subs.length} device(s)`);

  async function sendAll(title, body, tag, extra = {}, ttl = 120, urgency = 'high') {
    for (const sub of subs) {
      await send(sub, title, body, tag, extra, ttl, urgency);
    }
  }

  // Use one-off override for today if it exists, otherwise use weekly schedule
  const overrides = overridesRaw || {};
  const hasOverride = !!overrides[todayStr];
  const todayBlocks = (hasOverride ? overrides[todayStr] : (schedule || []).filter(b => b.day === dow))
    .sort((a, b) => toMins(a.start) - toMins(b.start));
  console.log(`Schedule source: ${hasOverride ? 'override for ' + todayStr : 'weekly (day ' + dow + ')'} | ${todayBlocks.length} blocks`);

  const subjects = subjectsRaw || [];
  const sessions = sessionsRaw || [];
  const hours    = hoursRaw    || {};

  function getLogged(id) {
    const s = subjects.find(x => x.id === id);
    if (!s) return 0;
    return (s.base || 0) + (hours[id] || 0);
  }

  const todayH = sessions
    .filter(s => s.date === todayStr)
    .reduce((a, s) => a + s.hours, 0);

  // Mon–Sun calendar week (matches dashboard week bar chart)
  const dowNum = nowDate.getUTCDay(); // 0=Sun,1=Mon...
  const daysSinceMon = (dowNum + 6) % 7;
  const monOfWeek = new Date(nowDate); monOfWeek.setUTCDate(nowDate.getUTCDate() - daysSinceMon);
  const monStr = monOfWeek.getUTCFullYear() + '-' + String(monOfWeek.getUTCMonth()+1).padStart(2,'0') + '-' + String(monOfWeek.getUTCDate()).padStart(2,'0');
  const weekH = sessions
    .filter(s => s.date >= monStr && s.date <= todayStr)
    .reduce((a, s) => a + s.hours, 0);

  const monthAgo = new Date(nowDate); monthAgo.setDate(monthAgo.getDate() - 28);
  const monthH = sessions
    .filter(s => new Date(s.date) >= monthAgo)
    .reduce((a, s) => a + s.hours, 0);
  const weeklyAvg = monthH / 4;

  // Use user's personal goal from settings (falls back to teacher's standard)
  const goals       = goalsRaw || {};
  const dailyGoal   = goals.daily      || 6.2;
  const daysPerWeek = goals.daysPerWeek || 5;
  const weeklyGoal  = goals.weekly     || (dailyGoal * daysPerWeek);

  // Helper: ms timestamp when notification becomes stale (for client-side drop)
  // Uses real UTC Date.now() — service worker also uses Date.now() so no TZ issue
  function expiresIn(mins) { return Date.now() + mins * 60 * 1000; }

  // ── 1a. Block starting in 5–15 min ────────────────────────────────────────
  const startingSoon = todayBlocks.filter(b =>
    b.type === 'study' &&
    toMins(b.start) - nowMins >= 5 &&
    toMins(b.start) - nowMins <= 15
  );
  for (const bl of startingSoon) {
    const minsAway = toMins(bl.start) - nowMins;
    const ttl = Math.max(30, (minsAway - 2) * 60);
    // expiresAt: 2 min before block starts so stale delivery is always dropped
    await sendAll(
      `Starting in ${minsAway}min`,
      `${bl.label} · ${bl.start}–${bl.end}`,
      `soon-${bl.id}`,
      { expiresAt: expiresIn(minsAway - 2) },
      ttl
    );
  }

  // ── 1b. Block just started (0–4 min ago) ──────────────────────────────────
  const justStarted = todayBlocks.filter(b =>
    b.type === 'study' &&
    nowMins >= toMins(b.start) &&
    nowMins < toMins(b.start) + 5
  );
  for (const bl of justStarted) {
    await sendAll(
      `Time to study — ${bl.label}`,
      `${bl.start}–${bl.end} · Tap to start your timer`,
      `started-${bl.id}`,
      { type: 'block-start', subjectId: bl.subjectId || null, blockStart: bl.start, expiresAt: expiresIn(3) },
      180
    );
  }

  // ── 2. Study block ending in 3–8 min ──────────────────────────────────────
  const endingSoon = todayBlocks.filter(b =>
    b.type === 'study' &&
    toMins(b.end) - nowMins >= 3 &&
    toMins(b.end) - nowMins <= 8
  );
  for (const bl of endingSoon) {
    const minsToEnd = toMins(bl.end) - nowMins;
    await sendAll(
      `${bl.label} ending soon`,
      `Finishes at ${bl.end} · Don't forget to log your session!`,
      `end-${bl.id}`,
      { type: 'block-end', subjectId: bl.subjectId || null, blockStart: bl.start, expiresAt: expiresIn(minsToEnd) },
      Math.max(30, (minsToEnd - 1) * 60)
    );
  }

  // ── 3. Break ending in 0–5 min ────────────────────────────────────────────
  const breakEndingSoon = todayBlocks.filter(b =>
    b.type === 'break' &&
    toMins(b.end) - nowMins >= 0 &&
    toMins(b.end) - nowMins <= 5
  );
  for (const bl of breakEndingSoon) {
    const minsToBreakEnd = toMins(bl.end) - nowMins;
    const nextBlock = todayBlocks.find(b => toMins(b.start) >= toMins(bl.end) && b.type === 'study');
    await sendAll(
      'Break ending soon',
      nextBlock ? `Up next: ${nextBlock.label} at ${nextBlock.start}` : 'Break wrapping up',
      `break-end-${bl.id}`,
      { expiresAt: expiresIn(minsToBreakEnd + 2) },
      Math.max(30, minsToBreakEnd * 60)
    );
  }

  // ── 4. Morning summary — 8:30am ───────────────────────────────────────────
  if (near(8 * 60 + 30)) {
    const studyBlocks = todayBlocks.filter(b => b.type === 'study');
    const scheduledH  = studyBlocks.reduce((a, b) => a + (toMins(b.end) - toMins(b.start)) / 60, 0);

    if (studyBlocks.length === 0) {
      await sendAll('Good morning!', 'No study blocks today — rest up!', 'morning-summary', {}, 3600);
    } else {
      await sendAll(
        `Good morning! ${studyBlocks.length} blocks today · ${fmtH(scheduledH)}`,
        studyBlocks.map(b => `${b.start}–${b.end} ${b.label}`).join('\n'),
        'morning-schedule',
        {},
        3600
      );

      const subjectStats = subjects
        .filter(s => !s.done && !s.passive && s.req > 0)
        .map(s => {
          const logged = getLogged(s.id);
          const pct = logged / s.req * 100;
          const left = Math.max(0, s.req - logged);
          return { ...s, logged, pct, left };
        })
        .sort((a, b) => a.pct - b.pct);

      const top3 = subjectStats.slice(0, 3);
      const focusBody = top3
        .map(s => `${s.name} · ${Math.round(s.pct)}% · ${fmtH(s.left)} left`)
        .join('\n');

      const todaySubjectIds = studyBlocks.map(b => b.subjectId).filter(Boolean);
      const todayScheduled  = subjectStats
        .filter(s => todaySubjectIds.includes(s.id))
        .map(s => s.name);

      const focusTitle = todayScheduled.length
        ? `Today: ${todayScheduled.join(', ')}`
        : 'Most behind subjects';

      await sendAll(focusTitle, focusBody, 'morning-focus', {}, 3600);
    }
  }

  // ── 5. Daily wrap-up — 6pm ────────────────────────────────────────────────
  if (near(18 * 60)) {
    const remaining = Math.max(0, dailyGoal - todayH);
    const body = todayH >= dailyGoal
      ? `Target hit! You studied ${fmtH(todayH)} today`
      : `${fmtH(todayH)} logged · ${fmtH(remaining)} to go`;
    await sendAll('Daily wrap-up', body, 'daily-wrapup', {}, 3600);
  }

  // ── 6. Monday morning — weekly preview ───────────────────────────────────
  if (dow === 1 && near(8 * 60)) {
    await sendAll(
      'New week!',
      `Goal: ${fmtH(weeklyGoal)} this week · You averaged ${fmtH(weeklyAvg)}/week recently`,
      'monday-preview',
      {},
      3600
    );
  }

  // ── 7. Sunday evening — weekly recap ─────────────────────────────────────
  if (dow === 0 && near(18 * 60)) {
    const hitTarget = sessions
      .filter(s => new Date(s.date) >= weekAgo && new Date(s.date) <= nowDate)
      .reduce((map, s) => { map[s.date] = (map[s.date] || 0) + s.hours; return map; }, {});
    const daysHit = Object.values(hitTarget).filter(h => h >= dailyGoal).length;
    await sendAll(
      'Weekly recap',
      `${fmtH(weekH)} this week · ${daysHit}/7 days hit target`,
      'weekly-recap',
      {},
      3600
    );
  }

  // ── 8. Subject complete — first time only ────────────────────────────────
  const alreadyNotified = notifDone || [];
  const newlyDone = subjects.filter(s => s.done && !alreadyNotified.includes(s.id));
  for (const s of newlyDone) {
    await sendAll('Subject complete!', `${s.name} is done · Great work!`, `done-${s.id}`, {}, 3600);
  }
  if (newlyDone.length) {
    await sbSet('notif_done_subjs', [...alreadyNotified, ...newlyDone.map(s => s.id)]);
  }

  // ── 9. Subjects falling behind — 9am ────────────────────────────────────
  if (near(9 * 60)) {
    const avgPct = subjects
      .filter(s => !s.done && s.req > 0)
      .reduce((a, s) => a + getLogged(s.id) / s.req, 0) /
      Math.max(1, subjects.filter(s => !s.done && s.req > 0).length) * 100;

    const wayBehind = subjects
      .filter(s => !s.done && !s.passive && s.req > 0)
      .map(s => ({ ...s, pct: getLogged(s.id) / s.req * 100 }))
      .filter(s => s.pct < avgPct - 15)
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 3);

    if (wayBehind.length) {
      await sendAll(
        'Subjects falling behind',
        wayBehind.map(s => `${s.name} (${Math.round(s.pct)}%)`).join(' · '),
        'behind-subjects',
        {},
        3600
      );
    }
  }

  // ── 10. To-Do reminders ───────────────────────────────────────────────────
  // sentTodos: IDs already notified today — prevents duplicate fires across
  // multiple cron runs and across multiple stored push subscriptions.
  const todos = todosRaw || [];
  const sentTodos = Array.isArray(sentTodosRaw) ? sentTodosRaw : [];
  const newlySentTodos = [];
  for (const t of todos.filter(t => !t.done && t.date && t.time)) {
    const todoMins = toMins(t.time);
    if (t.date === todayStr && near(todoMins, 2, 7) && !sentTodos.includes(t.id)) {
      // TTL: drop after 5 min — task reminder is useless if delivered much later
      await sendAll('Task due now', t.text, `todo-${t.id}`, { sentAt: Date.now() }, 300);
      newlySentTodos.push(t.id);
    }
  }
  // Persist sent list so subsequent cron runs skip already-fired todos today
  if (newlySentTodos.length) {
    await sbSet('notif_sent_todos_' + todayStr, [...sentTodos, ...newlySentTodos]);
  }
})();
