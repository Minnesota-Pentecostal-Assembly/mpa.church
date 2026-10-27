"""Fetch Pastor Tinku's blog feed and refresh the "Recent news" list on leadership.html.

Run by .github/workflows/update-blog.yml. Rewrites only the part of leadership.html
between <!-- BLOG:START ... --> and <!-- BLOG:END -->. If the feed can't be fetched or
has no posts, the page is left unchanged.
"""
import html
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
from email.utils import parsedate_to_datetime

FEED_URL = "http://feeds.feedburner.com/tinkuthompson"
POSTS_TO_SHOW = 8
PAGE = "leadership.html"

ATOM = "{http://www.w3.org/2005/Atom}"


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "MPA-Church-site-updater/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def parse_date(text):
    text = (text or "").strip()
    if not text:
        return None
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        pass
    try:
        return parsedate_to_datetime(text)
    except (TypeError, ValueError):
        return None


def parse_feed(data):
    root = ET.fromstring(data)
    posts = []
    if root.tag == ATOM + "feed":  # Atom (Blogger / FeedBurner default)
        for e in root.findall(ATOM + "entry"):
            title = (e.findtext(ATOM + "title") or "").strip()
            link = ""
            for l in e.findall(ATOM + "link"):
                if l.get("rel", "alternate") == "alternate" and l.get("type", "text/html") == "text/html":
                    link = l.get("href", "")
                    break
            date = parse_date(e.findtext(ATOM + "published") or e.findtext(ATOM + "updated"))
            posts.append((title, link, date))
    else:  # RSS 2.0
        for it in root.iter("item"):
            title = (it.findtext("title") or "").strip()
            link = (it.findtext("link") or "").strip()
            date = parse_date(it.findtext("pubDate"))
            posts.append((title, link, date))
    return [p for p in posts if p[0] and p[1]][:POSTS_TO_SHOW]


def render(posts):
    items = []
    for title, link, date in posts:
        when = f"{date:%B} {date.day}, {date.year}" if date else ""
        items.append(
            f'<li><a href="{html.escape(link, quote=True)}" target="_blank" rel="noopener">'
            f"<b>{html.escape(title)}</b><span>{when}</span></a></li>"
        )
    return '<ul class="post-list reveal">' + "".join(items) + "</ul>"


def main():
    try:
        posts = parse_feed(fetch(FEED_URL))
    except Exception as err:  # network or XML problem: keep the current list
        print(f"Could not read feed, leaving page unchanged: {err}")
        return 0
    if not posts:
        print("Feed had no posts, leaving page unchanged.")
        return 0
    page = open(PAGE, encoding="utf-8").read()
    pattern = re.compile(r"(<!-- BLOG:START[^>]*-->\s*).*?(\s*<!-- BLOG:END -->)", re.S)
    if not pattern.search(page):
        print("BLOG:START / BLOG:END markers not found in leadership.html")
        return 1
    updated = pattern.sub(lambda m: m.group(1) + render(posts) + m.group(2), page, count=1)
    if updated != page:
        open(PAGE, "w", encoding="utf-8").write(updated)
        print(f"Updated {PAGE} with {len(posts)} posts.")
    else:
        print("No new posts.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
