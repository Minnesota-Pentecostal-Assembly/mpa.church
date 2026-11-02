"""Write sitemap.xml listing every page of the site, for search engines.

Run by .github/workflows/static.yml each time the site is published, so new pages
are added automatically. Pages marked <meta name="robots" content="noindex"> (like 404.html)
are left out. Can also be run by hand:  python3 .github/scripts/make_sitemap.py
"""
import re
from pathlib import Path

SITE = "https://mpa.church"
root = Path(__file__).resolve().parents[2]
urls = []
for page in sorted(root.glob("*.html")):
    text = page.read_text(encoding="utf-8", errors="ignore")
    if re.search(r'<meta\s+name="robots"\s+content="[^"]*noindex', text, re.I):
        continue
    slug = "" if page.stem == "index" else page.stem
    urls.append(f"{SITE}/{slug}")
urls.sort(key=lambda u: (u != f"{SITE}/", u))
body = "\n".join(f"  <url><loc>{u}</loc></url>" for u in urls)
(root / "sitemap.xml").write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + body + "\n</urlset>\n",
    encoding="utf-8")
print(f"sitemap.xml: {len(urls)} pages")
