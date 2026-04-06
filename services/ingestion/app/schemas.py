from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


class RawCalendarRow(BaseModel):
    state: Optional[str] = None
    district: Optional[str] = None
    crop: Optional[str] = None
    season: Optional[str] = None
    sowing_from: Optional[str] = None
    sowing_to: Optional[str] = None
    harvesting_from: Optional[str] = None
    harvesting_to: Optional[str] = None
    source: Optional[str] = None


class NormalizedCalendarRow(BaseModel):
    crop: str
    state: str
    district: str
    season: str
    sowing_months: list[int]
    harvesting_months: list[int]

    @field_validator("sowing_months", "harvesting_months")
    @classmethod
    def validate_months(cls, value: list[int]) -> list[int]:
        if not value:
            raise ValueError("Month arrays cannot be empty")
        if any(month < 1 or month > 12 for month in value):
            raise ValueError("Months must be between 1 and 12")
        return sorted(set(value))


class FlaggedRow(BaseModel):
    reason: str
    row: RawCalendarRow


class ExtractionResult(BaseModel):
    rows: list[NormalizedCalendarRow]
    flagged_rows: list[FlaggedRow]
    tables_detected: int
    csv_file: str
    session_file: str
    warnings: list[str] = []
    metadata: dict[str, Any] = {}


class SyncPayload(BaseModel):
    uploadId: str
    status: str
    processedData: Optional[dict[str, Any]] = None
    errorMessage: Optional[str] = None


class CommitRequest(BaseModel):
    session_id: str
    upload_id: Optional[str] = None
    tenant_id: Optional[str] = "fao-demo"
    year: Optional[int] = None


class CommitPayload(BaseModel):
    uploadId: Optional[str] = None
    tenantId: Optional[str] = "fao-demo"
    year: Optional[int] = None
    csvFile: str
    sessionFile: Optional[str] = None
    rows: list[NormalizedCalendarRow] = []
    flaggedCount: int = 0
    flaggedRows: list[FlaggedRow] = []
