"use client";

import { useState } from "react";
import { IngestionPreviewPayload, UploadRecord } from "../lib/types";


interface CommitResult {
  status: string;
  session_id: string;
  csv_file: string;
  saved_rows: number;
  flagged_rows: number;
}

export function UploadConsole({ uploads }: { uploads: UploadRecord[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<IngestionPreviewPayload | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);

  async function runPreview() {
    if (!file) {
      setErrorMessage("Select a PDF file before extraction.");
      return;
    }

    setExtracting(true);
    setErrorMessage("");
    setCommitResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/ingest/pdf/preview`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Preview extraction failed.");
      }

      const payload = (await response.json()) as IngestionPreviewPayload;
      setPreview(payload);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to extract preview.");
    } finally {
      setExtracting(false);
    }
  }

  async function saveToDatabase() {
    const sessionId = preview?.preview?.metadata?.sessionId;
    if (!sessionId) {
      setErrorMessage("Preview session is missing. Run extraction first.");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/ingest/commit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          session_id: sessionId,
          tenant_id: "fao-demo"
        })
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Commit failed.");
      }

      setCommitResult((await response.json()) as CommitResult);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save data.");
    } finally {
      setSaving(false);
    }
  }

  const previewRows = preview?.preview.rows ?? [];
  const flaggedRows = preview?.preview.flagged_rows ?? [];
  const warnings = preview?.preview.warnings ?? [];

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <section className="rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-soft backdrop-blur">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">File ingestion</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Admin upload console</h1>
        <p className="mt-3 text-sm text-slate-600">
          Upload PDF or XLSX crop calendar files. Extract and validate first, then commit to database.
        </p>
        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">PDF or XLSX file</span>
            <input
              accept="application/pdf,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
              onChange={(event) => {
                const selectedFile = event.target.files?.[0] ?? null;
                setFile(selectedFile);
                setPreview(null);
                setCommitResult(null);
                setErrorMessage("");
              }}
              type="file"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-full bg-slate-900 px-5 py-2 text-sm text-white disabled:opacity-60"
              disabled={extracting || !file}
              onClick={runPreview}
              type="button"
            >
              {extracting ? "Extracting..." : "Extract Preview"}
            </button>
            <button
              className="rounded-full bg-emerald-700 px-5 py-2 text-sm text-white disabled:opacity-60"
              disabled={saving || previewRows.length === 0}
              onClick={saveToDatabase}
              type="button"
            >
              {saving ? "Saving..." : "Save To Database"}
            </button>
          </div>
          {errorMessage ? <p className="text-sm text-rose-700">{errorMessage}</p> : null}
          {commitResult ? (
            <div className="rounded-2xl bg-emerald-100 p-4 text-sm text-emerald-900">
              Saved {commitResult.saved_rows} rows using staged CSV `{commitResult.csv_file}`.
            </div>
          ) : null}
          <div className="rounded-2xl bg-slate-900 p-4 text-sm text-slate-200">
            <p className="font-medium text-white">Preview session</p>
            <p className="mt-2 text-slate-300">File: {file?.name ?? "No file chosen yet"}</p>
            <p className="text-slate-300">Rows ready: {preview?.preview.metadata.rowCount ?? 0}</p>
            <p className="text-slate-300">Flagged rows: {preview?.preview.metadata.flaggedCount ?? 0}</p>
            <p className="text-slate-300">CSV: {preview?.preview.csv_file ?? "Pending extraction"}</p>
          </div>
          {warnings.length > 0 ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-medium">Warnings</p>
              {warnings.map((warning) => (
                <p key={warning} className="mt-1">
                  {warning}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </section>
      <section className="rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-soft backdrop-blur">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Preview before saving</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Normalized crop rows</h2>
        <div className="mt-5 max-h-[520px] overflow-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2 text-left">State</th>
                <th className="px-3 py-2 text-left">District</th>
                <th className="px-3 py-2 text-left">Crop</th>
                <th className="px-3 py-2 text-left">Season</th>
                <th className="px-3 py-2 text-left">Sowing</th>
                <th className="px-3 py-2 text-left">Harvesting</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={6}>
                    Run extraction to inspect parsed rows before database commit.
                  </td>
                </tr>
              ) : (
                previewRows.slice(0, 120).map((row, index) => (
                  <tr key={`${row.crop}-${row.state}-${row.district}-${index}`} className="border-t border-slate-100">
                    <td className="px-3 py-2">{row.state}</td>
                    <td className="px-3 py-2">{row.district}</td>
                    <td className="px-3 py-2">{row.crop}</td>
                    <td className="px-3 py-2">{row.season}</td>
                    <td className="px-3 py-2">{row.sowing_months.join(", ")}</td>
                    <td className="px-3 py-2">{row.harvesting_months.join(", ")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Showing up to 120 rows in preview. Full dataset is written to staged CSV before commit.
        </p>
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-medium text-rose-900">Flagged rows ({flaggedRows.length})</p>
          <div className="mt-2 max-h-36 overflow-auto text-xs text-rose-800">
            {flaggedRows.length === 0
              ? "No flagged rows."
              : flaggedRows.map((item, index) => (
                  <p key={`${item.reason}-${index}`} className="mb-2">
                    {item.reason}
                  </p>
                ))}
          </div>
        </div>
      </section>
      <section className="rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-soft backdrop-blur xl:col-span-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Upload history</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Previous processing records</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {uploads.map((upload) => (
            <div key={upload.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <p className="line-clamp-1 font-semibold text-slate-900">{upload.filename}</p>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{upload.status}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{new Date(upload.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
