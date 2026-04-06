from __future__ import annotations

import csv
import json
import logging
import re
import tempfile
from collections import OrderedDict
from pathlib import Path
from typing import Any
from uuid import uuid4

import httpx

from app.config import settings
from app.schemas import CommitPayload, ExtractionResult, FlaggedRow, NormalizedCalendarRow, RawCalendarRow, SyncPayload
from app.services.extractors import extract_with_pdfplumber, extract_with_tabula


logger = logging.getLogger(__name__)

MONTH_MAP = {
    "jan": 1,
    "january": 1,
    "feb": 2,
    "february": 2,
    "mar": 3,
    "march": 3,
    "apr": 4,
    "april": 4,
    "may": 5,
    "jun": 6,
    "june": 6,
    "jul": 7,
    "july": 7,
    "aug": 8,
    "august": 8,
    "sep": 9,
    "sept": 9,
    "september": 9,
    "oct": 10,
    "october": 10,
    "nov": 11,
    "november": 11,
    "dec": 12,
    "december": 12,
}

MONTH_PATTERN = re.compile(
    r"\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\b",
    re.IGNORECASE,
)

FILL_FORWARD_FIELDS = ("state", "district", "season")


def _clean_text(value: Any) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value).strip())


def _detect_header(cells: list[str]) -> dict[str, int] | None:
    mapping: dict[str, int] = {}

    for index, cell in enumerate(cells):
        normalized = _clean_text(cell).lower()
        normalized = normalized.replace("\n", " ")
        if "state" in normalized and "sub" not in normalized:
            mapping["state"] = index
        elif "district" in normalized and "code" not in normalized:
            mapping["district"] = index
        elif "crop" in normalized:
            mapping["crop"] = index
        elif "season" in normalized:
            mapping["season"] = index
        elif "sowing period" in normalized:
            mapping["sowing_from"] = index
            mapping["sowing_to"] = index
        elif "sowing" in normalized and ("from" in normalized or "start" in normalized):
            mapping["sowing_from"] = index
        elif "sowing" in normalized and ("to" in normalized or "upto" in normalized or "end" in normalized):
            mapping["sowing_to"] = index
        elif "harvesting period" in normalized:
            mapping["harvesting_from"] = index
            mapping["harvesting_to"] = index
        elif "harvesting" in normalized and ("from" in normalized or "start" in normalized):
            mapping["harvesting_from"] = index
        elif "harvesting" in normalized and ("to" in normalized or "upto" in normalized or "end" in normalized):
            mapping["harvesting_to"] = index

    base_required = {"state", "district", "crop", "season"}
    has_sowing = "sowing_from" in mapping or "sowing_to" in mapping
    has_harvesting = "harvesting_from" in mapping or "harvesting_to" in mapping
    if base_required.issubset(mapping) and has_sowing and has_harvesting:
        return mapping
    return None


def _extract_raw_rows(raw_rows: list[dict[str, Any]]) -> tuple[list[RawCalendarRow], int, list[str]]:
    parsed_rows: list[RawCalendarRow] = []
    warnings: list[str] = []
    tables_detected = len({f"{row.get('source')}:{row.get('page', 0)}:{row.get('table')}" for row in raw_rows})
    current_header: dict[str, int] | None = None
    last_seen: dict[str, str] = {}

    for row in raw_rows:
        cells = [_clean_text(cell) for cell in row.get("cells", [])]
        header_mapping = _detect_header(cells)
        if header_mapping:
            current_header = header_mapping
            continue

        if not current_header:
            continue

        extracted: dict[str, str | None] = {}
        for field_name, cell_index in current_header.items():
            value = cells[cell_index] if cell_index < len(cells) else ""
            extracted[field_name] = value or None

        for fill_field in FILL_FORWARD_FIELDS:
            if extracted.get(fill_field):
                last_seen[fill_field] = extracted[fill_field] or ""
            elif last_seen.get(fill_field):
                extracted[fill_field] = last_seen[fill_field]

        if not any(extracted.values()):
            continue

        parsed_rows.append(
            RawCalendarRow(
                **extracted,
                source=f"{row.get('source')}#p{row.get('page', 0)}-t{row.get('table', 0)}-r{row.get('row', 0)}",
            )
        )

    if not parsed_rows:
        warnings.append("No parseable rows found. Confirm PDF contains explicit header columns.")

    return parsed_rows, tables_detected, warnings


def _extract_month_candidates(value: str) -> list[int]:
    candidates: list[int] = []
    for match in MONTH_PATTERN.findall(value.lower()):
        key = match.lower()
        if key in MONTH_MAP:
            candidates.append(MONTH_MAP[key])
    return candidates


def _months_between(start_month: int, end_month: int) -> list[int]:
    if start_month <= end_month:
        return list(range(start_month, end_month + 1))
    return list(range(start_month, 13)) + list(range(1, end_month + 1))


def _parse_month_range(start_text: str | None, end_text: str | None) -> tuple[list[int] | None, str | None]:
    start_raw = _clean_text(start_text)
    end_raw = _clean_text(end_text)
    start_candidates = _extract_month_candidates(start_raw)
    end_candidates = _extract_month_candidates(end_raw)

    if not start_candidates and not end_candidates:
        merged_candidates = _extract_month_candidates(f"{start_raw} {end_raw}")
        if len(merged_candidates) >= 2:
            start_month = merged_candidates[0]
            end_month = merged_candidates[-1]
            return _months_between(start_month, end_month), None
        return None, f"Unable to resolve month range from '{start_raw}' to '{end_raw}'"

    start_month = start_candidates[0] if start_candidates else None
    end_month = end_candidates[-1] if end_candidates else None

    if start_month is None and end_month is not None:
        start_month = end_month
    if end_month is None and start_month is not None:
        end_month = start_month

    if start_month is None or end_month is None:
        return None, f"Incomplete month range from '{start_raw}' to '{end_raw}'"

    return _months_between(start_month, end_month), None


def _normalize_crop_name(crop: str) -> str:
    normalized = _clean_text(crop)
    normalized = re.sub(r"\(.*?\)", " ", normalized)
    normalized = normalized.replace("/", " ")
    normalized = re.sub(r"\b(normal|late|early|timely|timely sown)\b", " ", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized.title() if normalized else _clean_text(crop).title()


def _normalize_rows(raw_rows: list[RawCalendarRow]) -> tuple[list[NormalizedCalendarRow], list[FlaggedRow]]:
    merged: OrderedDict[tuple[str, str, str, str], dict[str, Any]] = OrderedDict()
    flagged: list[FlaggedRow] = []

    for row in raw_rows:
        state = _clean_text(row.state)
        district = _clean_text(row.district)
        crop = _clean_text(row.crop)
        season = _clean_text(row.season).title()

        if not state or not district or not crop or not season:
            flagged.append(FlaggedRow(reason="Missing required state/district/crop/season.", row=row))
            continue

        sowing_months, sowing_error = _parse_month_range(row.sowing_from, row.sowing_to)
        harvesting_months, harvesting_error = _parse_month_range(row.harvesting_from, row.harvesting_to)

        if sowing_error or harvesting_error or not sowing_months or not harvesting_months:
            reason = "; ".join(
                part
                for part in [sowing_error, harvesting_error]
                if part
            ) or "Invalid sowing or harvesting date values."
            flagged.append(FlaggedRow(reason=reason, row=row))
            continue

        normalized_crop = _normalize_crop_name(crop)
        key = (state.title(), district.title(), normalized_crop, season)
        if key not in merged:
            merged[key] = {
                "sowing": set(),
                "harvesting": set(),
            }

        merged[key]["sowing"].update(sowing_months)
        merged[key]["harvesting"].update(harvesting_months)

    normalized_rows = [
        NormalizedCalendarRow(
            state=key[0],
            district=key[1],
            crop=key[2],
            season=key[3],
            sowing_months=sorted(values["sowing"]),
            harvesting_months=sorted(values["harvesting"]),
        )
        for key, values in merged.items()
    ]

    return normalized_rows, flagged


def _write_staging_files(session_id: str, rows: list[NormalizedCalendarRow], flagged_rows: list[FlaggedRow]) -> tuple[str, str]:
    staging_dir = Path(settings.staging_dir)
    staging_dir.mkdir(parents=True, exist_ok=True)

    csv_path = staging_dir / f"{session_id}.csv"
    session_path = staging_dir / f"{session_id}.json"

    with csv_path.open("w", encoding="utf-8", newline="") as csv_file:
        writer = csv.DictWriter(
            csv_file,
            fieldnames=[
                "crop",
                "state",
                "district",
                "season",
                "sowing_months",
                "harvesting_months",
            ],
        )
        writer.writeheader()
        for row in rows:
            writer.writerow(
                {
                    "crop": row.crop,
                    "state": row.state,
                    "district": row.district,
                    "season": row.season,
                    "sowing_months": ",".join(str(month) for month in row.sowing_months),
                    "harvesting_months": ",".join(str(month) for month in row.harvesting_months),
                }
            )

    with session_path.open("w", encoding="utf-8") as session_file:
        json.dump(
            {
                "rows": [row.model_dump() for row in rows],
                "flagged_rows": [row.model_dump() for row in flagged_rows],
                "csv_file": str(csv_path),
            },
            session_file,
            ensure_ascii=True,
            indent=2,
        )

    return str(csv_path), str(session_path)


def load_session_payload(session_id: str) -> dict[str, Any]:
    session_path = Path(settings.staging_dir) / f"{session_id}.json"
    if not session_path.exists():
        raise FileNotFoundError(f"Preview session '{session_id}' does not exist")
    with session_path.open("r", encoding="utf-8") as session_file:
        return json.load(session_file)


async def extract_calendar_payload(filename: str, pdf_bytes: bytes) -> ExtractionResult:
    with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix or ".pdf") as handle:
        handle.write(pdf_bytes)
        temp_path = Path(handle.name)

    try:
        plumber_rows = extract_with_pdfplumber(pdf_bytes)
        tabula_rows = extract_with_tabula(str(temp_path))
        combined_rows = plumber_rows if plumber_rows else tabula_rows
    finally:
        temp_path.unlink(missing_ok=True)

    raw_rows, tables_detected, warnings = _extract_raw_rows(combined_rows)
    normalized_rows, flagged_rows = _normalize_rows(raw_rows)
    session_id = uuid4().hex
    csv_file, session_file = _write_staging_files(session_id, normalized_rows, flagged_rows)

    logger.info(
        "preview created: session=%s rows=%s flagged=%s csv=%s",
        session_id,
        len(normalized_rows),
        len(flagged_rows),
        csv_file,
    )

    return ExtractionResult(
        rows=normalized_rows,
        flagged_rows=flagged_rows,
        tables_detected=tables_detected,
        csv_file=csv_file,
        session_file=session_file,
        warnings=warnings,
        metadata={
            "sessionId": session_id,
            "rowCount": len(normalized_rows),
            "flaggedCount": len(flagged_rows),
            "crops": sorted({row.crop for row in normalized_rows}),
        },
    )


async def commit_to_backend(payload: CommitPayload) -> dict[str, Any]:
    headers = {"Authorization": f"Bearer {settings.ingestion_api_token}"}
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            settings.backend_commit_url,
            json=json.loads(payload.model_dump_json()),
            headers=headers,
        )
        response.raise_for_status()
        return response.json()


async def sync_to_backend(payload: SyncPayload) -> dict[str, Any]:
    headers = {"Authorization": f"Bearer {settings.ingestion_api_token}"}
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            settings.backend_sync_url,
            json=json.loads(payload.model_dump_json()),
            headers=headers,
        )
        response.raise_for_status()
        return response.json()
