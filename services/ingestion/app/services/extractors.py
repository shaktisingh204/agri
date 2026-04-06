import io
import logging
from typing import Any

import pdfplumber

try:
    import tabula
except Exception:  # pragma: no cover
    tabula = None


logger = logging.getLogger(__name__)


def extract_with_pdfplumber(pdf_bytes: bytes) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            tables = page.extract_tables() or []
            for table_index, table in enumerate(tables, start=1):
                for row_index, row in enumerate(table, start=1):
                    if not row or not any(cell for cell in row if isinstance(cell, str) and cell.strip()):
                        continue
                    rows.append(
                        {
                            "source": "pdfplumber",
                            "page": page_number,
                            "table": table_index,
                            "row": row_index,
                            "cells": [cell.strip() if isinstance(cell, str) else "" for cell in row]
                        }
                    )
    logger.info("pdfplumber extracted %s rows", len(rows))
    return rows


def extract_with_tabula(temp_path: str) -> list[dict[str, Any]]:
    if tabula is None:
        logger.warning("tabula-py is unavailable; skipping JVM-based extraction")
        return []

    try:
        frames = tabula.read_pdf(temp_path, pages="all", lattice=True, multiple_tables=True)
    except Exception as exc:  # pragma: no cover
        logger.warning("tabula extraction failed: %s", exc)
        return []

    rows: list[dict[str, Any]] = []
    for table_index, frame in enumerate(frames, start=1):
        for row_index, row in enumerate(frame.fillna("").values.tolist(), start=1):
            if not any(str(cell).strip() for cell in row):
                continue
            rows.append(
                {
                    "source": "tabula",
                    "table": table_index,
                    "row": row_index,
                    "cells": [str(cell).strip() for cell in row]
                }
            )
    logger.info("tabula extracted %s rows", len(rows))
    return rows
