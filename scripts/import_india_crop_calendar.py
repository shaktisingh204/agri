#!/usr/bin/env python3

import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from collections import OrderedDict
from pathlib import Path


NS = {
    "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "p": "http://schemas.openxmlformats.org/package/2006/relationships",
}

MONTH_ALIASES = [
    ("january", 1),
    ("jan", 1),
    ("february", 2),
    ("feb", 2),
    ("march", 3),
    ("mar", 3),
    ("april", 4),
    ("apr", 4),
    ("may", 5),
    ("june", 6),
    ("jun", 6),
    ("july", 7),
    ("jul", 7),
    ("august", 8),
    ("aug", 8),
    ("september", 9),
    ("sept", 9),
    ("sep", 9),
    ("october", 10),
    ("oct", 10),
    ("november", 11),
    ("nov", 11),
    ("december", 12),
    ("dec", 12),
]


def normalize_text(value: str) -> str:
    value = value.replace("\u2013", "-").replace("\u2014", "-").replace("\u2019", "'")
    value = re.sub(r"([a-z])([A-Z])", r"\1 \2", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def month_list(text: str) -> list[int]:
    lowered = normalize_text(text).lower()
    if not lowered or "not practice" in lowered or lowered in {"na", "n/a"}:
      return []

    found: list[tuple[int, int]] = []
    for alias, month in MONTH_ALIASES:
        for match in re.finditer(alias, lowered):
            found.append((match.start(), month))

    found.sort(key=lambda item: item[0])

    months: list[int] = []
    for _, month in found:
        if month not in months:
            months.append(month)
    return months


def months_between(sowing: list[int], harvest: list[int]) -> list[int]:
    if not sowing or not harvest:
        return []

    current = sowing[-1]
    target = harvest[0]
    months: list[int] = []

    while True:
        current = (current % 12) + 1
        if current == target:
            break
        months.append(current)
        if len(months) > 11:
            break

    return months


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "unknown-crop"


def cell_value(cell, shared_strings: list[str]) -> str:
    cell_type = cell.attrib.get("t")
    value_node = cell.find("a:v", NS)
    if cell_type == "s" and value_node is not None:
        return shared_strings[int(value_node.text)]
    if cell_type == "inlineStr":
        return "".join(node.text or "" for node in cell.iterfind(".//a:t", NS))
    if value_node is not None and value_node.text is not None:
        return value_node.text
    return ""


def load_rows(xlsx_path: Path):
    with zipfile.ZipFile(xlsx_path) as archive:
        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            shared_root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in shared_root.findall("a:si", NS):
                shared_strings.append("".join(node.text or "" for node in item.iterfind(".//a:t", NS)))

        workbook_root = ET.fromstring(archive.read("xl/workbook.xml"))
        rels_root = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        rel_map = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels_root.findall("p:Relationship", NS)}

        extracted_rows = []

        for sheet in workbook_root.find("a:sheets", NS):
            sheet_name = sheet.attrib["name"]
            target = rel_map[sheet.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]]
            sheet_root = ET.fromstring(archive.read(f"xl/{target}"))
            rows = sheet_root.findall(".//a:sheetData/a:row", NS)

            for row in rows[2:]:
                values: dict[str, str] = {}
                for cell in row.findall("a:c", NS):
                    reference = cell.attrib.get("r", "")
                    column = "".join(ch for ch in reference if ch.isalpha())
                    values[column] = normalize_text(cell_value(cell, shared_strings))

                if not any(values.values()):
                    continue

                extracted_rows.append(
                    {
                        "sheet": sheet_name,
                        "state": values.get("B", ""),
                        "district": values.get("C", ""),
                        "districtCode": values.get("D", ""),
                        "crop": values.get("E", ""),
                        "season": values.get("F", ""),
                        "sowingPeriod": values.get("G", ""),
                        "harvestingPeriod": values.get("H", ""),
                    }
                )

        return extracted_rows


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: import_india_crop_calendar.py <input.xlsx> <output.json>")

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    rows = load_rows(input_path)

    crops = OrderedDict()
    regions = OrderedDict()
    calendars = []
    seen = set()

    for row in rows:
        state = row["state"]
        district = row["district"]
        crop_name = row["crop"]
        season = row["season"] or "Unknown"
        sowing_period = row["sowingPeriod"]
        harvesting_period = row["harvestingPeriod"]

        if not state or not district or not crop_name:
            continue

        sowing_months = month_list(sowing_period)
        harvesting_months = month_list(harvesting_period)

        if not sowing_months and not harvesting_months:
            continue

        crop_slug = slugify(crop_name)
        crops[crop_slug] = {
            "slug": crop_slug,
            "name": crop_name,
            "category": "Imported from XLSX",
        }

        region_key = f"{state}::{district}"
        regions[region_key] = {
            "name": district,
            "agroZoneName": state,
        }

        notes = f"District code: {row['districtCode'] or 'N/A'} | Source sheet: {row['sheet']} | Sowing: {sowing_period or 'N/A'} | Harvesting: {harvesting_period or 'N/A'}"
        calendar_key = (
            state,
            district,
            crop_slug,
            season,
            tuple(sowing_months),
            tuple(harvesting_months),
        )

        if calendar_key in seen:
            continue
        seen.add(calendar_key)

        calendars.append(
            {
                "countryCode": "IN",
                "countryName": "India",
                "regionName": district,
                "agroZoneName": state,
                "cropSlug": crop_slug,
                "seasonName": season,
                "year": 2026,
                "sowingMonths": sowing_months,
                "growingMonths": months_between(sowing_months, harvesting_months),
                "harvestingMonths": harvesting_months,
                "notes": notes,
            }
        )

    payload = {
        "country": {"code": "IN", "name": "India"},
        "crops": list(crops.values()),
        "regions": list(regions.values()),
        "calendars": calendars,
        "uploads": [
            {
                "filename": input_path.name,
                "fileUrl": f"/uploads/{input_path.name}",
                "status": "COMPLETED",
                "processedData": {
                    "totalRows": len(calendars),
                    "sourceRows": len(rows),
                    "states": len({calendar['agroZoneName'] for calendar in calendars}),
                    "districts": len(regions),
                    "crops": len(crops),
                },
            }
        ],
        "usageEvents": [
            {"eventName": "calendar_view", "eventGroup": "usage", "quantity": len(calendars)},
            {"eventName": "calendar_filter", "eventGroup": "usage", "quantity": max(1, len(calendars) // 2)},
            {"eventName": "region_map_open", "eventGroup": "usage", "quantity": len(regions)},
            {"eventName": "xlsx_import", "eventGroup": "admin", "quantity": 1},
        ],
    }

    output_path.write_text(json.dumps(payload, ensure_ascii=True, indent=2))
    print(json.dumps({
        "sourceRows": len(rows),
        "calendarRows": len(calendars),
        "regions": len(regions),
        "crops": len(crops),
    }))


if __name__ == "__main__":
    main()
