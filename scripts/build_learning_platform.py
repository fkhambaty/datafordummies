#!/usr/bin/env python3
"""Stamp SEO, the sitemap, course facts, and policy links.

The HTML stays static. This script reads the pages and writes:
  data/course-catalog.json
  cloudflare/worker/src/course-catalog.js
  data/course-versions.json
  robots.txt
  sitemap.xml

It also inserts one description, canonical URL, and Open Graph block per page,
removes the unused Supabase browser SDK, and adds policy links plus the hub
guide on course hubs. Run it again after adding a lesson page.
"""

from __future__ import annotations

import json
import re
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://datafordummies.in"
SKIP_PARTS = {".git", "node_modules", "supabase", "mobile"}
EXCLUDE_COURSES = {"example", "python-practice"}
CHECKED_ON = "2026-10-13"
ESTIMATE = (
    "Reading time is the lesson word count divided by 180, "
    "with a floor of 4 minutes and a ceiling of 40. It is not a classroom hour."
)
PREREQUISITES = (
    "Read the lessons in the order listed. Each one assumes you read the previous lesson "
    "in this course. No other course on this site is required first."
)
VENDOR_NOTES = {
    "airflow": "Lessons were framed on 13 October 2026 for Apache Airflow 3.3.2.",
    "dbt": "Lessons were framed on 13 October 2026 for the dbt Developer Hub, Fusion v2.0.8, and dbt-core as the Apache-licensed runtime.",
    "clickhouse": "Lessons were framed on 13 October 2026 for MergeTree, the JSON type since 25.3, and ClickHouse Cloud SharedMergeTree.",
    "postgres": "Lessons were framed on 13 October 2026 for PostgreSQL 18.6 as the current major, with 17, 16, and 15 still supported. PostgreSQL 14 support was dated through 12 November 2026.",
    "mssql": "Lessons were framed on 13 October 2026 for SQL Server 2017, 2019, 2022, and 2025. SQL Server 2016 extended support had ended on 15 July 2026.",
    "redshift": "Lessons keep the October 2026 caveats on zero-ETL, data sharing, RA3, Serverless, and Spectrum. They do not tell a new warehouse to start on DC2.",
    "metabase": "Lessons keep Cloud, self-host, embedding, models, and permissions. They do not publish an application-database password.",
    "snowflake": "Thirteen lessons are on the hub. Two are free. No separate vendor patch version is stamped.",
    "kubernetes": "Lessons do not pin one patch release. The Gateway API 1.5 notes cited Kubernetes 1.30 or later for that release.",
    "terraform": "S3 locking is described as version-dependent. OpenTofu is a separate project.",
    "dms": "Premigration assessment, DMS Schema Conversion, and the desktop AWS SCT are described as three different reports.",
    "llm": "Lessons distinguish the 2019 GPT-2 decoder from ChatGPT.",
    "python": "Sessions 13 and 14 teach matplotlib and seaborn.",
    "data-science": "The course hub is data_science_course/index.html. data-science-basics.html remains a separate overview page.",
}
CDN_RE = re.compile(
    r"\s*<script\s+src=[\"']https://cdn\.jsdelivr\.net/npm/@supabase/supabase-js@2[\"']\s*>\s*</script>",
    re.I,
)
SEO_RE = re.compile(r"\s*<!-- dfd-seo:start -->.*?<!-- dfd-seo:end -->", re.S)
META_RE = re.compile(
    r"\s*<meta\b(?=[^>]*(?:name=[\"']description[\"']|property=[\"']og:|name=[\"']twitter:))[^>]*>",
    re.I,
)
CANON_RE = re.compile(r"\s*<link\b(?=[^>]*rel=[\"']canonical[\"'])[^>]*>", re.I)
JSONLD_RE = re.compile(
    r"\s*<script\b[^>]*data-dfd-structured=[\"']1[\"'][^>]*>.*?</script>",
    re.S | re.I,
)
LEGAL_RE = re.compile(r"\s*<nav class=\"dfd-legal\"[\s\S]*?</nav>")
SUPABASE_CERT_FILES = (
    "airflow_course/script.js",
    "dbt_course/script.js",
    "metabase_course/script.js",
    "mssql_course/script.js",
    "redshift_course/script.js",
    "terraform_course/script.js",
)


def html_files(root: Path) -> list[Path]:
    found = []
    for path in root.rglob("*.html"):
        if any(part in SKIP_PARTS for part in path.parts):
            continue
        if path.name.endswith(".backup"):
            continue
        found.append(path)
    return sorted(found)


def rel_posix(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def attr(blob: str, name: str) -> str:
    match = re.search(rf"\b{name}\s*=\s*([\"'])(.*?)\1", blob, re.I | re.S)
    return unescape(match.group(2)).strip() if match else ""


def plain(fragment: str) -> str:
    text = re.sub(r"<[^>]+>", " ", fragment)
    return unescape(re.sub(r"\s+", " ", text)).strip()


def word_count(html: str) -> int:
    text = re.sub(r"<script\b[\s\S]*?</script>", " ", html, flags=re.I)
    text = re.sub(r"<style\b[\s\S]*?</style>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    return len(re.findall(r"[A-Za-z0-9']+", text))


def minutes_for(count: int) -> int:
    return max(4, min(40, round(count / 180) or 4))


def title_of(html: str, fallback: str) -> str:
    match = re.search(r"<title\b[^>]*>(.*?)</title>", html, re.I | re.S)
    if not match:
        return fallback
    return plain(match.group(1)) or fallback


def first_blurb(html: str) -> str:
    for match in re.finditer(r"<p\b[^>]*>(.*?)</p>", html, re.I | re.S):
        text = plain(match.group(1))
        if len(text) >= 40:
            return text
    return ""


def refresh_target(html: str) -> str:
    match = re.search(r"http-equiv=[\"']refresh[\"'][^>]*content=[\"'][^\"']*url=([^\"';\s]+)", html, re.I)
    if not match:
        match = re.search(r"content=[\"'][^\"']*url=([^\"';\s]+)[^\"']*[\"'][^>]*http-equiv=[\"']refresh[\"']", html, re.I)
    return unescape(match.group(1)).strip() if match else ""


def canonical_url(rel: str, html: str) -> str:
    target = refresh_target(html)
    if target and not target.startswith(("http://", "https://")):
        parent = str(Path(rel).parent)
        joined = (Path(parent) / target).as_posix() if parent != "." else target
        return canonical_url(joined, "")
    if rel == "index.html":
        return SITE + "/"
    if rel.endswith("/index.html"):
        return f"{SITE}/{rel[: -len('index.html')]}"
    return f"{SITE}/{rel}"


def depth_prefix(rel: str) -> str:
    depth = len(Path(rel).parts) - 1
    return "../" * depth


def build_catalog(pages: list[tuple[Path, str]]) -> dict:
    grouped: dict[str, list[dict]] = {}
    for path, html in pages:
        body = re.search(r"<body\b([^>]*)>", html, re.I | re.S)
        if not body:
            continue
        course_id = attr(body.group(1), "data-course-id")
        lesson_id = attr(body.group(1), "data-lesson-id")
        if not course_id or course_id in EXCLUDE_COURSES:
            continue
        if not lesson_id or lesson_id in {"hub", "index"} or path.name in {"hub.html", "index.html"}:
            continue
        if refresh_target(html):
            continue
        label = attr(body.group(1), "data-lesson-label") or title_of(html, lesson_id)
        label = re.sub(r"\s*\|\s*Data For Dummies\s*$", "", label).strip()
        count = word_count(html)
        grouped.setdefault(course_id, []).append({
            "id": lesson_id,
            "href": rel_posix(path),
            "label": label,
            "words": count,
            "minutes": minutes_for(count),
        })

    courses = {}
    for course_id, lessons in sorted(grouped.items()):
        lessons = sorted(lessons, key=lambda item: item["href"])
        folders: dict[str, int] = {}
        for lesson in lessons:
            folder = str(Path(lesson["href"]).parent)
            folders[folder] = folders.get(folder, 0) + 1
        folder = max(folders, key=folders.get)
        hub = f"{folder}/hub.html"
        if not (ROOT / hub).is_file():
            hub = f"{folder}/index.html"
        hub_html = (ROOT / hub).read_text(encoding="utf-8", errors="replace") if (ROOT / hub).is_file() else ""
        heading = ""
        h1 = re.search(r"<h1\b[^>]*>(.*?)</h1>", hub_html, re.I | re.S)
        if h1:
            heading = plain(h1.group(1))
        title = heading or title_of(hub_html, course_id)
        outcomes = first_blurb(hub_html) or title
        if len(outcomes) > 280:
            outcomes = outcomes[:277].rsplit(" ", 1)[0] + "."
        capstone = next((lesson for lesson in lessons if "capstone" in lesson["id"] or "capstone" in lesson["href"]), None)
        if capstone:
            capstone_note = "The capstone page is one of the lessons. Saving it does not issue a certificate."
            capstone_public = {"lesson_id": capstone["id"], "href": capstone["href"], "label": capstone["label"]}
        else:
            capstone_note = (
                "This course has no separate capstone page. Finishing means every lesson in this list "
                "is saved on the account. That save is not an issued certificate and not a vendor exam."
            )
            capstone_public = None
        courses[course_id] = {
            "id": course_id,
            "title": title,
            "hub": hub,
            "prerequisites": PREREQUISITES,
            "outcomes": outcomes,
            "capstone": capstone_public,
            "capstone_note": capstone_note,
            "vendor_checked_on": CHECKED_ON,
            "vendor_note": VENDOR_NOTES.get(
                course_id,
                "No separate vendor version is stamped. Re-read the vendor docs before changing a lesson.",
            ),
            "estimate": ESTIMATE,
            "minutes": sum(lesson["minutes"] for lesson in lessons),
            "lessons": lessons,
        }
    return {
        "generated_on": CHECKED_ON,
        "estimate": ESTIMATE,
        "courses": courses,
    }


def description_for(rel: str, html: str, title: str) -> str:
    target = refresh_target(html)
    if target and not target.startswith("http"):
        return f"This address opens the same page as {target}. Nothing else is published at this duplicate URL."
    if target:
        return "The Android build is downloaded from the public Google Drive folder linked on this page. It is not stored in the Git repository."
    blurb = first_blurb(html)
    short_title = re.sub(r"\s*\|\s*Data For Dummies\s*$", "", title).strip() or rel
    text = f"{short_title}. A plain-language Data For Dummies page."
    if blurb:
        sentence = blurb.split(". ")[0].strip().rstrip(".")
        if sentence and sentence.lower() not in short_title.lower():
            text = f"{short_title}. {sentence}."
    if len(text) > 180:
        text = text[:177].rsplit(" ", 1)[0] + "."
    return text


def uniquify(descriptions: dict[str, str]) -> dict[str, str]:
    seen: dict[str, str] = {}
    unique = {}
    for rel, text in descriptions.items():
        if text not in seen:
            seen[text] = rel
            unique[rel] = text
            continue
        unique[rel] = f"{text} Page: {rel}."
    return unique


def structured_data(rel: str, html: str, title: str, description: str, canonical: str, catalog: dict) -> str:
    blocks = []
    if rel == "index.html":
        blocks.append({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Data For Dummies",
            "url": SITE + "/",
            "email": "fktiindia@gmail.com",
            "sameAs": [
                "https://www.youtube.com/@fakhruddinkhambaty",
                "https://github.com/fkhambaty/datafordummies",
            ],
        })
    hub_paths = {course["hub"] for course in catalog["courses"].values()}
    if rel in hub_paths:
        course = next(item for item in catalog["courses"].values() if item["hub"] == rel)
        blocks.append({
            "@context": "https://schema.org",
            "@type": "Course",
            "name": course["title"],
            "description": course["outcomes"],
            "url": canonical,
            "provider": {
                "@type": "Organization",
                "name": "Data For Dummies",
                "url": SITE + "/",
            },
        })
    if not blocks:
        return ""
    parts = []
    for block in blocks:
        payload = json.dumps(block, ensure_ascii=False).replace("<", "\\u003c")
        parts.append(f'    <script type="application/ld+json" data-dfd-structured="1">{payload}</script>')
    return "\n" + "\n".join(parts)


def seo_block(rel: str, html: str, description: str, catalog: dict) -> str:
    title = title_of(html, rel)
    canonical = canonical_url(rel, html)
    image = f"{SITE}/logo.png"
    lines = [
        "    <!-- dfd-seo:start -->",
        f'    <meta name="description" content="{escape_attr(description)}">',
        f'    <link rel="canonical" href="{canonical}">',
        f'    <meta property="og:title" content="{escape_attr(title)}">',
        f'    <meta property="og:description" content="{escape_attr(description)}">',
        f'    <meta property="og:url" content="{canonical}">',
        '    <meta property="og:type" content="website">',
        f'    <meta property="og:image" content="{image}">',
        '    <meta name="twitter:card" content="summary_large_image">',
        structured_data(rel, html, title, description, canonical, catalog).rstrip(),
        "    <!-- dfd-seo:end -->",
    ]
    return "\n".join(line for line in lines if line.strip())


def escape_attr(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace('"', "&quot;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def legal_nav(rel: str) -> str:
    prefix = depth_prefix(rel)
    links = [
        ("privacy.html", "Privacy"),
        ("terms.html", "Terms"),
        ("cancellation.html", "Cancellation"),
        ("refunds.html", "Refunds"),
        ("shipping.html", "Digital delivery"),
        ("contact.html", "Contact"),
    ]
    anchors = "\n".join(
        f'            <a href="{prefix}{href}">{label}</a>' for href, label in links
    )
    return f'\n        <nav class="dfd-legal" aria-label="Policies">\n{anchors}\n        </nav>'


def insert_legal(rel: str, html: str) -> str:
    nav = legal_nav(rel)
    if 'class="dfd-legal"' in html:
        return re.sub(
            r'\s*<nav class="dfd-legal" aria-label="Policies">.*?</nav>',
            nav,
            html,
            count=1,
            flags=re.DOTALL,
        )
    if "</footer>" in html:
        return html.replace("</footer>", nav + "\n    </footer>", 1)
    if rel.startswith("auth/"):
        return html.replace("</body>", f'    <footer class="auth-legal">{nav}\n    </footer>\n</body>', 1)
    return html


def insert_hub_assets(rel: str, html: str, catalog: dict) -> str:
    hubs = {course["hub"] for course in catalog["courses"].values()}
    if rel not in hubs:
        return html
    prefix = depth_prefix(rel)
    if "hub-learning.css" not in html:
        html = html.replace(
            'rel="stylesheet" href="' + prefix + 'css/dfd-system.css"',
            'rel="stylesheet" href="' + prefix + 'css/hub-learning.css">\n    <link rel="stylesheet" href="' + prefix + 'css/dfd-system.css"',
            1,
        )
    if "hub-learning.js" not in html:
        html = html.replace(
            "</body>",
            f'    <script src="{prefix}js/hub-learning.js"></script>\n</body>',
            1,
        )
    return html


def stamp(rel: str, html: str, description: str, catalog: dict) -> str:
    html = SEO_RE.sub("", html)
    html = META_RE.sub("", html)
    html = CANON_RE.sub("", html)
    html = JSONLD_RE.sub("", html)
    html = CDN_RE.sub("", html)
    html = LEGAL_RE.sub("", html)
    block = seo_block(rel, html, description, catalog)
    viewport = re.search(r"<meta\b[^>]*name=[\"']viewport[\"'][^>]*>", html, re.I)
    if viewport:
        html = html[: viewport.end()] + "\n" + block + html[viewport.end() :]
    else:
        html = html.replace("</head>", block + "\n</head>", 1)
    html = insert_legal(rel, html)
    html = re.sub(r"\n[ \t]+\n(?=[ \t]*<nav class=\"dfd-legal\")", "\n\n", html)
    html = insert_hub_assets(rel, html, catalog)
    return html


def retire_fake_certificates() -> None:
    replacement = """function downloadCertificate() {
    alert('This page cannot create a certificate. Open your account page after every lesson in the course is saved. The status stays “requested” until a person issues it. There is no verification website.');
    window.location.href = '../auth/profile.html#certificates';
}

"""
    pattern = re.compile(r"function downloadCertificate\(\) \{.*?\n\}\n", re.S)
    for rel in SUPABASE_CERT_FILES:
        path = ROOT / rel
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        text = text.replace("fkti.edu/verify/", "not-issued/")
        text = pattern.sub(replacement, text, count=1)
        text = text.replace(
            "function generateCertificateHTML(name, date, score, certId) {\n    return `",
            "function generateCertificateHTML(name, date, score, certId) {\n"
            "    return '<!DOCTYPE html><title>Not issued</title><p>No certificate file is created. Check your account page.</p>';\n"
            "    return `",
        )
        text = text.replace(
            "function downloadTextCertificate(name, date, score, certId) {\n    const percentage",
            "function downloadTextCertificate(name, date, score, certId) {\n"
            "    return;\n"
            "    const percentage",
        )
        path.write_text(text, encoding="utf-8")


def write_catalog(catalog: dict) -> None:
    data_dir = ROOT / "data"
    data_dir.mkdir(exist_ok=True)
    (data_dir / "course-catalog.json").write_text(
        json.dumps(catalog, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    worker_dir = ROOT / "cloudflare" / "worker" / "src"
    payload = json.dumps(catalog, indent=2, ensure_ascii=False)
    (worker_dir / "course-catalog.js").write_text(
        "/** Generated by scripts/build_learning_platform.py. Do not edit by hand. */\n"
        f"export const COURSE_CATALOG = {payload};\n",
        encoding="utf-8",
    )
    versions = {
        "checked_on": CHECKED_ON,
        "checklist": "docs/VENDOR_REFRESH.md",
        "dependencies": [
            {
                "name": "apache-airflow",
                "source": "pypi",
                "stamped": "3.3.2",
                "course": "airflow",
                "note": "Lessons were framed for 3.3.2 on 13 October 2026.",
            }
        ],
        "courses": {
            course_id: {
                "vendor_checked_on": course["vendor_checked_on"],
                "vendor_note": course["vendor_note"],
            }
            for course_id, course in catalog["courses"].items()
        },
    }
    (data_dir / "course-versions.json").write_text(
        json.dumps(versions, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def file_url(rel: str) -> str:
    if rel == "index.html":
        return SITE + "/"
    if rel.endswith("/index.html"):
        return f"{SITE}/{rel[: -len('index.html')]}"
    return f"{SITE}/{rel}"


def write_sitemap(pages: list[tuple[Path, str]]) -> None:
    unique = []
    seen = set()
    for path, _html in pages:
        url = file_url(rel_posix(path))
        if url in seen:
            continue
        seen.add(url)
        unique.append(url)
    body = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for url in unique:
        body.append("  <url>")
        body.append(f"    <loc>{url}</loc>")
        body.append("  </url>")
    body.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(body) + "\n", encoding="utf-8")
    (ROOT / "robots.txt").write_text(
        "User-agent: *\nAllow: /\n\nSitemap: https://datafordummies.in/sitemap.xml\n",
        encoding="utf-8",
    )


def main() -> None:
    loaded = [(path, path.read_text(encoding="utf-8", errors="replace")) for path in html_files(ROOT)]
    catalog = build_catalog(loaded)
    write_catalog(catalog)
    descriptions = uniquify({
        rel_posix(path): description_for(rel_posix(path), html, title_of(html, path.name))
        for path, html in loaded
    })
    changed = 0
    for path, html in loaded:
        rel = rel_posix(path)
        updated = stamp(rel, html, descriptions[rel], catalog)
        if updated != html:
            path.write_text(updated, encoding="utf-8")
            changed += 1
    # Canonical targets are computed from the stamped file, including redirects.
    stamped = [(path, path.read_text(encoding="utf-8", errors="replace")) for path, _html in loaded]
    write_sitemap(stamped)
    retire_fake_certificates()
    print(f"courses: {len(catalog['courses'])}")
    print(f"pages stamped: {changed}")
    print(f"sitemap urls: {sum(1 for _ in open(ROOT / 'sitemap.xml', encoding='utf-8') if '<loc>' in _) }")


if __name__ == "__main__":
    main()
