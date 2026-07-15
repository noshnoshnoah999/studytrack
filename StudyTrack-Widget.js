// StudyTrack Widget — paste into Scriptable
// Shows today's hours, next/current block — theme synced from app
//
// AUTH: study_data is protected by Row Level Security (auth.uid() = user_id).
// This script never contains a login credential — it reads a refresh token
// from Scriptable's on-device Keychain (set once via the separate setup
// script, never committed to git) and exchanges it for a short-lived access
// token on every run. If Keychain has no token yet, the widget shows a
// "Setup needed" state instead of crashing or silently showing stale/empty data.
// See: studytrack-widget-keychain-setup.md for the one-time setup steps.

const SB_URL = "https://epaiazxcdcseijkhrncm.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwYWlhenhjZGNzZWlqa2hybmNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMjQ0MzQsImV4cCI6MjA5MjYwMDQzNH0.h2t_kFLZ_YPvuJlzPPiyXVbOnW4Ub_52hdaYosMoOus";
const KEYCHAIN_KEY = "st_refresh_token";

// Exchange the stored refresh token for a fresh access token.
// Returns null if no token is stored yet, or if the exchange fails
// (e.g. the refresh token was revoked — re-run the setup script).
async function getAccessToken() {
  if (!Keychain.contains(KEYCHAIN_KEY)) return null;
  const refreshToken = Keychain.get(KEYCHAIN_KEY);
  try {
    const r = new Request(`${SB_URL}/auth/v1/token?grant_type=refresh_token`);
    r.method = "POST";
    r.headers = { apikey: SB_KEY, "Content-Type": "application/json" };
    r.body = JSON.stringify({ refresh_token: refreshToken });
    const data = await r.loadJSON();
    if (!data || !data.access_token) return null;
    // Supabase rotates the refresh token on each use — persist the new one
    // so the next widget refresh keeps working (Scriptable's default
    // refresh interval is generous, but store it regardless).
    if (data.refresh_token) Keychain.set(KEYCHAIN_KEY, data.refresh_token);
    return data.access_token;
  } catch (e) {
    return null;
  }
}

// ── Theme palette (matches app THEMES_LIST exactly) ──────────────────────────
const THEMES = {
  slate:    { bg:"#0e0e0e", bg2:"#1c1c1c", bg3:"#272727", text:"#f0f0f0", text2:"#909090", text3:"#606060", o:"#f97316", ok:"#00c896" },
  ocean:    { bg:"#09141e", bg2:"#0f2030", bg3:"#162840", text:"#d8eeff", text2:"#6898bc", text3:"#3a6080", o:"#00b8d9", ok:"#00c896" },
  crimson:  { bg:"#1a0808", bg2:"#260e0e", bg3:"#321414", text:"#fdf0f0", text2:"#c07070", text3:"#884848", o:"#dc2626", ok:"#00c896" },
  rose:     { bg:"#f5c0d4", bg2:"#fdd0e2", bg3:"#e8a0bc", text:"#280810", text2:"#8a3050", text3:"#b06080", o:"#c02868", ok:"#2a7a4a" },
  sage:     { bg:"#c8ddc4", bg2:"#d8ead4", bg3:"#b4ccb0", text:"#0e1e0c", text2:"#3a5e36", text3:"#608a5c", o:"#3a6a48", ok:"#1a5a30" },
  lavender: { bg:"#d0c0e8", bg2:"#ddd0f4", bg3:"#bca8d8", text:"#160e28", text2:"#583878", text3:"#8060a8", o:"#6830b0", ok:"#2a6a3a" },
  peach:    { bg:"#f8c0a0", bg2:"#ffd0b0", bg3:"#e8a888", text:"#2a1008", text2:"#904030", text3:"#b87050", o:"#d05828", ok:"#2a6a3a" },
  mint:     { bg:"#a8e4c8", bg2:"#c0f0d8", bg3:"#88d0b0", text:"#042010", text2:"#186040", text3:"#408060", o:"#158050", ok:"#0a5030" },
  denim:    { bg:"#b0c4e0", bg2:"#c4d4ec", bg3:"#98aed0", text:"#081830", text2:"#284878", text3:"#506898", o:"#1840a0", ok:"#1a6040" },
  mocha:    { bg:"#c8a882", bg2:"#d8b890", bg3:"#b8946c", text:"#1a0c00", text2:"#6b3a18", text3:"#9a6840", o:"#7a3a10", ok:"#2a5a1a" },
  coral:    { bg:"#1a0a06", bg2:"#2a1208", bg3:"#3a1a0e", text:"#fdf0eb", text2:"#d08060", text3:"#a05838", o:"#e0502a", ok:"#00c896" },
};

// ── Fetch from Supabase ──────────────────────────────────────────────────────
// bearerToken resolved once per widget run in the "Load data" section below
// and passed in here, rather than re-fetched per call, to avoid 6 separate
// token-refresh round trips for one widget render.
async function sbGet(key, bearerToken) {
  try {
    const r = await new Request(`${SB_URL}/rest/v1/study_data?key=eq.${key}&select=value`);
    r.headers = { apikey: SB_KEY, Authorization: "Bearer " + (bearerToken || SB_KEY) };
    const rows = await r.loadJSON();
    if (!rows || !rows[0]) return null;
    const v = rows[0].value;
    if (typeof v === "string") { try { return JSON.parse(v); } catch(e) { return v; } }
    return v;
  } catch(e) { return null; }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function todayStr() {
  // Tokyo time (UTC+9)
  const d = new Date(Date.now() + 9 * 3600000);
  return d.getUTCFullYear() + "-" +
    String(d.getUTCMonth()+1).padStart(2,"0") + "-" +
    String(d.getUTCDate()).padStart(2,"0");
}
function toMins(t) {
  if (!t) return 0;
  const [h, m] = t.split(":");
  return parseInt(h)*60 + parseInt(m||0);
}
function fmtH(h) {
  const tot = Math.round(h * 60);
  const hrs = Math.floor(tot / 60);
  const mins = tot % 60;
  if (hrs && mins) return `${hrs}h ${mins}m`;
  if (hrs) return `${hrs}h`;
  return `${mins}m`;
}
function fmtAmPm(t) {
  const [hh, mm] = t.split(":");
  const h = parseInt(hh);
  return `${h%12||12}:${mm} ${h<12?"AM":"PM"}`;
}
function c(hex) { return new Color(hex); }

// Everything below is wrapped in an async function (rather than left at top
// level) purely so the "no token yet" case can `return` early and skip
// straight to Script.complete() without duplicating the render logic.
async function run() {

// ── Load data ────────────────────────────────────────────────────────────────
const bearerToken = await getAccessToken();

if (!bearerToken) {
  // No valid session — either Keychain setup was never run on this device,
  // or the stored refresh token was revoked. Show a clear state instead of
  // silently rendering empty/zeroed data (RLS would return 0 rows either way,
  // which would otherwise look identical to "no sessions logged today").
  const w = new ListWidget();
  w.backgroundColor = new Color("#1c1c1c");
  w.setPadding(14, 14, 14, 14);
  const t1 = w.addText("⚠️ Setup needed");
  t1.font = Font.boldSystemFont(13);
  t1.textColor = new Color("#f97316");
  w.addSpacer(4);
  const t2 = w.addText("Run the Keychain setup script once on this device.");
  t2.font = Font.systemFont(10);
  t2.textColor = new Color("#909090");
  Script.setWidget(w);
  Script.complete();
  return;
}

const [sessions, goals, schedule, subjs, themeRaw, overridesRaw] = await Promise.all([
  sbGet("st_sessions", bearerToken), sbGet("st_goals", bearerToken), sbGet("st_sched", bearerToken),
  sbGet("st_subjs", bearerToken), sbGet("st_theme", bearerToken), sbGet("st_sched_overrides", bearerToken)
]);

// Pick theme — fall back to slate
const themeName = (typeof themeRaw === "string" && THEMES[themeRaw]) ? themeRaw : "slate";
const T = THEMES[themeName];

const today = todayStr();
const nowTokyo = new Date(Date.now() + 9 * 3600000);
const nowMins = nowTokyo.getUTCHours()*60 + nowTokyo.getUTCMinutes();
const dow = nowTokyo.getUTCDay();

// Extra credit exclusions
const EC_IDS = new Set(["el4"]);
(subjs||[]).forEach(s => { if (s.extraCredit) EC_IDS.add(s.id); });

const todaySessions = (sessions||[]).filter(s => s.date === today && !EC_IDS.has(s.subjectId));
const todayH = todaySessions.reduce((a,s) => a + s.hours, 0);
const dailyGoal = (goals && goals.daily) || 6.3;
const pct = Math.min(1, todayH / dailyGoal);

// ISO-week parity (0 = Week A, 1 = Week B) — must match study-notify.yml & the app
// Epoch-anchored biweekly parity (0 = Week A, 1 = Week B) — MUST stay identical
// to getWeekParity() in index.html and weekParity() in study-notify.yml.
// Anchor Monday 2026-06-22 is a Week A start. (Old ISO-week%2 double-flipped at
// 2026's 53rd ISO week -> two consecutive "Week B" at 2027-01-04.)
function weekParity(y, m, d) {
  const dt = new Date(Date.UTC(y, m, d));
  const day = dt.getUTCDay() || 7;            // Mon=1..Sun=7
  dt.setUTCDate(dt.getUTCDate() - (day - 1));  // Monday of this week
  const anchor = Date.UTC(2026, 5, 22);        // 2026-06-22, a Week A Monday
  const weeks = Math.floor((dt - anchor) / (7 * 86400000));
  return ((weeks % 2) + 2) % 2;                // 0 = Week A, 1 = Week B
}

// Today's blocks — respect one-off date overrides + biweekly Week A/B recurrence
const overrides = overridesRaw || {};
let dayBlocksRaw;
if (overrides[today]) {
  // A one-off override replaces the whole day's schedule
  dayBlocksRaw = overrides[today];
} else {
  const parity = weekParity(nowTokyo.getUTCFullYear(), nowTokyo.getUTCMonth(), nowTokyo.getUTCDate());
  dayBlocksRaw = (schedule||[]).filter(b => b.day === dow && (
    !b.recurrence || b.recurrence === "weekly" ||
    (b.recurrence === "biweekly_a" && parity === 0) ||
    (b.recurrence === "biweekly_b" && parity === 1)
  ));
}
// study sessions (for the daily-hours bar etc.)
const todayBlocks = dayBlocksRaw
  .filter(b => b.type === "study")
  .sort((a,b) => toMins(a.start) - toMins(b.start));

// Focus block: what's happening RIGHT NOW (any block type), falling back to the
// next study/class block only when nothing is currently on the schedule.
//  - in a study/class block  -> "NOW" (e.g. US History (School))
//  - in a break              -> "ON BREAK"
//  - nothing now             -> "NEXT" study/class block
const allBlocks = dayBlocksRaw.slice().sort((a,b) => toMins(a.start) - toMins(b.start));
const isSession = b => b && (b.type === "study" || b.type === "class" || b.type === "work");
const activeAny   = allBlocks.find(b => nowMins >= toMins(b.start) && nowMins < toMins(b.end));
const nextSession = allBlocks.find(b => toMins(b.start) > nowMins && (b.type === "study" || b.type === "class"));

let focusBlock = null, focusState = null;
if (activeAny && activeAny.type === "break") { focusBlock = activeAny; focusState = "break"; }
else if (isSession(activeAny))               { focusBlock = activeAny; focusState = "now"; }
else if (nextSession)                        { focusBlock = nextSession; focusState = "next"; }

const stateLabel = focusState === "break" ? "● ON BREAK" : focusState === "now" ? "● NOW" : "● NEXT";
const focusName  = focusState === "break" ? (focusBlock.label || "On break") : (focusBlock ? (focusBlock.label || "Study") : "");

// ── Build widget ─────────────────────────────────────────────────────────────
const w = new ListWidget();
w.backgroundColor = c(T.bg);
w.url = "https://noshnoshnoah999.github.io/studytrack/";
w.setPadding(14, 14, 14, 14);

const size = config.widgetFamily || "small";

if (size === "small") {
  // ── SMALL ──────────────────────────────────────────────────────────────────
  // Day label
  const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const dayEl = w.addText(dayNames[dow]);
  dayEl.font = Font.systemFont(11);
  dayEl.textColor = c(T.text2);

  w.addSpacer(4);

  // Big hours
  const hoursText = w.addText(fmtH(todayH));
  hoursText.font = Font.boldSystemFont(30);
  hoursText.textColor = todayH >= dailyGoal ? c(T.ok) : c(T.text);
  hoursText.minimumScaleFactor = 0.6;

  const goalText = w.addText(todayH >= dailyGoal ? "Goal reached! 🎉" : `of ${fmtH(dailyGoal)} goal`);
  goalText.font = Font.systemFont(11);
  goalText.textColor = todayH >= dailyGoal ? c(T.ok) : c(T.text2);
  goalText.minimumScaleFactor = 0.7;

  w.addSpacer();

  if (focusBlock) {
    const labelEl = w.addText(stateLabel);
    labelEl.font = Font.boldSystemFont(9);
    labelEl.textColor = c(T.o);

    w.addSpacer(2);

    const blockName = w.addText(focusName);
    blockName.font = Font.mediumSystemFont(13);
    blockName.textColor = c(T.text);
    blockName.lineLimit = 1;

    const blockTime = w.addText(`${fmtAmPm(focusBlock.start)} – ${fmtAmPm(focusBlock.end)}`);
    blockTime.font = Font.systemFont(10);
    blockTime.textColor = c(T.text2);
  } else {
    const remaining = Math.max(0, dailyGoal - todayH);
    const freeEl = w.addText(todayH >= dailyGoal ? "All done today ✓" : `${fmtH(remaining)} remaining`);
    freeEl.font = Font.systemFont(11);
    freeEl.textColor = c(T.text2);
  }

} else if (size === "medium") {
  // ── MEDIUM ─────────────────────────────────────────────────────────────────
  const row = w.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();

  const left = row.addStack();
  left.layoutVertically();

  const bigHours = left.addText(fmtH(todayH));
  bigHours.font = Font.boldSystemFont(32);
  bigHours.textColor = todayH >= dailyGoal ? c(T.ok) : c(T.text);

  const goalLbl = left.addText(`of ${fmtH(dailyGoal)} goal`);
  goalLbl.font = Font.systemFont(14);
  goalLbl.textColor = c(T.text2);
  goalLbl.minimumScaleFactor = 0.7;

  row.addSpacer();

  const right = row.addStack();
  right.layoutVertically();
  right.centerAlignContent();

  if (focusBlock) {
    const lbl = right.addText(stateLabel);
    lbl.font = Font.boldSystemFont(10);
    lbl.textColor = c(T.o);

    right.addSpacer(3);

    const bn = right.addText(focusName);
    bn.font = Font.mediumSystemFont(14);
    bn.textColor = c(T.text);
    bn.lineLimit = 1;

    const bt = right.addText(`${fmtAmPm(focusBlock.start)} – ${fmtAmPm(focusBlock.end)}`);
    bt.font = Font.systemFont(11);
    bt.textColor = c(T.text2);
  } else {
    const freeEl = right.addText("Free now");
    freeEl.font = Font.systemFont(13);
    freeEl.textColor = c(T.text3);
  }

} else {
  // ── LOCK SCREEN ────────────────────────────────────────────────────────────
  const pctNum = w.addText(`${Math.round(pct*100)}%`);
  pctNum.font = Font.boldSystemFont(16);
  pctNum.textColor = c(T.text);

  const sub = w.addText(fmtH(todayH) + " today");
  sub.font = Font.systemFont(10);
  sub.textColor = c(T.text2);
}

Script.setWidget(w);
Script.complete();

} // end run()

await run();
