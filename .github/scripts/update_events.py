"""Fill the "Upcoming events" list on events.html from the Planning Center calendar feed.

Run by .github/workflows/update-blog.yml. The feed link is read from the PCO_ICAL_URL
repository secret and is never written to the site or printed in the logs.
Only the part of events.html between <!-- EVENTS:START ... --> and <!-- EVENTS:END -->
is rewritten. If the feed can't be read, the page is left unchanged.

Test locally with a saved feed:  python3 .github/scripts/update_events.py calendar.ics
Needs:  pip install icalendar recurring_ical_events
"""
import html
import os
import re
import sys
import urllib.request
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import icalendar
import recurring_ical_events

PAGE = "events.html"
TZ = ZoneInfo("America/Chicago")
DAYS_AHEAD = 62          # how far ahead to look
MAX_EVENTS = 24          # most events to list
DESC_CHARS = 220         # longest description shown

# Weekly events (like Sunday services) are hidden because the Regular schedule panel covers them.
HIDE_WEEKLY = True
# Any event whose title contains one of these words is hidden (lower case).
HIDE_TITLE_WORDS = []

# Which campus an event belongs to, decided from its location and title (lower case).
# Anything that matches nothing counts as St. Paul Park.
CAMPUS_WORDS = {
    "blm": ["bloomington", "88th st"],
    "roc": ["rochester", "living hope"],
}


def load_feed():
    if len(sys.argv) > 1:
        with open(sys.argv[1], "rb") as f:
            return f.read()
    url = os.environ.get("PCO_ICAL_URL", "").strip()
    if not url:
        return None
    if url.startswith("webcal://"):
        url = "https://" + url[len("webcal://"):]
    req = urllib.request.Request(url, headers={"User-Agent": "MPA-Church-site-updater/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def clean_text(value):
    text = str(value or "")
    text = re.sub(r"<br\s*/?>|</p>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def is_weekly(component):
    rule = component.get("RRULE")
    if not rule:
        return False
    freq = (rule.get("FREQ") or [""])[0]
    interval = int((rule.get("INTERVAL") or [1])[0])
    return freq == "WEEKLY" and interval == 1


def to_local(value):
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=TZ)
        return value.astimezone(TZ), False
    return datetime(value.year, value.month, value.day, tzinfo=TZ), True


def fmt_time(dt):
    h = dt.hour % 12 or 12
    return f"{h}:{dt.minute:02d} {'AM' if dt.hour < 12 else 'PM'}"


def fmt_range(start, end, all_day):
    if all_day:
        if end and end.date() > start.date():
            return f"All day, through {end:%a} {end:%b} {end.day}"
        return "All day"
    if not end or end <= start:
        return fmt_time(start)
    a, b = fmt_time(start), fmt_time(end)
    if a[-2:] == b[-2:] and start.date() == end.date():
        a = a[:-3]
        if a.endswith(":00"):
            a = a[:-3]
        if b.split(" ")[0].endswith(":00"):
            b = b.replace(":00", "", 1)
        return f"{a} to {b}"
    return f"{a} to {b}"


def campus_of(title, location):
    text = f"{title} {location}".lower()
    for code, words in CAMPUS_WORDS.items():
        if any(w in text for w in words):
            return code
    return "spp"


def utc_stamp(dt):
    return dt.astimezone(ZoneInfo("UTC")).strftime("%Y%m%dT%H%M%SZ")


def collect(ics_bytes):
    cal = icalendar.Calendar.from_ical(ics_bytes)
    now = datetime.now(TZ)
    until = now + timedelta(days=DAYS_AHEAD)
    weekly_uids = {str(c.get("UID")) for c in cal.walk("VEVENT") if is_weekly(c)}
    items = []
    for ev in recurring_ical_events.of(cal).between(now - timedelta(hours=12), until):
        title = clean_text(ev.get("SUMMARY"))
        if not title:
            continue
        if HIDE_WEEKLY and str(ev.get("UID")) in weekly_uids:
            continue
        if any(w in title.lower() for w in HIDE_TITLE_WORDS):
            continue
        start, all_day = to_local(ev.get("DTSTART").dt)
        end = ev.get("DTEND")
        end = to_local(end.dt)[0] if end else None
        if all_day and end:
            end = end - timedelta(seconds=1)  # all-day end dates are exclusive
        if (end or start) < now:
            continue
        location = clean_text(ev.get("LOCATION"))
        desc = clean_text(ev.get("DESCRIPTION"))
        if len(desc) > DESC_CHARS:
            desc = desc[:DESC_CHARS].rsplit(" ", 1)[0] + "…"
        items.append({
            "title": title, "start": start, "end": end, "all_day": all_day,
            "location": location, "desc": desc, "campus": campus_of(title, location),
        })
    items.sort(key=lambda i: (i["start"], i["title"]))
    return items[:MAX_EVENTS]


def render(items):
    if not items:
        return ('    <p class="up-empty">No upcoming events are scheduled right now. See the '
                '<a href="https://mpa.churchcenter.com/calendar" target="_blank" rel="noopener">full church calendar</a>.</p>\n')
    e = lambda s: html.escape(s, quote=True)
    out, month = [], None
    for it in items:
        s = it["start"]
        m = (s.year, s.month)
        if m != month:
            if month:
                out.append("    </ol></div>\n")
            out.append(f'    <div class="up-grp"><h3 class="up-month">{s:%B} {s.year}</h3>\n    <ol class="up-list">\n')
            month = m
        when = fmt_range(s, it["end"], it["all_day"])
        place = it["location"].split(",")[0] if it["location"] else ""
        meta = when + (f" &middot; {e(place)}" if place else "")
        tile = "d" + ("" if it["campus"] == "spp" else " " + it["campus"])
        end = it["end"] or (s + timedelta(hours=1))
        if it["all_day"]:
            cal_start, cal_end = s.strftime("%Y%m%d"), (end + timedelta(days=1)).strftime("%Y%m%d")
        else:
            cal_start, cal_end = utc_stamp(s), utc_stamp(end)
        desc = f'<p>{e(it["desc"])}</p>' if it["desc"] else ""
        out.append(
            f'      <li data-c="{it["campus"]}" data-end="{utc_stamp(end)}"'
            f' data-title="{e(it["title"])}" data-start="{cal_start}" data-stop="{cal_end}"'
            f' data-loc="{e(it["location"])}" data-desc="{e(it["desc"])}">'
            f'<span class="{tile}"><b>{s.day}</b>{s:%a}</span>'
            f'<div><strong>{e(it["title"])}</strong><span>{meta}</span>{desc}</div>'
            f'<span class="addwrap"><button type="button" class="add" aria-expanded="false" '
            f'aria-label="Add {e(it["title"])} to your calendar">+ Add to calendar</button></span></li>\n'
        )
    out.append("    </ol></div>\n")
    return "".join(out)


def main():
    try:
        data = load_feed()
    except Exception as ex:  # never print the error text: it could include the feed link
        print(f"Could not read the calendar feed ({type(ex).__name__}); page unchanged.")
        return
    if data is None:
        print("PCO_ICAL_URL secret is not set; page unchanged.")
        return
    try:
        items = collect(data)
    except Exception as ex:
        print(f"Could not understand the calendar feed ({type(ex).__name__}); page unchanged.")
        return
    with open(PAGE, encoding="utf-8") as f:
        page = f.read()
    pat = re.compile(r"(<!-- EVENTS:START[^>]*-->\n).*?(<!-- EVENTS:END -->)", re.S)
    if not pat.search(page):
        print("Markers not found in events.html; page unchanged.")
        return
    new = pat.sub(lambda m: m.group(1) + render(items) + m.group(2), page, count=1)
    if new != page:
        with open(PAGE, "w", encoding="utf-8") as f:
            f.write(new)
        print(f"Events list updated: {len(items)} events.")
    else:
        print(f"Events list unchanged ({len(items)} events).")


if __name__ == "__main__":
    main()
