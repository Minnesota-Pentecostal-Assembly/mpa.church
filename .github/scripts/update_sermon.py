"""Show the newest video from the MPA Church YouTube channel on the homepage.

Run by .github/workflows/update-blog.yml. Reads the channel's public feed and rewrites only
the part of index.html between <!-- SERMON:START ... --> and <!-- SERMON:END -->.
Shorts and upcoming (not yet streamed) videos are skipped. If the feed can't be fetched,
the page is left unchanged.

Test locally with a saved feed:  python3 .github/scripts/update_sermon.py feed.xml
"""
import html
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime

CHANNEL_ID = "UCBfc7kwhBeydq8OCBtsy4SQ"
FEED_URL = "https://www.youtube.com/feeds/videos.xml?channel_id=" + CHANNEL_ID
PAGE = "index.html"

NS = {
    "a": "http://www.w3.org/2005/Atom",
    "yt": "http://www.youtube.com/xml/schemas/2015",
    "media": "http://search.yahoo.com/mrss/",
}


def load_feed():
    if len(sys.argv) > 1:
        with open(sys.argv[1], "rb") as f:
            return f.read()
    req = urllib.request.Request(FEED_URL, headers={"User-Agent": "MPA-Church-site-updater/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def pick_latest(xml_bytes):
    root = ET.fromstring(xml_bytes)
    for entry in root.findall("a:entry", NS):
        vid = (entry.findtext("yt:videoId", "", NS) or "").strip()
        title = (entry.findtext("a:title", "", NS) or "").strip()
        link = entry.find("a:link", NS)
        href = link.get("href", "") if link is not None else ""
        if not vid or not title:
            continue
        if "/shorts/" in href or "#short" in title.lower():
            continue
        stats = entry.find("media:group/media:community/media:statistics", NS)
        if stats is not None and stats.get("views") == "0":
            continue  # upcoming stream or premiere that hasn't happened yet
        published = (entry.findtext("a:published", "", NS) or "").strip()
        try:
            date = datetime.fromisoformat(published.replace("Z", "+00:00"))
        except ValueError:
            date = None
        return vid, title, date
    return None


def render(vid, title, date):
    t = html.escape(title)
    when = f"Posted {date:%b} {date.day}, {date.year}" if date else "On our YouTube channel"
    return (
        f'<div class="al-video reveal">\n'
        f'<button type="button" class="al-frame yt-facade" data-yt="{vid}" aria-label="Play video: {t}">'
        f'<img src="https://i.ytimg.com/vi/{vid}/hqdefault.jpg" alt="" width="480" height="360" loading="lazy" decoding="async">'
        f'<span class="al-play" aria-hidden="true"></span></button>\n'
        f'<div class="al-meta"><div><small>Latest from YouTube</small><strong>{t}</strong><span>{when}</span></div>'
        f'<a class="al-link" href="sermons">All sermons &rarr;</a></div>\n'
        f'</div>\n'
    )


def main():
    try:
        latest = pick_latest(load_feed())
    except Exception as e:  # network or parse problem: keep the page as it is
        print(f"Could not read feed: {e}")
        return
    if not latest:
        print("No suitable video in feed; page unchanged.")
        return
    with open(PAGE, encoding="utf-8") as f:
        page = f.read()
    pat = re.compile(r"(<!-- SERMON:START[^>]*-->\n).*?(<!-- SERMON:END -->)", re.S)
    if not pat.search(page):
        print("Markers not found in index.html; page unchanged.")
        return
    new = pat.sub(lambda m: m.group(1) + render(*latest) + m.group(2), page, count=1)
    if new != page:
        with open(PAGE, "w", encoding="utf-8") as f:
            f.write(new)
        print(f"Updated latest video: {latest[1]} ({latest[0]})")
    else:
        print("Latest video unchanged.")


if __name__ == "__main__":
    main()
