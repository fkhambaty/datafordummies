#!/usr/bin/env python3
"""Warn when a stamped major dependency is older than the public release.

Offline mode checks that the stamp date is not older than 90 days.
Online mode also reads the PyPI version of apache-airflow.
It prints versions. It does not change lesson text.
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STAMP = ROOT / "data" / "course-versions.json"
MAX_AGE_DAYS = 90


def major(version: str) -> str:
    return version.split(".", 1)[0]


def pypi_version(name: str) -> str | None:
    url = f"https://pypi.org/pypi/{name}/json"
    try:
        with urllib.request.urlopen(url, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception as exc:  # noqa: BLE001 — a failed lookup is a report, not a guess
        print(f"could not read {url}: {exc}")
        return None
    return payload.get("info", {}).get("version")


def main() -> int:
    parser = argparse.ArgumentParser(description="Check course dependency stamps.")
    parser.add_argument("--online", action="store_true", help="Compare the Airflow stamp with PyPI")
    args = parser.parse_args()
    stamp = json.loads(STAMP.read_text(encoding="utf-8"))
    checked = date.fromisoformat(stamp["checked_on"])
    age = (date.today() - checked).days
    print(f"vendor stamp {stamp['checked_on']} is {age} days old")
    if age > MAX_AGE_DAYS:
        print(f"STALE stamp is older than {MAX_AGE_DAYS} days. Follow docs/VENDOR_REFRESH.md.")
        return 1
    if not args.online:
        print("offline check ok")
        return 0
    problems = 0
    for item in stamp.get("dependencies", []):
        if item.get("source") != "pypi":
            continue
        latest = pypi_version(item["name"])
        if not latest:
            print(f"SKIP {item['name']}: public version was not read")
            continue
        print(f"{item['name']}: stamped {item['stamped']}, pypi {latest}")
        if major(latest) != major(item["stamped"]):
            print(f"ALERT {item['name']} major version changed. Re-read the vendor docs before editing lessons.")
            problems += 1
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
