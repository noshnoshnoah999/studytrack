// StudyTrack Notifications — val.town cron (runs every 5 min)
// Paste this into a new Cron val at val.town
// Set these secrets in val.town: SB_URL, SB_KEY, VAPID_PUBLIC, VAPID_PRIVATE, VAPID_EMAIL

import webpush from "npm:web-push";

const SB_URL = Deno.env.get("SB_URL");
const SB_KEY  = Deno.env.get("SB_KEY");
const HDR = {
  'apikey': SB_KEY,
  'Authorization': 'Bearer ' + SB_KEY,
  'Content-Type': 'application/json'
};

webpush.setVapidDetails(
  'mailto:' + Deno.env.get("VAPID_EMAIL"),
  Deno.env.get("VAPID_PUBLIC"),
  Deno.env.get("VAPID_PRIVATE")
);

async function sbGet(key) {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/study_data?key=eq.${key}&select=value`, { headers: HDR });
    if (!r.ok) return null;
    const rows = await r.json();
    if (!rows || !rows[0]) return null;
    const val = rows[0].value;
    if (typeof val === 'string') { try { return JSON.parse(val); } catch(e) { return val; } }
    return val;
  } catch(e) { return null; }
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

async function send(sub, title, body, tag, extra = {}) {
  try {
    await webpush.sendNotification(sub, JSON.stringify({ title, body, tag, url: '/studytrack/', ...extra }));
    console.log(`[OK] [${tag}] ${title}`);
  } catch(e) {
    if (e.statusCode === 410 || e.statusCode === 404) {
      console.log('[GONE] subscription expired');
    } else {
      console.error(`[ERR] [${tag}] ${e.statusCode || e.message}`);
    }
  }
}

// Perth time via direct UTC+8 offset
const nowDate  = new Date(Date.now() + 8 * 3600000);
const dow      = nowDate.getUTCDay();
const nowMins  = nowDate.getUTCHours() * 60 + nowDate.getUTCMinutes();
const todayStr = nowDate.getUTCFullYear() + '-' +
  String(nowDate.getUTCMonth() + 1).padStart(2, '0') + '-' +
  String(nowDate.getUTCDate()).padStart(2, '0');
const DAY = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
console.log(`${DAY[dow]} ${nowDate.getUTCHours()}:${String(nowDate.getUTCMinutes()).padStart(2,'0')} Perth | ${nowMins}m | ${todayStr}`);

function near(targetMins, lo = 2, hi = 5) {
  return nowMins >= targetMins - lo && nowMins < targetMins + hi;
}

const [schedule, subjectsRaw, sessionsRaw, hoursRaw, subsRaw, notifDone, todosRaw, overridesRaw] = await Promise.all([
  sbGet('st_sched'), sbGet('st_subjs'), sbGet('st_sessions'), sbGet('st_hours'),
  sbGet('push_subscriptions'), sbGet('notif_done_subjs'), sbGet('st_todos'), sbGet('st_sched_overrides')
]);

if (!subsRaw) { console.log('No push subscriptions'); Deno.exit(0); }
const subs = Array.isArray(subsRaw) ? subsRaw : [subsRaw];
console.log(`Sending to ${subs.length} device(s)`);

async function sendAll(title, body, tag, extra = {}) {
  for (const sub of subs) await send(sub, title, body, tag, extra);
}

const overrides = overridesRaw || {};
const hasOverride = !!overrides[todayStr];
const todayBlocks = (hasOverride ? overrides[todayStr] : (schedule || []).filter(b => b.day === dow))
  .sort((a, b) => toMins(a.start) - toMins(b.start));
console.log(`Schedule: ${hasOverride ? 'override' : 'weekly'} | ${todayBlocks.length} blocks`);

const subjects = subjectsRaw || [];
const sessions = sessionsRaw || [];
const hours    = hoursRaw    || {};

function getLogged(id) {
  const s = subjects.find(x => x.id === id);
  if (!s) return 0;
  return (s.base || 0) + (hours[id] || 0) +
    sessions.filter(x => x.subjectId === id).reduce((a, x) => a + x.hours, 0);
}

const todayH = sessions.filter(s => s.date === todayStr).reduce((a, s) => a + s.hours, 0);
const weekAgo = new Date(nowDate); weekAgo.setDate(weekAgo.getDate() - 6);
const weekH = sessions.filter(s => new Date(s.date) >= weekAgo).reduce((a, s) => a + s.hours, 0);
const monthAgo = new Date(nowDate); monthAgo.setDate(monthAgo.getDate() - 28);
const weeklyAvg = sessions.filter(s => new Date(s.date) >= monthAgo).reduce((a, s) => a + s.hours, 0) / 4;

const dailyGoal = 6.3, weeklyGoal = 31.5;

// 1a. Block starting in 5–15 min
for (const bl of todayBlocks.filter(b => b.type === 'study' && toMins(b.start) - nowMins >= 5 && toMins(b.start) - nowMins <= 15)) {
  await sendAll(`Starting in ${toMins(bl.start) - nowMins}min`, `${bl.label} · ${bl.start}–${bl.end}`, `soon-${bl.id}`);
}
// 1b. Block just started
for (const bl of todayBlocks.filter(b => b.type === 'study' && nowMins >= toMins(b.start) && nowMins < toMins(b.start) + 5)) {
  await sendAll(`Time to study — ${bl.label}`, `${bl.start}–${bl.end} · Tap to start your timer`, `started-${bl.id}`, { type: 'block-start', subjectId: bl.subjectId || null, blockStart: bl.start });
}
// 2. Ending soon
for (const bl of todayBlocks.filter(b => b.type === 'study' && toMins(b.end) - nowMins >= 3 && toMins(b.end) - nowMins <= 8)) {
  await sendAll(`${bl.label} ending soon`, `Finishes at ${bl.end} · Don't forget to log!`, `end-${bl.id}`, { type: 'block-end', subjectId: bl.subjectId || null, blockStart: bl.start });
}
// 3. Break ending
for (const bl of todayBlocks.filter(b => b.type === 'break' && toMins(b.end) - nowMins >= 0 && toMins(b.end) - nowMins <= 5)) {
  const next = todayBlocks.find(b => toMins(b.start) >= toMins(bl.end) && b.type === 'study');
  await sendAll('Break ending soon', next ? `Up next: ${next.label} at ${next.start}` : 'Break wrapping up', `break-end-${bl.id}`);
}
// 4. Morning summary 8:30am
if (near(8 * 60 + 30)) {
  const studyBlocks = todayBlocks.filter(b => b.type === 'study');
  const scheduledH  = studyBlocks.reduce((a, b) => a + (toMins(b.end) - toMins(b.start)) / 60, 0);
  if (!studyBlocks.length) {
    await sendAll('Good morning!', 'No study blocks today — rest up!', 'morning-summary');
  } else {
    await sendAll(`Good morning! ${studyBlocks.length} blocks · ${fmtH(scheduledH)}`, studyBlocks.map(b => `${b.start}–${b.end} ${b.label}`).join('\n'), 'morning-schedule');
    const stats = subjects.filter(s => !s.done && !s.passive && s.req > 0)
      .map(s => { const logged = getLogged(s.id); return { ...s, logged, pct: logged/s.req*100, left: Math.max(0, s.req-logged) }; })
      .sort((a,b) => a.pct - b.pct);
    const top3 = stats.slice(0,3);
    const todayIds = studyBlocks.map(b => b.subjectId).filter(Boolean);
    const focusTitle = stats.filter(s => todayIds.includes(s.id)).length
      ? `Today: ${stats.filter(s => todayIds.includes(s.id)).map(s=>s.name).join(', ')}`
      : 'Most behind subjects';
    await sendAll(focusTitle, top3.map(s => `${s.name} · ${Math.round(s.pct)}% · ${fmtH(s.left)} left`).join('\n'), 'morning-focus');
  }
}
// 5. Daily wrap-up 6pm
if (near(18 * 60)) {
  await sendAll('Daily wrap-up', todayH >= dailyGoal ? `Target hit! ${fmtH(todayH)} today` : `${fmtH(todayH)} logged · ${fmtH(Math.max(0, dailyGoal-todayH))} to go`, 'daily-wrapup');
}
// 6. Monday preview
if (dow === 1 && near(8 * 60)) {
  await sendAll('New week!', `Goal: ${fmtH(weeklyGoal)} · You averaged ${fmtH(weeklyAvg)}/week recently`, 'monday-preview');
}
// 7. Sunday recap
if (dow === 0 && near(18 * 60)) {
  const hitTarget = sessions.filter(s => new Date(s.date) >= weekAgo).reduce((map, s) => { map[s.date]=(map[s.date]||0)+s.hours; return map; }, {});
  const daysHit = Object.values(hitTarget).filter(h => h >= dailyGoal).length;
  await sendAll('Weekly recap', `${fmtH(weekH)} this week · ${daysHit}/7 days hit target`, 'weekly-recap');
}
// 8. Subject complete
const alreadyNotified = notifDone || [];
const newlyDone = subjects.filter(s => s.done && !alreadyNotified.includes(s.id));
for (const s of newlyDone) await sendAll('Subject complete!', `${s.name} is done · Great work!`, `done-${s.id}`);
if (newlyDone.length) await sbSet('notif_done_subjs', [...alreadyNotified, ...newlyDone.map(s => s.id)]);
// 9. Falling behind 9am
if (near(9 * 60)) {
  const avgPct = subjects.filter(s => !s.done && s.req > 0).reduce((a, s) => a + getLogged(s.id)/s.req, 0) / Math.max(1, subjects.filter(s => !s.done && s.req > 0).length) * 100;
  const wayBehind = subjects.filter(s => !s.done && !s.passive && s.req > 0)
    .map(s => ({ ...s, pct: getLogged(s.id)/s.req*100 })).filter(s => s.pct < avgPct - 15)
    .sort((a,b) => a.pct - b.pct).slice(0,3);
  if (wayBehind.length) await sendAll('Subjects falling behind', wayBehind.map(s => `${s.name} (${Math.round(s.pct)}%)`).join(' · '), 'behind-subjects');
}
// 10. To-do reminders
for (const t of (todosRaw||[]).filter(t => !t.done && t.date && t.time)) {
  if (t.date === todayStr && near(toMins(t.time), 2, 7)) await sendAll('Task due now', t.text, `todo-${t.id}`);
}

console.log('Done.');
