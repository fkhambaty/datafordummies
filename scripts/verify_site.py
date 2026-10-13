#!/usr/bin/env python3
"""Crawl Data For Dummies HTML and separate baseline noise from real breaks.

Hard failures (exit 1):
  - a page is missing viewport-fit=cover, or lost width=device-width / initial-scale=1.0
  - a page does not have exactly one resolvable dfd-system.css link
  - an internal link, stylesheet, script, or image does not resolve
  - a fragment target is missing and is not in the 13 Oct 2026 baseline
  - a Pro page (body data-access="pro") lost paywall.js or supabase-auth.js
    and is not the known pre-existing gap

Warnings (exit 0):
  - hub-linked stubs: under 120 lines, or a boilerplate phrase
  - the frozen fragment and paywall baselines
  - a link into the retired supabase/ tree
  - external http(s), mailto, tel, and data links are skipped, not fetched

Usage:
  python3 scripts/verify_site.py
  python3 scripts/verify_site.py --self-test
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import tempfile
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
SKIP_PARTS = {".git", "node_modules", "supabase"}
STUB_LINE_LIMIT = 120
BOILERPLATE = (
    "every concept is broken down into simple analogies that anyone can understand",
    "every concept is explained like you're 5 years old",
    "eli5 coming up",
    "lesson coming",
    "coming soon",
    "under construction",
    "this page is a stub",
)

# Anchors the course index already points at, before those lessons grew ids.
BASELINE_FRAGMENTS = frozenset({
    "postgres_course/index.html -> sql-basics.html#create",
    "postgres_course/index.html -> sql-basics.html#insert",
    "postgres_course/index.html -> sql-basics.html#select",
    "postgres_course/index.html -> sql-basics.html#update",
    "postgres_course/index.html -> querying.html#operators",
    "postgres_course/index.html -> querying.html#order",
    "postgres_course/index.html -> querying.html#patterns",
    "postgres_course/index.html -> querying.html#nulls",
    "postgres_course/index.html -> aggregations.html#groupby",
    "postgres_course/index.html -> aggregations.html#having",
    "postgres_course/index.html -> aggregations.html#distinct",
    "postgres_course/index.html -> joins.html#inner",
    "postgres_course/index.html -> joins.html#left",
    "postgres_course/index.html -> joins.html#full",
    "postgres_course/index.html -> joins.html#practice",
    "postgres_course/index.html -> subqueries-ctes.html#correlated",
    "postgres_course/index.html -> subqueries-ctes.html#cte",
    "postgres_course/index.html -> subqueries-ctes.html#recursive",
    "postgres_course/index.html -> indexes.html#types",
    "postgres_course/index.html -> indexes.html#explain",
    "postgres_course/index.html -> indexes.html#optimize",
    "postgres_course/index.html -> functions.html#custom",
    "postgres_course/index.html -> functions.html#procedures",
    "postgres_course/index.html -> functions.html#triggers",
    "postgres_course/index.html -> transactions.html#acid",
    "postgres_course/index.html -> transactions.html#isolation",
    "postgres_course/index.html -> transactions.html#deadlocks",
    "terraform_course/hub.html -> index.html#workspaces",
})

# Pro pages that already lacked paywall scripts before this checker existed.
# Empty once python_course/s13-dataviz.html gained the scripts.
BASELINE_PAYWALL_GAPS = frozenset()


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: set[str] = set()
        self.names: set[str] = set()
        self.anchors: list[str] = []
        self.assets: list[tuple[str, str]] = []
        self.stylesheets: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        data = {key: value for key, value in attrs if value is not None}
        if "id" in data:
            self.ids.add(data["id"])
        if tag == "a":
            if "name" in data:
                self.names.add(data["name"])
            if "href" in data:
                self.anchors.append(data["href"])
        if tag == "link" and "href" in data:
            self.assets.append(("link", data["href"]))
            rel = (data.get("rel") or "").lower()
            if "stylesheet" in rel or data["href"].endswith("dfd-system.css"):
                self.stylesheets.append(data["href"])
        if tag == "script" and "src" in data:
            self.assets.append(("script", data["src"]))
        if tag in {"img", "source", "video"} and "src" in data:
            self.assets.append((tag, data["src"]))


def rel_posix(path: Path, root: Path) -> str:
    return path.resolve().relative_to(root.resolve()).as_posix()


def html_files(root: Path) -> list[Path]:
    found = []
    for path in root.rglob("*.html"):
        if any(part in SKIP_PARTS for part in path.parts):
            continue
        if path.name.endswith(".backup"):
            continue
        found.append(path)
    return sorted(found)


def is_external(url: str) -> bool:
    value = url.strip()
    return value.startswith((
        "http://", "https://", "//", "mailto:", "tel:", "javascript:", "data:",
    ))


def viewport_problem(text: str) -> str | None:
    metas = re.findall(r"<meta\b[^>]*>", text, flags=re.I)
    views = [tag for tag in metas if re.search(r"\bname\s*=\s*([\'\"])viewport\1", tag, flags=re.I)]
    if len(views) != 1:
        return f"{len(views)} viewport meta tags"
    match = re.search(r"\bcontent\s*=\s*([\'\"])(.*?)\1", views[0], flags=re.I)
    if not match:
        return "viewport meta has no content"
    content = match.group(2)
    if not re.search(r"width\s*=\s*device-width", content):
        return "viewport lost width=device-width"
    if not re.search(r"initial-scale\s*=\s*1(?:\.0)?", content):
        return "viewport lost initial-scale"
    if not re.search(r"viewport-fit\s*=\s*cover", content):
        return "viewport missing viewport-fit=cover"
    return None


def split_url(url: str) -> tuple[str, str]:
    without_query = url.split("?", 1)[0]
    path, _, fragment = without_query.partition("#")
    return unquote(path), fragment


def resolve_local(page: Path, url_path: str, root: Path) -> tuple[Path | None, str | None]:
    target = (page.parent / url_path).resolve()
    try:
        target.relative_to(root.resolve())
    except ValueError:
        return None, "path escapes the site"
    return target, None


def boilerplate_hits(text: str) -> list[str]:
    lowered = text.lower()
    return [phrase for phrase in BOILERPLATE if phrase in lowered]


def check_site(root: Path) -> dict[str, list[str] | int]:
    failures: list[str] = []
    warnings: list[str] = []
    pages = html_files(root)
    parsed: dict[Path, tuple[str, PageParser]] = {}
    external = 0

    for path in pages:
        text = path.read_text(encoding="utf-8", errors="replace")
        parser = PageParser()
        try:
            parser.feed(text)
        except Exception as exc:  # noqa: BLE001 — report the page, keep crawling
            failures.append(f"FAIL {rel_posix(path, root)} HTML parse error: {exc}")
            continue
        parsed[path.resolve()] = (text, parser)
        rel = rel_posix(path, root)
        problem = viewport_problem(text)
        if problem:
            failures.append(f"FAIL {rel} {problem}")
        if 'http-equiv="refresh"' in text.lower() or "http-equiv='refresh'" in text.lower():
            failures.append(f"FAIL {rel} meta refresh traps the browser back button")
        if re.search(r"<iframe\b[^>]*\bsrc\s*=\s*[\"'][^\"']*(?:youtube\.com|youtube-nocookie\.com|youtu\.be)", text, re.I):
            failures.append(f"FAIL {rel} a YouTube iframe loads on its own and traps the back button")
        if 'class="top-nav"' in text and "nav-dropdown-panel" in text and "hub-script.js" not in text and "tool-nav.js" not in text:
            failures.append(f"FAIL {rel} tool navigation has no mobile menu script")
        system = [href for href in parser.stylesheets if href.split("?", 1)[0].endswith("dfd-system.css")]
        if len(system) != 1:
            failures.append(f"FAIL {rel} has {len(system)} dfd-system.css links")
        else:
            css_path, _fragment = split_url(system[0])
            target, escape = resolve_local(path, css_path, root)
            if escape or target is None or not target.is_file():
                failures.append(f"FAIL {rel} dfd-system.css does not resolve ({system[0]})")

    page_by_path = {path.resolve(): parser for path, (_text, parser) in parsed.items()}

    for path, (text, parser) in parsed.items():
        rel = rel_posix(path, root)
        body = re.search(r"<body\b([^>]*)>", text, flags=re.I)
        if body and re.search(r"data-access\s*=\s*([\'\"])pro\1", body.group(1), flags=re.I):
            missing = [name for name in ("paywall.js", "supabase-auth.js") if name not in text]
            if missing:
                message = f"{rel} is Pro and missing {', '.join(missing)}"
                if rel in BASELINE_PAYWALL_GAPS:
                    warnings.append("WARN baseline paywall " + message)
                else:
                    failures.append("FAIL " + message)

        for kind, url in [("a", href) for href in parser.anchors] + parser.assets:
            raw = url.strip()
            if not raw or raw in {"#", "..."}:
                continue
            if is_external(raw):
                external += 1
                continue
            url_path, fragment = split_url(raw)
            if not url_path:
                if fragment and fragment not in parser.ids and fragment not in parser.names:
                    key = f"{rel} -> {raw}"
                    line = f"{key} fragment is missing"
                    if key in BASELINE_FRAGMENTS:
                        warnings.append("WARN baseline fragment " + line)
                    else:
                        failures.append("FAIL " + line)
                continue
            target, escape = resolve_local(path, url_path, root)
            if escape or target is None:
                failures.append(f"FAIL {rel} {kind} {raw} {escape or 'unresolved'}")
                continue
            retired = "supabase" in target.parts
            if not target.exists():
                if retired:
                    warnings.append(f"WARN retired {rel} -> {raw}")
                else:
                    failures.append(f"FAIL {rel} {kind} missing {raw}")
                continue
            if fragment and target.suffix.lower() == ".html":
                dest = page_by_path.get(target.resolve())
                if dest is None:
                    continue
                if fragment not in dest.ids and fragment not in dest.names:
                    key = f"{rel} -> {raw.split('?', 1)[0]}"
                    line = f"{key} fragment is missing"
                    if key in BASELINE_FRAGMENTS:
                        warnings.append("WARN baseline fragment " + line)
                    else:
                        failures.append("FAIL " + line)

    hubs = [path for path in parsed if path.name == "hub.html"]
    stub_hits: dict[str, list[str]] = {}
    for hub in hubs:
        _text, parser = parsed[hub]
        hub_rel = rel_posix(hub, root)
        for href in parser.anchors:
            if is_external(href) or href.strip() in {"", "#", "..."}:
                continue
            url_path, _fragment = split_url(href)
            if not url_path.lower().endswith(".html"):
                continue
            target, escape = resolve_local(hub, url_path, root)
            if escape or target is None or not target.is_file():
                continue
            if target.resolve() not in parsed:
                continue
            # A hub is a course map. ClickHouse and Redshift link each other's
            # short hubs. That is not an unfinished lesson. Lesson pages stay
            # subject to the line and boilerplate checks.
            if target.name == "hub.html" or target.name in {
                "privacy.html", "terms.html", "cancellation.html", "refunds.html",
            }:
                continue
            target_text, _parser = parsed[target.resolve()]
            lines = len(target_text.splitlines())
            phrases = boilerplate_hits(target_text)
            if lines < STUB_LINE_LIMIT or phrases:
                reason = []
                if lines < STUB_LINE_LIMIT:
                    reason.append(f"{lines} lines")
                if phrases:
                    reason.append("boilerplate: " + phrases[0])
                stub_hits.setdefault(rel_posix(target, root), []).append(
                    f"{hub_rel} ({'; '.join(reason)})"
                )
    for target, sources in sorted(stub_hits.items()):
        warnings.append(
            f"WARN baseline stub {target} linked from {', '.join(sources)}"
        )

    return {
        "failures": failures,
        "warnings": warnings,
        "pages": len(parsed),
        "external": external,
    }


def check_discoverability(root: Path) -> list[str]:
    failures: list[str] = []
    robots = root / "robots.txt"
    sitemap = root / "sitemap.xml"
    if not robots.is_file() or "Sitemap: https://datafordummies.in/sitemap.xml" not in robots.read_text(encoding="utf-8"):
        failures.append("FAIL robots.txt must allow crawling and point at the sitemap")
    pages = html_files(root)
    locs = []
    if sitemap.is_file():
        locs = re.findall(r"<loc>(.*?)</loc>", sitemap.read_text(encoding="utf-8"))
    else:
        failures.append("FAIL sitemap.xml is missing")

    def file_url(rel: str) -> str:
        if rel == "index.html":
            return "https://datafordummies.in/"
        if rel.endswith("/index.html"):
            return "https://datafordummies.in/" + rel[: -len("index.html")]
        return "https://datafordummies.in/" + rel

    expected = [file_url(rel_posix(path, root)) for path in pages]
    if sitemap.is_file() and sorted(locs) != sorted(expected):
        missing = sorted(set(expected) - set(locs))[:5]
        extra = sorted(set(locs) - set(expected))[:5]
        failures.append(
            f"FAIL sitemap has {len(locs)} urls for {len(expected)} pages"
            + (f"; missing {missing}" if missing else "")
            + (f"; extra {extra}" if extra else "")
        )

    descriptions: dict[str, str] = {}
    for path in pages:
        text = path.read_text(encoding="utf-8", errors="replace")
        rel = rel_posix(path, root)
        if "cdn.jsdelivr.net/npm/@supabase/supabase-js" in text:
            failures.append(f"FAIL {rel} still loads the Supabase CDN")
        if "firebase.initializeApp" in text:
            failures.append(f"FAIL {rel} still initializes Firebase")
        if "Community access" in text:
            failures.append(f"FAIL {rel} still says Community access")
        for label, pattern in (
            ("description", r"<meta\b[^>]*name=[\"']description[\"'][^>]*>"),
            ("canonical", r"<link\b[^>]*rel=[\"']canonical[\"'][^>]*>"),
            ("og:title", r"<meta\b[^>]*property=[\"']og:title[\"'][^>]*>"),
            ("og:description", r"<meta\b[^>]*property=[\"']og:description[\"'][^>]*>"),
            ("og:url", r"<meta\b[^>]*property=[\"']og:url[\"'][^>]*>"),
        ):
            found = re.findall(pattern, text, flags=re.I)
            if len(found) != 1:
                failures.append(f"FAIL {rel} has {len(found)} {label} tags")
        match = re.search(
            r"<meta\b[^>]*name=([\"'])description\1[^>]*content=([\"'])(.*?)\2",
            text,
            flags=re.I,
        )
        if match:
            descriptions[rel] = match.group(3)
    seen: dict[str, str] = {}
    for rel, text in descriptions.items():
        if text in seen:
            failures.append(f"FAIL duplicate description on {rel} and {seen[text]}")
        else:
            seen[text] = rel

    if (root / "index.html").is_file():
        home = (root / "index.html").read_text(encoding="utf-8", errors="replace")
        if '"@type": "Organization"' not in home and '"@type":"Organization"' not in home:
            failures.append("FAIL index.html is missing Organization structured data")
        if "text-based course" not in home or "one book for many technologies" not in home:
            failures.append("FAIL index.html does not explain that this is a text-based course")
        if "<iframe" in home and "youtube" in home.lower():
            failures.append("FAIL index.html still auto-loads a YouTube iframe")
        for href in ("privacy.html", "terms.html", "cancellation.html", "refunds.html"):
            if href not in home:
                failures.append(f"FAIL index.html does not link {href}")
    for rel in ("pricing.html", "auth/signup.html"):
        page = root / rel
        if not page.is_file():
            continue
        text = page.read_text(encoding="utf-8", errors="replace")
        for href in ("privacy.html", "terms.html", "cancellation.html", "refunds.html"):
            if href not in text:
                failures.append(f"FAIL {rel} does not link {href}")
    profile = root / "auth" / "profile.html"
    if profile.is_file() and 'id="certificates"' not in profile.read_text(encoding="utf-8", errors="replace"):
        failures.append("FAIL auth/profile.html is missing the certificates section")
    for apk in ("app-debug.apk", "apk/FK-Learning-Hub.apk"):
        if (root / apk).exists():
            failures.append(f"FAIL tracked app binary still present: {apk}")
    catalog_path = root / "data" / "course-catalog.json"
    if catalog_path.is_file():
        catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
        for course in catalog.get("courses", {}).values():
            hub = root / course["hub"]
            if not hub.is_file():
                failures.append(f"FAIL catalog hub missing {course['hub']}")
                continue
            hub_text = hub.read_text(encoding="utf-8", errors="replace")
            if "hub-learning.js" not in hub_text:
                failures.append(f"FAIL {course['hub']} is missing the hub guide")
            if '"@type": "Course"' not in hub_text and '"@type":"Course"' not in hub_text:
                failures.append(f"FAIL {course['hub']} is missing Course structured data")
    return failures


def print_report(result: dict[str, list[str] | int]) -> int:
    failures = result["failures"]
    warnings = result["warnings"]
    print(f"pages crawled: {result['pages']}")
    print(f"external links skipped: {result['external']}")
    print(f"baseline warnings: {len(warnings)}")
    print(f"hard failures: {len(failures)}")
    for line in warnings:
        print(line)
    for line in failures:
        print(line)
    if failures:
        print("RESULT fail")
        return 1
    print("RESULT ok")
    return 0


def self_test() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "css").mkdir()
        (root / "css" / "dfd-system.css").write_text("/* test */\n", encoding="utf-8")
        (root / "supabase").mkdir()
        good = """<!DOCTYPE html><html><head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
            <link rel="stylesheet" href="css/dfd-system.css">
            </head><body>
            <a href="other.html#here">other</a>
            <a href="https://example.com/docs">external</a>
            <a href="supabase/gone.html">retired</a>
            </body></html>"""
        (root / "good.html").write_text(good, encoding="utf-8")
        (root / "other.html").write_text(
            """<!DOCTYPE html><html><head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
            <link rel="stylesheet" href="css/dfd-system.css"></head>
            <body><h2 id="here">Here</h2></body></html>""",
            encoding="utf-8",
        )
        (root / "hub.html").write_text(
            """<!DOCTYPE html><html><head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
            <link rel="stylesheet" href="css/dfd-system.css"></head>
            <body><a href="tiny.html">Tiny</a>
            <a href="clickhouse_course/hub.html">ClickHouse hub</a></body></html>""",
            encoding="utf-8",
        )
        short_hub = root / "clickhouse_course"
        short_hub.mkdir()
        (short_hub / "hub.html").write_text(
            """<!DOCTYPE html><html><head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
            <link rel="stylesheet" href="../css/dfd-system.css"></head>
            <body><p>Course map.</p></body></html>""",
            encoding="utf-8",
        )
        (root / "tiny.html").write_text(
            """<!DOCTYPE html><html><head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
            <link rel="stylesheet" href="css/dfd-system.css"></head>
            <body><p>coming soon</p></body></html>""",
            encoding="utf-8",
        )
        (root / "broken.html").write_text(
            """<!DOCTYPE html><html><head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
            <link rel="stylesheet" href="css/dfd-system.css">
            <link rel="stylesheet" href="css/dfd-system.css"></head>
            <body data-access="pro"><a href="missing.html">gone</a>
            <a href="other.html#nope">bad fragment</a></body></html>""",
            encoding="utf-8",
        )
        course = root / "postgres_course"
        course.mkdir()
        (course / "index.html").write_text(
            """<!DOCTYPE html><html><head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
            <link rel="stylesheet" href="../css/dfd-system.css"></head>
            <body><a href="sql-basics.html#create">create</a></body></html>""",
            encoding="utf-8",
        )
        (course / "sql-basics.html").write_text(
            """<!DOCTYPE html><html><head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
            <link rel="stylesheet" href="../css/dfd-system.css"></head>
            <body><p>No anchor yet.</p></body></html>""",
            encoding="utf-8",
        )
        result = check_site(root)
        failures = "\n".join(result["failures"])
        warnings = "\n".join(result["warnings"])
        expected_fail = [
            "broken.html has 2 dfd-system.css links",
            "broken.html is Pro and missing",
            "missing.html",
            "other.html#nope",
        ]
        expected_warn = [
            "baseline stub tiny.html",
            "WARN retired",
            "baseline fragment postgres_course/index.html -> sql-basics.html#create",
        ]
        problems = []
        for needle in expected_fail:
            if needle not in failures:
                problems.append("missing failure: " + needle)
        for needle in expected_warn:
            if needle not in warnings:
                problems.append("missing warning: " + needle)
        if "good.html" in failures or "other.html has" in failures:
            problems.append("clean pages were marked failed")
        if any("tiny.html" in line and line.startswith("FAIL") for line in result["failures"]):
            problems.append("stub was a hard failure")
        if any("clickhouse_course/hub.html" in line for line in result["warnings"]):
            problems.append("short hub was treated as a lesson stub")
        if problems:
            print("SELF-TEST fail")
            print("\n".join(problems))
            print("--- failures ---")
            print(failures)
            print("--- warnings ---")
            print(warnings)
            return 1
        with tempfile.TemporaryDirectory() as seo_tmp:
            seo_root = Path(seo_tmp)
            (seo_root / "robots.txt").write_text(
                "User-agent: *\nAllow: /\n\nSitemap: https://datafordummies.in/sitemap.xml\n",
                encoding="utf-8",
            )
            page = """<!DOCTYPE html><html><head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
                <meta name="description" content="Only page.">
                <link rel="canonical" href="https://datafordummies.in/only.html">
                <meta property="og:title" content="Only">
                <meta property="og:description" content="Only page.">
                <meta property="og:url" content="https://datafordummies.in/only.html">
                <link rel="stylesheet" href="css/missing.css">
                </head><body><p>Only page for the discoverability self-test with enough words.</p></body></html>"""
            (seo_root / "only.html").write_text(page, encoding="utf-8")
            (seo_root / "sitemap.xml").write_text(
                "<urlset><loc>https://datafordummies.in/only.html</loc></urlset>",
                encoding="utf-8",
            )
            seo_failures = check_discoverability(seo_root)
            if seo_failures:
                print("SELF-TEST fail")
                print("\n".join(seo_failures))
                return 1
            (seo_root / "only.html").write_text(page.replace("Only page.", "Same.", 1), encoding="utf-8")
            (seo_root / "other.html").write_text(page.replace("only.html", "other.html").replace("Only page.", "Same."), encoding="utf-8")
            (seo_root / "sitemap.xml").write_text(
                "<urlset><loc>https://datafordummies.in/only.html</loc><loc>https://datafordummies.in/other.html</loc></urlset>",
                encoding="utf-8",
            )
            duplicate = "\n".join(check_discoverability(seo_root))
            if "duplicate description" not in duplicate:
                print("SELF-TEST fail")
                print(duplicate)
                return 1
    print("SELF-TEST ok")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Check the static site.")
    parser.add_argument("--self-test", action="store_true", help="Run the fixture checks only")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    result = check_site(ROOT)
    result["failures"].extend(check_discoverability(ROOT))
    return print_report(result)


if __name__ == "__main__":
    sys.exit(main())
