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

# Any event whose title contains one of these words is hidden (lower case).
HIDE_TITLE_WORDS = []

# Events that repeat every week (e.g. prayer meetings) are shown once, at their next date,
# with a note like "Every Thursday", so they don't fill up the list.
COLLAPSE_WEEKLY = True

# Online meeting links, IDs and passcodes are never published.
# An event whose location is an online meeting shows as "Online" instead,
# and its description is left out if it contains meeting details.
ONLINE_MARKERS = ["zoom.us", "zoom meeting", "meet.google", "teams.microsoft", "webex", "meeting id", "passcode", "pwd="]

# Planning Center campus tags (lower case). If an event carries one of these tags in the feed,
# the tag decides its campus. Add your exact tag names here if they differ.
CAMPUS_TAGS = {
    "spp": ["st. paul park", "st paul park", "saint paul park", "main campus"],
    "blm": ["bloomington", "mca bloomington"],
    "roc": ["rochester", "mca rochester"],
}

# Fallback for events without a campus tag: decided from location and title (lower case).
# Anything that matches nothing counts as St. Paul Park.
CAMPUS_WORDS = {
    "blm": ["bloomington", "88th st"],
    "roc": ["rochester", "living hope"],
}
URL_RE = re.compile(r"(?:https?://|www\.)\S+|\b[\w.-]+\.(?:zoom\.us|webex\.com)/\S*", re.I)


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


def has_online_details(text):
    t = (text or "").lower()
    return any(m in t for m in ONLINE_MARKERS)


def safe_location(location):
    if not location:
        return "", False
    if has_online_details(location) or URL_RE.search(location):
        return ("Online (Zoom)" if "zoom" in location.lower() else "Online"), True
    return location, False


def safe_desc(desc):
    """Drop meeting details entirely; otherwise remove any sentence that contains a web link."""
    if not desc or has_online_details(desc):
        return ""
    parts = re.split(r"(?<=[.!?])\s+", desc)
    kept = [p for p in parts if not URL_RE.search(p)]
    return URL_RE.sub("", " ".join(kept)).strip()


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


def tags_of(ev):
    """Tag names on an event, from the feed's CATEGORIES (lower case)."""
    out = []
    cats = ev.get("CATEGORIES")
    if cats is None:
        return out
    for c in (cats if isinstance(cats, list) else [cats]):
        for v in getattr(c, "cats", [c]):
            name = str(v).strip().lower()
            if name:
                out.append(name)
    return out


def campus_from_tags(tags):
    for code, names in CAMPUS_TAGS.items():
        if any(t in names for t in tags):
            return code
    return None


def campus_of(title, location):
    text = f"{title} {location}".lower()
    for code, words in CAMPUS_WORDS.items():
        if any(w in text for w in words):
            return code
    return "spp"


DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def weekday_note(days):
    names = [DAY_NAMES[d] for d in sorted(days)]
    if len(names) == 1:
        return "Every " + names[0]
    short = [n[:3] for n in names]
    return "Every " + ", ".join(short[:-1]) + " and " + short[-1]


def utc_stamp(dt):
    return dt.astimezone(ZoneInfo("UTC")).strftime("%Y%m%dT%H%M%SZ")


STATS = {"events": 0, "tagged": 0, "campus_tags": set()}
CAMPUS_NAMES = {"spp": "St. Paul Park", "blm": "Bloomington", "roc": "Rochester"}


def collect(ics_bytes):
    cal = icalendar.Calendar.from_ical(ics_bytes)
    now = datetime.now(TZ)
    until = now + timedelta(days=DAYS_AHEAD)
    items = []
    for ev in recurring_ical_events.of(cal).between(now - timedelta(hours=12), until):
        title = URL_RE.sub("", clean_text(ev.get("SUMMARY"))).strip()
        if not title:
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
        raw_desc = clean_text(ev.get("DESCRIPTION"))
        location, online = safe_location(clean_text(ev.get("LOCATION")))
        if not location and has_online_details(raw_desc):
            location, online = ("Online (Zoom)" if "zoom" in raw_desc.lower() else "Online"), True
        desc = safe_desc(raw_desc)
        if len(desc) > DESC_CHARS:
            desc = desc[:DESC_CHARS].rsplit(" ", 1)[0] + "…"
        tags = tags_of(ev)
        STATS["events"] += 1
        if tags:
            STATS["tagged"] += 1
        tag_campus = campus_from_tags(tags)
        if tag_campus:
            STATS["campus_tags"].add(tag_campus)
            campus = tag_campus
        else:
            campus = campus_of(title, location)
            if online and campus == "spp":
                campus = "online"
        items.append({
            "title": title, "start": start, "end": end, "all_day": all_day,
            "location": location, "desc": desc, "campus": campus, "repeat": "", "rrule": "",
        })
    items.sort(key=lambda i: (i["start"], i["title"]))

    if COLLAPSE_WEEKLY:
        by_title = {}
        for it in items:
            by_title.setdefault(it["title"].lower(), []).append(it)
        keep = []
        for it in items:
            series = by_title[it["title"].lower()]
            starts = [x["start"] for x in series]
            gaps = [(b - a).days for a, b in zip(starts, starts[1:])]
            weekly = len(series) >= 3 and gaps and sorted(gaps)[len(gaps) // 2] <= 7
            if not weekly:
                keep.append(it)
            elif it is series[0]:
                first = starts[0]
                days = {x.weekday() for x in starts if x < first + timedelta(days=7)}
                it["repeat"] = weekday_note(days)
                it["rrule"] = "FREQ=WEEKLY;BYDAY=" + ",".join(["MO", "TU", "WE", "TH", "FR", "SA", "SU"][d] for d in sorted(days))
                keep.append(it)
        items = keep
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
        meta = (f"{e(it['repeat'])} &middot; " if it["repeat"] else "") + when + (f" &middot; {e(place)}" if place else "")
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
            f' data-loc="{e(it["location"])}" data-desc="{e(it["desc"])}"'
            + (f' data-rrule="{it["rrule"]}" data-lstart="{s:%Y%m%dT%H%M%S}" data-lstop="{end:%Y%m%dT%H%M%S}"'
               if it["rrule"] and not it["all_day"] else "") + '>'
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
    found = ", ".join(CAMPUS_NAMES[c] for c in sorted(STATS["campus_tags"])) or "none"
    print(f"Tags: {STATS['tagged']} of {STATS['events']} events have tags in the feed; campus tags used: {found}.")
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
