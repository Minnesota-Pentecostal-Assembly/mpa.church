"""Build the shared header and footer into every page before publishing.

Run by .github/workflows/static.yml. You keep editing partials/header.html and
partials/footer.html in one place; this copies them into each page's published copy,
so the menu and footer appear instantly, even if scripts fail, and search engines see them.
The files in the repo are not changed (it only edits the copy being published).
Without this step the pages still work: assets/site.js loads the partials as before.
"""
import re
from pathlib import Path

root = Path(__file__).resolve().parents[2]
partials = {}
NAV_HREFS = {"home": "./", "events": "events", "new": "im-new", "connect": "connect",
             "resources": "resources", "learn": "learn-more"}
SLOT = re.compile(r'<(header|footer)\b([^>]*?)\sdata-include="([^"]+)"([^>]*)>\s*</\1>', re.S)


def partial(path):
    if path not in partials:
        partials[path] = (root / path).read_text(encoding="utf-8")
    return partials[path]


def fill(m):
    tag, before, path, after = m.groups()
    attrs = before + after
    html = partial(path)
    nav = re.search(r'data-nav="([^"]*)"', attrs)
    if tag == "header" and nav:
        for key in nav.group(1).split():
            href = NAV_HREFS.get(key)
            if not href:
                continue
            link = f'<a class="top" href="{href}">'
            extra = ' aria-current="page"' if key in ("home", "events") else ' style="color:var(--accent-soft)"'
            html = html.replace(link, f'<a class="top" href="{href}"{extra}>', 1)
    if tag == "footer" and 'data-motto="off"' in attrs:
        html = re.sub(r'\s*<p class="foot-motto">.*?</p>', "", html, count=1, flags=re.S)
    return f"<{tag}{attrs} data-included>{html}</{tag}>"


count = 0
for page in sorted(root.glob("*.html")):
    text = page.read_text(encoding="utf-8")
    new = SLOT.sub(fill, text)
    new = re.sub(r'\s*<link rel="preload" href="partials/header\.html" as="fetch" crossorigin>', "", new)
    if new != text:
        page.write_text(new, encoding="utf-8")
        count += 1
print(f"Header and footer built into {count} pages.")
