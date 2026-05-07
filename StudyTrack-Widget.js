// StudyTrack Widget — paste into Scriptable
// Shows today's hours, next/current block

const SB_URL = "https://epaiazxcdcseijkhrncm.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwYWlhenhjZGNzZWlqa2hybmNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMjQ0MzQsImV4cCI6MjA5MjYwMDQzNH0.h2t_kFLZ_YPvuJlzPPiyXVbOnW4Ub_52hdaYosMoOus";

// ── Colours (Ember theme — warm cream) ─────────────────────────────────────
const C = {
  bg:      new Color("#faf7f1"),  // warm cream card background
  bg2:     new Color("#f0ebe2"),  // slightly darker bg
  accent:  new Color("#b5654e"),  // terracotta accent
  text:    new Color("#261a0e"),  // dark warm brown
  text2:   new Color("#7a5c3e"),  // medium brown
  text3:   new Color("#b09070"),  // muted label
  ok:      new Color("#5a8a60"),  // green for on-track
};

// ── Fetch from Supabase ──────────────────────────────────────────────────────
async function sbGet(key) {
  try {
    const r = await new Request(`${SB_URL}/rest/v1/study_data?key=eq.${key}&select=value`);
    r.headers = { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY };
    const rows = await r.loadJSON();
    if (!rows || !rows[0]) return null;
    const v = rows[0].value;
    if (typeof v === "string") { try { return JSON.parse(v); } catch(e) { return v; } }
    return v;
  } catch(e) { return null; }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function todayStr() {
  const d = new Date();
  return d.getFullYear() + "-" +
    String(d.getMonth()+1).padStart(2,"0") + "-" +
    String(d.getDate()).padStart(2,"0");
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

// ── Load data ────────────────────────────────────────────────────────────────
const [sessions, goals, schedule] = await Promise.all([
  sbGet("st_sessions"),
  sbGet("st_goals"),
  sbGet("st_sched"),
]);

const today = todayStr();
const now = new Date();
const nowMins = now.getHours()*60 + now.getMinutes();
const dow = now.getDay();

const todaySessions = (sessions||[]).filter(s => s.date === today);
const todayH = todaySessions.reduce((a,s) => a + s.hours, 0);
const dailyGoal = (goals && goals.daily) || 6.3;
const pct = Math.min(1, todayH / dailyGoal);

// Next / current block
const todayBlocks = (schedule||[])
  .filter(b => b.day === dow && b.type === "study")
  .sort((a,b) => toMins(a.start) - toMins(b.start));

const activeBlock = todayBlocks.find(b => nowMins >= toMins(b.start) && nowMins < toMins(b.end));
const nextBlock   = todayBlocks.find(b => toMins(b.start) > nowMins);
const focusBlock  = activeBlock || nextBlock;

// ── Build widget ─────────────────────────────────────────────────────────────
const w = new ListWidget();
w.backgroundColor = C.bg;
w.url = "https://noshnoshnoah999.github.io/studytrack/";
w.setPadding(14, 14, 14, 14);

const size = config.widgetFamily || "small";

if (size === "small") {
  // ── SMALL WIDGET ───────────────────────────────────────────────────────────
  // Today's hours — big number
  const hoursText = w.addText(fmtH(todayH));
  hoursText.font = Font.boldSystemFont(28);
  hoursText.textColor = todayH >= dailyGoal ? C.ok : C.text;

  w.addSpacer(2);

  const goalText = w.addText(`of ${fmtH(dailyGoal)} goal`);
  goalText.font = Font.systemFont(15);
  goalText.textColor = C.text2;

  w.addSpacer();

  // Next / now block
  if (focusBlock) {
    const label = activeBlock ? "● NOW" : "● NEXT";
    const labelEl = w.addText(label);
    labelEl.font = Font.boldSystemFont(9);
    labelEl.textColor = C.accent;

    w.addSpacer(2);

    const blockName = w.addText(focusBlock.label || "Study");
    blockName.font = Font.mediumSystemFont(13);
    blockName.textColor = C.text;
    blockName.lineLimit = 1;

    const blockTime = w.addText(`${fmtAmPm(focusBlock.start)} – ${fmtAmPm(focusBlock.end)}`);
    blockTime.font = Font.systemFont(10);
    blockTime.textColor = C.text2;
  } else {
    const freeEl = w.addText("No blocks today");
    freeEl.font = Font.systemFont(11);
    freeEl.textColor = C.text3;
  }

} else if (size === "medium") {
  // ── MEDIUM WIDGET ──────────────────────────────────────────────────────────
  const row = w.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();

  // Left: hours
  const left = row.addStack();
  left.layoutVertically();

  const bigHours = left.addText(fmtH(todayH));
  bigHours.font = Font.boldSystemFont(32);
  bigHours.textColor = todayH >= dailyGoal ? C.ok : C.text;

  const goalLbl = left.addText(`of ${fmtH(dailyGoal)} goal`);
  goalLbl.font = Font.systemFont(15);
  goalLbl.textColor = C.text2;

  left.addSpacer(6);

  row.addSpacer();

  // Right: next block + log button
  const right = row.addStack();
  right.layoutVertically();
  right.centerAlignContent();

  if (focusBlock) {
    const lbl = right.addText(activeBlock ? "● NOW" : "● NEXT");
    lbl.font = Font.boldSystemFont(10);
    lbl.textColor = C.accent;

    right.addSpacer(3);

    const bn = right.addText(focusBlock.label || "Study");
    bn.font = Font.mediumSystemFont(14);
    bn.textColor = C.text;
    bn.lineLimit = 1;

    const bt = right.addText(`${fmtAmPm(focusBlock.start)} – ${fmtAmPm(focusBlock.end)}`);
    bt.font = Font.systemFont(11);
    bt.textColor = C.text2;
  } else {
    const freeEl = right.addText("Free now");
    freeEl.font = Font.systemFont(13);
    freeEl.textColor = C.text3;
  }

} else {
  // Lock screen (accessoryCircular / accessoryRectangular)
  const pctNum = w.addText(`${Math.round(pct*100)}%`);
  pctNum.font = Font.boldSystemFont(16);
  pctNum.textColor = C.text;

  const sub = w.addText(fmtH(todayH) + " today");
  sub.font = Font.systemFont(10);
  sub.textColor = C.text2;
}

Script.setWidget(w);
Script.complete();
