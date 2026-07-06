#!/usr/bin/env python3
"""
Build the YEAR_DATA constant in this folder's script.js from cpd_data.csv,
broken down by DISCIPLINE OUTCOME (the CSV's "Decision type" column) instead
of by charge.

Mirrors the charges tool exactly: one case is placed on the year parsed from
its Hearing Date, and is counted once per outcome category it touches
(deduplicated within the case). A case whose Decision type lists two outcomes
(e.g. "suspension,dismissal") is counted in each of those two categories, so
the segment counts within a year sum to >= that year's case total.

Run:  python3 build_data.py
"""
import csv, json, re
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).parent
CSV_PATH = HERE / "cpd_data.csv"
TARGET_SCRIPT_JS = HERE / "script.js"

# Display window. The CSV also holds sparse PARTIAL edge years (2016 = Oct-Dec
# only; 2026 = through mid-Jan), which the companion charges chart omits. Keep
# this window aligned with that chart for bar-for-bar comparability. Set to
# (None, None) to plot every year, marking partials via PARTIAL_YEARS in script.js.
YEAR_MIN, YEAR_MAX = 2017, 2025

# Raw "Decision type" token -> display category.
# In this dataset "dismissal" means a specification/charge was DISMISSED
# (not sustained) -- distinct from "termination"/"separation", which mean the
# officer left the force. Labeled "Charges dismissed" to avoid that confusion.
OUTCOME_LABELS = {
    "termination":                              "Termination",
    "separation":                               "Resignation",
    "resignation":                              "Resignation",
    "demotion":                                 "Demotion",
    "suspension":                               "Suspension",
    "written reprimand":                        "Written reprimand",
    "non-disciplinary letter of reinstruction": "Non-disciplinary reinstruction",
    "dismissal":                                "Charges dismissed",
}

# Stack order (bottom -> top) and colors, reusing the charges tool's palette.
GROUP_ORDER = [
    "Termination", "Resignation", "Demotion", "Suspension", "Written reprimand",
    "Non-disciplinary reinstruction", "Charges dismissed",
]
GROUP_COLORS = {
    "Termination":                    "#d64d4d",
    "Resignation":                    "#e56430",
    "Demotion":                       "#e6a94d",
    "Suspension":                     "#23685b",
    "Written reprimand":              "#5fa896",
    "Non-disciplinary reinstruction": "#a9d2cf",
    "Charges dismissed":              "#dbe7e3",
}


ID_PAT = re.compile(r"^\s*(\d{2})-\d+")

def year_of(row):
    """Year for a case: Hearing Date, else Effective date of termination,
    else the YY- prefix of the report ID (e.g. 17-126 -> 2017)."""
    for col in ("Hearing Date", "Effective date of termination"):
        m = re.search(r"(20\d\d)", (row.get(col) or "").strip())
        if m:
            return int(m.group(1))
    p = ID_PAT.match(row.get("Link to original report") or "")
    return 2000 + int(p.group(1)) if p else None

year_group_cases = defaultdict(lambda: defaultdict(int))
year_cases = defaultdict(int)
unmapped = defaultdict(int)

with open(CSV_PATH, newline="", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        year = year_of(row)
        if year is None:
            continue
        if (YEAR_MIN is not None and year < YEAR_MIN) or (YEAR_MAX is not None and year > YEAR_MAX):
            continue
        year_cases[year] += 1
        outs = [o.strip().lower() for o in (row["Decision type"] or "").split(",") if o.strip()]
        groups_this_case = set()
        for o in outs:
            g = OUTCOME_LABELS.get(o)
            if g is None:
                unmapped[o] += 1
                continue
            groups_this_case.add(g)
        for g in groups_this_case:
            year_group_cases[year][g] += 1

years_out = []
for y in sorted(year_group_cases):
    segs = [
        {"group": g, "count": year_group_cases[y][g], "color": GROUP_COLORS[g]}
        for g in GROUP_ORDER if year_group_cases[y][g] > 0
    ]
    years_out.append({"year": y, "total": year_cases[y], "segments": segs})

payload = {"groupOrder": GROUP_ORDER, "groupColors": GROUP_COLORS, "years": years_out}

if TARGET_SCRIPT_JS.exists():
    raw = TARGET_SCRIPT_JS.read_text(encoding="utf-8")
    data_json = json.dumps(payload, separators=(",", ":"))
    new_raw, n = re.subn(r"const YEAR_DATA = .*?;",
                         f"const YEAR_DATA = {data_json};", raw, count=1, flags=re.DOTALL)
    if n:
        TARGET_SCRIPT_JS.write_text(new_raw, encoding="utf-8")

print(json.dumps(payload, separators=(",", ":")))
print("\n--- per year ---")
total = sum(year_cases.values())
for y in years_out:
    print(f"  {y['year']}: {y['total']} cases")
print(f"TOTAL dated: {total}")
if unmapped:
    print("UNMAPPED:", dict(unmapped))