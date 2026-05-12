#!/usr/bin/env bash
# StudyTrack macOS Menu Bar — paste into SwiftBar plugins folder
# Refreshes every second. Supabase is only queried every 30s (cached locally).
# Requires: curl, python3 (both pre-installed on macOS)
# <swiftbar.hideAbout>true</swiftbar.hideAbout>
# <swiftbar.hideRunInTerminal>true</swiftbar.hideRunInTerminal>
# <swiftbar.hideLastUpdated>true</swiftbar.hideLastUpdated>
# <swiftbar.hideDisablePlugin>true</swiftbar.hideDisablePlugin>

SB_URL="https://epaiazxcdcseijkhrncm.supabase.co"
SB_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwYWlhenhjZGNzZWlqa2hybmNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMjQ0MzQsImV4cCI6MjA5MjYwMDQzNH0.h2t_kFLZ_YPvuJlzPPiyXVbOnW4Ub_52hdaYosMoOus"
CACHE_FILE="/tmp/studytrack_cache.json"
CACHE_TTL=30   # seconds between Supabase fetches

python3 - <<PYEOF
import json, urllib.request, datetime, time, os, sys

SB_URL    = "$SB_URL"
SB_KEY    = "$SB_KEY"
APP_URL   = "https://noshnoshnoah999.github.io/studytrack/"
CACHE_FILE = "$CACHE_FILE"
CACHE_TTL  = $CACHE_TTL

# ── Cache helpers ─────────────────────────────────────────────────────────────
def load_cache():
    try:
        with open(CACHE_FILE) as f:
            c = json.load(f)
        if time.time() - c.get("_ts", 0) < CACHE_TTL:
            return c   # still fresh
    except:
        pass
    return None

def save_cache(data):
    data["_ts"] = time.time()
    try:
        with open(CACHE_FILE, "w") as f:
            json.dump(data, f)
    except:
        pass

def sb_get(key, raw):
    try:
        req = urllib.request.Request(
            f"{SB_URL}/rest/v1/study_data?key=eq.{key}&select=value",
            headers={"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}"}
        )
        with urllib.request.urlopen(req, timeout=5) as r:
            rows = json.loads(r.read())
            if not rows: return None
            v = rows[0]["value"]
            return json.loads(v) if isinstance(v, str) else v
    except:
        return raw.get(key)   # fall back to cached value on network error

# ── Fetch or use cache ────────────────────────────────────────────────────────
cache = load_cache()
if cache:
    sessions  = cache.get("st_sessions")  or []
    goals     = cache.get("st_goals")     or {}
    schedule  = cache.get("st_sched")     or []
    overrides = cache.get("st_sched_overrides") or {}
    timer     = cache.get("st_timer")     or {}
    subjects  = cache.get("st_subjs")     or []
else:
    raw = {}
    sessions  = sb_get("st_sessions",  raw) or []
    goals     = sb_get("st_goals",     raw) or {}
    schedule  = sb_get("st_sched",     raw) or []
    overrides = sb_get("st_sched_overrides", raw) or {}
    timer     = sb_get("st_timer",     raw) or {}
    subjects  = sb_get("st_subjs",     raw) or []
    save_cache({
        "st_sessions": sessions, "st_goals": goals,
        "st_sched": schedule, "st_sched_overrides": overrides,
        "st_timer": timer, "st_subjs": subjects,
    })

# ── Helpers ───────────────────────────────────────────────────────────────────
def fmt_h(h):
    total = round(h * 60)
    hrs, mins = divmod(total, 60)
    if hrs and mins: return f"{hrs}h {mins}m"
    if hrs: return f"{hrs}h"
    return f"{mins}m"

def fmt_clock(secs):
    secs = max(0, int(secs))
    h = secs // 3600
    m = (secs % 3600) // 60
    s = secs % 60
    if secs < 60:
        return f"00:{s:02d}"
    return f"{h:02d}:{m:02d}"

def to_mins(t):
    if not t: return 0
    parts = t.split(":")
    return int(parts[0]) * 60 + int(parts[1] if len(parts) > 1 else 0)

now      = datetime.datetime.now()
now_ts   = time.time()
today    = now.strftime("%Y-%m-%d")
dow      = now.isoweekday() % 7   # Sun=0, Mon=1 … Sat=6
now_mins = now.hour * 60 + now.minute

# ── Timer state ───────────────────────────────────────────────────────────────
timer_running  = timer.get("running", False)
timer_start_ms = timer.get("startMs")
timer_stop_ms  = timer.get("stopMs")
timer_subj_id  = timer.get("subjectId")

timer_elapsed_secs = 0
if timer_start_ms:
    if timer_running:
        timer_elapsed_secs = (now_ts * 1000 - timer_start_ms) / 1000
    elif timer_stop_ms:
        timer_elapsed_secs = (timer_stop_ms - timer_start_ms) / 1000

timer_subj_name = ""
if timer_subj_id:
    match = next((s for s in subjects if s.get("id") == timer_subj_id), None)
    if match:
        timer_subj_name = match.get("name", timer_subj_id)

# ── Today's logged hours ──────────────────────────────────────────────────────
today_h    = sum(s["hours"] for s in sessions if s.get("date") == today)
daily_goal = goals.get("daily", 6.3)
pct        = min(100, round(today_h / daily_goal * 100)) if daily_goal else 0

# ── Today's schedule blocks ───────────────────────────────────────────────────
if today in overrides:
    today_blocks = sorted(overrides[today], key=lambda b: to_mins(b.get("start","0:0")))
else:
    today_blocks = sorted(
        [b for b in schedule if b.get("day") == dow and b.get("type") == "study"],
        key=lambda b: to_mins(b.get("start","0:0"))
    )

active = next((b for b in today_blocks
    if to_mins(b.get("start","")) <= now_mins < to_mins(b.get("end",""))), None)
nxt    = next((b for b in today_blocks
    if to_mins(b.get("start","")) > now_mins), None)

# ── Menu bar title ────────────────────────────────────────────────────────────
if timer_running and timer_elapsed_secs > 0:
    clock = fmt_clock(timer_elapsed_secs)
    label = f" · {timer_subj_name}" if timer_subj_name else ""
    title = f"⏱ {clock}{label}"
elif timer_start_ms and not timer_running:
    clock = fmt_clock(timer_elapsed_secs)
    label = f" · {timer_subj_name}" if timer_subj_name else ""
    title = f"⏹ {clock}{label}"
elif active:
    ends_in = to_mins(active.get("end","")) - now_mins
    title = f"📖 {fmt_h(today_h)}  ▶ {active.get('label','Study')} ({ends_in}m left)"
elif nxt:
    starts_in = to_mins(nxt.get("start","")) - now_mins
    title = f"📚 {fmt_h(today_h)}  ⏭ {nxt.get('label','Study')} in {starts_in}m"
else:
    done_icon = "✅" if today_h >= daily_goal else "📚"
    title = f"{done_icon} {fmt_h(today_h)} today"

print(title)
print("---")

# ── Dropdown ──────────────────────────────────────────────────────────────────
if timer_start_ms:
    clock = fmt_clock(timer_elapsed_secs)
    if timer_running:
        print(f"⏱ Timer running: {clock} | color=#5a8a60 font=.AppleSystemUIFont-Bold size=13")
    else:
        print(f"⏹ Timer stopped: {clock} | color=#b5654e font=.AppleSystemUIFont-Bold size=13")
    if timer_subj_name:
        print(f"  {timer_subj_name} | color=#555555 size=12")
    print(f"  Open to log | href={APP_URL}#timer size=11 color=#888888")
    print("---")

goal_bar = ("█" * (pct // 10)) + ("░" * (10 - pct // 10))
print(f"{goal_bar}  {pct}% of {fmt_h(daily_goal)} goal | font=Menlo size=12")
print("---")

if active:
    print(f"▶ NOW: {active.get('label','Study')} | color=#5a8a60 font=.AppleSystemUIFont-Bold size=13")
    print(f"  Ends at {active.get('end','')} | color=#555555 size=12")
    print("---")

if nxt:
    starts_in = to_mins(nxt.get("start","")) - now_mins
    print(f"⏭ Next: {nxt.get('label','Study')} at {nxt.get('start','')} | size=12")
    print(f"  Starts in {starts_in} min | color=#888888 size=11")
    print("---")

if not active and not nxt:
    print("No more blocks today | color=#888888 size=12")
    print("---")

week_ago    = (now - datetime.timedelta(days=6)).strftime("%Y-%m-%d")
week_h      = sum(s["hours"] for s in sessions if s.get("date","") >= week_ago)
weekly_goal = goals.get("weekly", 31.5)
print(f"This week: {fmt_h(week_h)} of {fmt_h(weekly_goal)} | size=12")
print("---")

print(f"Open StudyTrack | href={APP_URL} size=12")
print(f"Refresh | refresh=true size=11 color=#888888")
PYEOF
