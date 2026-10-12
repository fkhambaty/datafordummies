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

# Full lesson that already had data-access="pro" without the paywall scripts.
BASELINE_PAYWALL_GAPS = frozenset({
    "python_course/s13-dataviz.html",
})


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
            <body><a href="tiny.html">Tiny</a></body></html>""",
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
        if problems:
            print("SELF-TEST fail")
            print("\n".join(problems))
            print("--- failures ---")
            print(failures)
            print("--- warnings ---")
            print(warnings)
            return 1
    print("SELF-TEST ok")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Check the static site.")
    parser.add_argument("--self-test", action="store_true", help="Run the fixture checks only")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    return print_report(check_site(ROOT))


if __name__ == "__main__":
    sys.exit(main())
