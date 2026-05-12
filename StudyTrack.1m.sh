#!/usr/bin/env bash
# StudyTrack macOS Menu Bar — paste into SwiftBar plugins folder
# Refreshes every 1 minute. Requires: curl, python3 (both pre-installed on macOS)
# <swiftbar.hideAbout>true</swiftbar.hideAbout>
# <swiftbar.hideRunInTerminal>true</swiftbar.hideRunInTerminal>
# <swiftbar.hideLastUpdated>true</swiftbar.hideLastUpdated>
# <swiftbar.hideDisablePlugin>true</swiftbar.hideDisablePlugin>

SB_URL="https://epaiazxcdcseijkhrncm.supabase.co"
SB_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwYWlhenhjZGNzZWlqa2hybmNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMjQ0MzQsImV4cCI6MjA5MjYwMDQzNH0.h2t_kFLZ_YPvuJlzPPiyXVbOnW4Ub_52hdaYosMoOus"

fetch() {
  curl -sf \
    -H "apikey: $SB_KEY" \
    -H "Authorization: Bearer $SB_KEY" \
    "${SB_URL}/rest/v1/study_data?key=eq.${1}&select=value"
}

python3 - <<PYEOF
import json, urllib.request, datetime, sys

SB_URL = "$SB_URL"
SB_KEY = "$SB_KEY"
APP_URL = "https://noshnoshnoah999.github.io/studytrack/"

def sb_get(key):
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
        return None

def fmt_h(h):
    total = round(h * 60)
    hrs, mins = divmod(total, 60)
    if hrs and mins: return f"{hrs}h {mins}m"
    if hrs: return f"{hrs}h"
    return f"{mins}m"

def to_mins(t):
    if not t: return 0
    h, m = t.split(":")
    return int(h) * 60 + int(m)

# Fetch all data in one batch (sequential but fast enough for 1-min refresh)
sessions = sb_get("st_sessions") or []
goals    = sb_get("st_goals") or {}
schedule = sb_get("st_sched") or []
overrides = sb_get("st_sched_overrides") or {}

now   = datetime.datetime.now()
today = now.strftime("%Y-%m-%d")
dow   = now.weekday() + 1  # Mon=1 … Sun=0 — convert to JS-style Sun=0
dow   = now.isoweekday() % 7  # Sun=0, Mon=1 … Sat=6
now_mins = now.hour * 60 + now.minute

# Today's hours
today_h = sum(s["hours"] for s in sessions if s.get("date") == today)
daily_goal = goals.get("daily", 6.3)
pct = min(100, round(today_h / daily_goal * 100)) if daily_goal else 0

# Today's blocks
if today in overrides:
    today_blocks = sorted(overrides[today], key=lambda b: to_mins(b.get("start", "0:0")))
else:
    today_blocks = sorted(
        [b for b in schedule if b.get("day") == dow and b.get("type") == "study"],
        key=lambda b: to_mins(b.get("start", "0:0"))
    )

active = next((b for b in today_blocks
    if to_mins(b.get("start","")) <= now_mins < to_mins(b.get("end",""))), None)
nxt    = next((b for b in today_blocks
    if to_mins(b.get("start","")) > now_mins), None)

# ── Menu bar title ────────────────────────────────────────────────────────────
if active:
    block_label = active.get("label", "Study")
    ends_in = to_mins(active.get("end","")) - now_mins
    title = f"📖 {fmt_h(today_h)}  ▶ {block_label} ({ends_in}m left)"
elif nxt:
    starts_in = to_mins(nxt.get("start","")) - now_mins
    title = f"📚 {fmt_h(today_h)}  ⏭ {nxt.get('label','Study')} in {starts_in}m"
else:
    done_icon = "✅" if today_h >= daily_goal else "📚"
    title = f"{done_icon} {fmt_h(today_h)} today"

print(title)
print("---")

# ── Dropdown ──────────────────────────────────────────────────────────────────
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

# Weekly total
week_ago = (now - datetime.timedelta(days=6)).strftime("%Y-%m-%d")
week_h = sum(s["hours"] for s in sessions if s.get("date","") >= week_ago)
weekly_goal = goals.get("weekly", 31.5)
print(f"This week: {fmt_h(week_h)} of {fmt_h(weekly_goal)} | size=12")
print("---")

print(f"Open StudyTrack | href={APP_URL} size=12")
print(f"Refresh | refresh=true size=11 color=#888888")
PYEOF
