import json
import logging
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile

from app.config import settings
from app.schemas import CommitPayload, CommitRequest, SyncPayload
from app.services.pipeline import commit_to_backend, extract_calendar_payload, load_session_payload, sync_to_backend


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("agri-ingestion")

app = FastAPI(title="Agri PDF Ingestion Service", version="1.0.0")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/ingest/pdf/preview")
async def ingest_pdf_preview(file: UploadFile = File(...)) -> dict[str, object]:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    pdf_bytes = await file.read()
    try:
        result = await extract_calendar_payload(file.filename, pdf_bytes)
        return {
            "status": "preview_ready",
            "preview": json.loads(result.model_dump_json()),
        }
    except Exception as exc:
        logger.exception("Failed to process %s", file.filename)
        raise HTTPException(status_code=500, detail=f"PDF ingestion failed: {exc}") from exc


@app.post("/ingest/pdf")
async def ingest_pdf_alias(file: UploadFile = File(...)) -> dict[str, object]:
    return await ingest_pdf_preview(file=file)


@app.post("/ingest/commit")
async def commit_preview(payload: CommitRequest) -> dict[str, object]:
    try:
        session_payload = load_session_payload(payload.session_id)
        rows = session_payload.get("rows", [])
        flagged_rows = session_payload.get("flagged_rows", [])
        csv_file = session_payload.get("csv_file")
        session_file = str(Path(settings.staging_dir) / f"{payload.session_id}.json")

        if not rows:
            raise HTTPException(status_code=400, detail="No valid rows available to save.")

        backend_payload = CommitPayload(
            uploadId=payload.upload_id,
            tenantId=payload.tenant_id,
            year=payload.year,
            csvFile=str(csv_file),
            sessionFile=session_file,
            flaggedCount=len(flagged_rows),
        )
        backend_response = await commit_to_backend(backend_payload)

        if payload.upload_id:
            await sync_to_backend(
                SyncPayload(
                    uploadId=payload.upload_id,
                    status="COMPLETED",
                    processedData={
                        "sessionId": payload.session_id,
                        "csvFile": csv_file,
                        "rowCount": len(rows),
                        "flaggedCount": len(flagged_rows),
                    },
                )
            )

        return {
            "status": "saved",
            "session_id": payload.session_id,
            "csv_file": csv_file,
            "saved_rows": len(rows),
            "flagged_rows": len(flagged_rows),
            "backend": backend_response,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to commit session %s", payload.session_id)
        if payload.upload_id:
            await sync_to_backend(
                SyncPayload(
                    uploadId=payload.upload_id,
                    status="FAILED",
                    errorMessage=str(exc),
                )
            )
        raise HTTPException(status_code=500, detail=f"Commit failed: {exc}") from exc
