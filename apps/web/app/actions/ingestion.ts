"use server";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string }>;
import * as XLSX from "xlsx";

interface RawRow {
  cells: string[];
  source: string;
  page: number;
  table: number;
  row: number;
}

export interface NormalizedCalendarRow {
  crop: string;
  state: string;
  district: string;
  season: string;
  sowing_months: number[];
  harvesting_months: number[];
}

export interface FlaggedRow {
  reason: string;
  row: Record<string, string | null>;
}

export interface ExtractionResult {
  rows: NormalizedCalendarRow[];
  flagged_rows: FlaggedRow[];
  tables_detected: number;
  csv_file: string;
  session_file: string;
  warnings: string[];
  metadata: {
    sessionId: string;
    rowCount: number;
    flaggedCount: number;
    crops: string[];
  };
}

// ── Month parsing ──

const MONTH_MAP: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

const MONTH_PATTERN =
  /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\b/gi;

function extractMonthCandidates(value: string): number[] {
  const candidates: number[] = [];
  for (const match of value.matchAll(MONTH_PATTERN)) {
    const key = match[1].toLowerCase();
    if (key in MONTH_MAP) candidates.push(MONTH_MAP[key]);
  }
  return candidates;
}

function monthsBetween(start: number, end: number): number[] {
  if (start <= end) {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
  return [
    ...Array.from({ length: 13 - start }, (_, i) => start + i),
    ...Array.from({ length: end }, (_, i) => i + 1),
  ];
}

function parseMonthRange(
  startText: string | null,
  endText: string | null
): { months: number[] | null; error: string | null } {
  const startRaw = (startText ?? "").trim();
  const endRaw = (endText ?? "").trim();
  const startCandidates = extractMonthCandidates(startRaw);
  const endCandidates = extractMonthCandidates(endRaw);

  if (!startCandidates.length && !endCandidates.length) {
    const merged = extractMonthCandidates(`${startRaw} ${endRaw}`);
    if (merged.length >= 2) {
      return { months: monthsBetween(merged[0], merged[merged.length - 1]), error: null };
    }
    return { months: null, error: `Unable to resolve month range from '${startRaw}' to '${endRaw}'` };
  }

  let startMonth = startCandidates[0] ?? null;
  let endMonth = endCandidates[endCandidates.length - 1] ?? null;

  if (startMonth === null && endMonth !== null) startMonth = endMonth;
  if (endMonth === null && startMonth !== null) endMonth = startMonth;

  if (startMonth === null || endMonth === null) {
    return { months: null, error: `Incomplete month range from '${startRaw}' to '${endRaw}'` };
  }

  return { months: monthsBetween(startMonth, endMonth), error: null };
}

// ── Header detection ──

const FILL_FORWARD_FIELDS = ["state", "district", "season"];

function detectHeader(cells: string[]): Record<string, number> | null {
  const mapping: Record<string, number> = {};

  for (let i = 0; i < cells.length; i++) {
    const norm = cells[i].toLowerCase().replace(/\n/g, " ");
    if (norm.includes("state") && !norm.includes("sub")) mapping.state = i;
    else if (norm.includes("district") && !norm.includes("code")) mapping.district = i;
    else if (norm.includes("crop")) mapping.crop = i;
    else if (norm.includes("season")) mapping.season = i;
    else if (norm.includes("sowing period")) { mapping.sowing_from = i; mapping.sowing_to = i; }
    else if (norm.includes("sowing") && (norm.includes("from") || norm.includes("start"))) mapping.sowing_from = i;
    else if (norm.includes("sowing") && (norm.includes("to") || norm.includes("upto") || norm.includes("end"))) mapping.sowing_to = i;
    else if (norm.includes("harvesting period")) { mapping.harvesting_from = i; mapping.harvesting_to = i; }
    else if (norm.includes("harvesting") && (norm.includes("from") || norm.includes("start"))) mapping.harvesting_from = i;
    else if (norm.includes("harvesting") && (norm.includes("to") || norm.includes("upto") || norm.includes("end"))) mapping.harvesting_to = i;
  }

  const required = ["state", "district", "crop", "season"];
  const hasSowing = "sowing_from" in mapping || "sowing_to" in mapping;
  const hasHarvesting = "harvesting_from" in mapping || "harvesting_to" in mapping;

  if (required.every((k) => k in mapping) && hasSowing && hasHarvesting) return mapping;
  return null;
}

// ── Text-based table extraction ──

function extractTablesFromText(text: string): RawRow[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const rows: RawRow[] = [];
  let page = 1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^page\s+\d+/i)) {
      page++;
      continue;
    }
    // Split by two or more spaces (common in PDF text extraction for table columns)
    const cells = lines[i].split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
    if (cells.length >= 4) {
      rows.push({ cells, source: "pdf-parse", page, table: 1, row: i + 1 });
    }
  }

  return rows;
}

// ── Row extraction and normalization ──

interface RawParsedRow {
  state: string | null;
  district: string | null;
  crop: string | null;
  season: string | null;
  sowing_from: string | null;
  sowing_to: string | null;
  harvesting_from: string | null;
  harvesting_to: string | null;
  source: string;
}

function extractRawRows(rawRows: RawRow[]): {
  parsed: RawParsedRow[];
  tablesDetected: number;
  warnings: string[];
} {
  const parsed: RawParsedRow[] = [];
  const warnings: string[] = [];
  const tableKeys = new Set(rawRows.map((r) => `${r.source}:${r.page}:${r.table}`));
  let currentHeader: Record<string, number> | null = null;
  const lastSeen: Record<string, string> = {};

  for (const row of rawRows) {
    const header = detectHeader(row.cells);
    if (header) {
      currentHeader = header;
      continue;
    }

    if (!currentHeader) continue;

    const extracted: Record<string, string | null> = {};
    for (const [field, idx] of Object.entries(currentHeader)) {
      extracted[field] = idx < row.cells.length ? row.cells[idx] || null : null;
    }

    for (const fill of FILL_FORWARD_FIELDS) {
      if (extracted[fill]) {
        lastSeen[fill] = extracted[fill]!;
      } else if (lastSeen[fill]) {
        extracted[fill] = lastSeen[fill];
      }
    }

    if (!Object.values(extracted).some(Boolean)) continue;

    parsed.push({
      state: extracted.state ?? null,
      district: extracted.district ?? null,
      crop: extracted.crop ?? null,
      season: extracted.season ?? null,
      sowing_from: extracted.sowing_from ?? null,
      sowing_to: extracted.sowing_to ?? null,
      harvesting_from: extracted.harvesting_from ?? null,
      harvesting_to: extracted.harvesting_to ?? null,
      source: `${row.source}#p${row.page}-t${row.table}-r${row.row}`,
    });
  }

  if (!parsed.length) {
    warnings.push("No parseable rows found. Confirm PDF contains explicit header columns.");
  }

  return { parsed, tablesDetected: tableKeys.size, warnings };
}

function normalizeCropName(crop: string): string {
  let normalized = crop.trim();
  normalized = normalized.replace(/\(.*?\)/g, " ");
  normalized = normalized.replace(/\//g, " ");
  normalized = normalized.replace(/\b(normal|late|early|timely|timely sown)\b/gi, " ");
  normalized = normalized.replace(/\s+/g, " ").trim();
  return normalized
    ? normalized.replace(/\b\w/g, (c) => c.toUpperCase())
    : crop.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeRows(rawRows: RawParsedRow[]): {
  normalized: NormalizedCalendarRow[];
  flagged: FlaggedRow[];
} {
  const merged = new Map<string, { sowing: Set<number>; harvesting: Set<number> }>();
  const flagged: FlaggedRow[] = [];

  for (const row of rawRows) {
    const state = (row.state ?? "").trim();
    const district = (row.district ?? "").trim();
    const crop = (row.crop ?? "").trim();
    const season = (row.season ?? "").trim();

    if (!state || !district || !crop || !season) {
      flagged.push({
        reason: "Missing required state/district/crop/season.",
        row: row as unknown as Record<string, string | null>,
      });
      continue;
    }

    const sowing = parseMonthRange(row.sowing_from, row.sowing_to);
    const harvesting = parseMonthRange(row.harvesting_from, row.harvesting_to);

    if (sowing.error || harvesting.error || !sowing.months || !harvesting.months) {
      const reason = [sowing.error, harvesting.error].filter(Boolean).join("; ") ||
        "Invalid sowing or harvesting date values.";
      flagged.push({ reason, row: row as unknown as Record<string, string | null> });
      continue;
    }

    const normalizedCrop = normalizeCropName(crop);
    const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
    const key = `${titleCase(state)}|${titleCase(district)}|${normalizedCrop}|${titleCase(season)}`;

    if (!merged.has(key)) {
      merged.set(key, { sowing: new Set(), harvesting: new Set() });
    }
    const entry = merged.get(key)!;
    sowing.months.forEach((m) => entry.sowing.add(m));
    harvesting.months.forEach((m) => entry.harvesting.add(m));
  }

  const normalized: NormalizedCalendarRow[] = [];
  for (const [key, values] of merged) {
    const [state, district, crop, season] = key.split("|");
    normalized.push({
      state,
      district,
      crop,
      season,
      sowing_months: [...values.sowing].sort((a, b) => a - b),
      harvesting_months: [...values.harvesting].sort((a, b) => a - b),
    });
  }

  return { normalized, flagged };
}

// ── Session storage (in-memory for serverless) ──

const sessions = new Map<string, {
  rows: NormalizedCalendarRow[];
  flagged_rows: FlaggedRow[];
  csv_file: string;
}>();

export async function getSession(sessionId: string) {
  return sessions.get(sessionId) ?? null;
}

// ── XLSX month parsing (matches import-xlsx.ts logic) ──

function parseMonthsFromText(text: string | undefined | null): number[] {
  if (!text || typeof text !== "string") return [];

  const cleaned = text
    .replace(/\(Normal\)/gi, "")
    .replace(/\(Late\)/gi, "")
    .replace(/\(Next Year\)/gi, "")
    .replace(/\(Irrigated\)/gi, "")
    .replace(/\./g, "")
    .replace(/,/g, " ")
    .trim();

  if (!cleaned || cleaned === "-" || cleaned === "--" || cleaned === "- -") return [];
  if (/^0001/.test(cleaned)) return [];
  if (/Not Practice/i.test(cleaned)) return [];
  if (/^00\/01\/1900/.test(cleaned)) return [];

  const months = new Set<number>();
  const lowerText = cleaned.toLowerCase();

  const monthPattern =
    /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = monthPattern.exec(lowerText)) !== null) {
    const monthNum = MONTH_MAP[match[1].toLowerCase()];
    if (monthNum) months.add(monthNum);
  }

  const datePattern = /(\d{1,2})\/(\d{1,2})\/(\d{4})/g;
  while ((match = datePattern.exec(cleaned)) !== null) {
    const monthVal = parseInt(match[2], 10);
    if (monthVal >= 1 && monthVal <= 12) months.add(monthVal);
  }

  return Array.from(months).sort((a, b) => a - b);
}

// ── XLSX extraction ──

interface XlsxRawRow {
  [key: string]: string | number | undefined;
}

function extractCalendarFromXlsx(buffer: Buffer): {
  normalized: NormalizedCalendarRow[];
  flagged: FlaggedRow[];
  warnings: string[];
} {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json<XlsxRawRow>(sheet, { defval: "" });

  const normalized: NormalizedCalendarRow[] = [];
  const flagged: FlaggedRow[] = [];
  const warnings: string[] = [];
  const merged = new Map<string, { sowing: Set<number>; harvesting: Set<number> }>();

  if (!rawData.length) {
    warnings.push("No rows found in XLSX file.");
    return { normalized, flagged, warnings };
  }

  // Detect column names dynamically
  const headers = Object.keys(rawData[0]);
  const find = (keywords: string[], exclude?: string[]) =>
    headers.find((h) => {
      const lower = h.toLowerCase();
      return keywords.some((k) => lower.includes(k)) &&
        !(exclude ?? []).some((e) => lower.includes(e));
    });

  const stateCol = find(["state"], ["sub"]);
  const districtCol = find(["district"], ["code"]);
  const cropCol = find(["crop"]);
  const seasonCol = find(["season"]);
  const sowingCol = find(["sowing"]);
  const harvestingCol = find(["harvesting"]);

  if (!stateCol || !districtCol || !cropCol) {
    warnings.push(
      `Could not detect required columns. Found: ${headers.join(", ")}. ` +
      `Need columns containing: state, district, crop.`
    );
    return { normalized, flagged, warnings };
  }

  for (const row of rawData) {
    const state = String(row[stateCol] ?? "").trim();
    const district = String(row[districtCol] ?? "").trim();
    const crop = String(row[cropCol] ?? "").trim();
    const season = seasonCol ? String(row[seasonCol] ?? "").trim() || "General" : "General";

    if (!state || !district || !crop) continue;
    if (/other crop/i.test(crop)) continue;
    if (crop === "From              To") continue;

    const sowingText = sowingCol ? String(row[sowingCol] ?? "") : "";
    const harvestingText = harvestingCol ? String(row[harvestingCol] ?? "") : "";

    const sowingMonths = parseMonthsFromText(sowingText);
    const harvestingMonths = parseMonthsFromText(harvestingText);

    if (sowingMonths.length === 0 && harvestingMonths.length === 0) {
      flagged.push({
        reason: `No parseable months from sowing="${sowingText}" harvesting="${harvestingText}"`,
        row: { state, district, crop, season, sowing: sowingText, harvesting: harvestingText },
      });
      continue;
    }

    const normalizedCrop = normalizeCropName(crop);
    const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
    const key = `${titleCase(state)}|${titleCase(district)}|${normalizedCrop}|${titleCase(season)}`;

    if (!merged.has(key)) {
      merged.set(key, { sowing: new Set(), harvesting: new Set() });
    }
    const entry = merged.get(key)!;
    sowingMonths.forEach((m) => entry.sowing.add(m));
    harvestingMonths.forEach((m) => entry.harvesting.add(m));
  }

  for (const [key, values] of merged) {
    const [state, district, crop, season] = key.split("|");
    normalized.push({
      state,
      district,
      crop,
      season,
      sowing_months: [...values.sowing].sort((a, b) => a - b),
      harvesting_months: [...values.harvesting].sort((a, b) => a - b),
    });
  }

  return { normalized, flagged, warnings };
}

// ── Main extraction function (PDF + XLSX) ──

export async function extractCalendarFromFile(
  filename: string,
  buffer: Buffer
): Promise<ExtractionResult> {
  const ext = filename.toLowerCase().split(".").pop();
  let normalized: NormalizedCalendarRow[];
  let flagged: FlaggedRow[];
  let warnings: string[];
  let tablesDetected: number;

  if (ext === "xlsx" || ext === "xls") {
    const result = extractCalendarFromXlsx(buffer);
    normalized = result.normalized;
    flagged = result.flagged;
    warnings = result.warnings;
    tablesDetected = 1;
  } else {
    const parsed = await pdf(buffer);
    const rawRows = extractTablesFromText(parsed.text);
    const extracted = extractRawRows(rawRows);
    const norm = normalizeRows(extracted.parsed);
    normalized = norm.normalized;
    flagged = norm.flagged;
    warnings = extracted.warnings;
    tablesDetected = extracted.tablesDetected;
  }

  const sessionId = crypto.randomUUID().replace(/-/g, "");
  const csvFile = `session-${sessionId}.csv`;

  sessions.set(sessionId, {
    rows: normalized,
    flagged_rows: flagged,
    csv_file: csvFile,
  });

  return {
    rows: normalized,
    flagged_rows: flagged,
    tables_detected: tablesDetected,
    csv_file: csvFile,
    session_file: sessionId,
    warnings,
    metadata: {
      sessionId,
      rowCount: normalized.length,
      flaggedCount: flagged.length,
      crops: [...new Set(normalized.map((r) => r.crop))].sort(),
    },
  };
}

// Keep backward compat alias
export const extractCalendarFromPdf = extractCalendarFromFile;

// ── Commit session to database ──

export async function commitSession(payload: {
  session_id: string;
  upload_id?: string;
  tenant_id?: string;
  year?: number;
}) {
  const { commitCropCalendarData } = await import("./commit");

  const session = sessions.get(payload.session_id);
  if (!session) {
    return { error: `Preview session '${payload.session_id}' does not exist or has expired.` };
  }

  if (!session.rows.length) {
    return { error: "No valid rows available to save." };
  }

  const result = await commitCropCalendarData({
    uploadId: payload.upload_id,
    tenantId: payload.tenant_id ?? "fao-demo",
    year: payload.year,
    csvFile: session.csv_file,
    rows: session.rows,
    flaggedCount: session.flagged_rows.length,
  });

  if (!("error" in result)) {
    sessions.delete(payload.session_id);
  }

  return {
    status: "saved",
    session_id: payload.session_id,
    csv_file: session.csv_file,
    saved_rows: session.rows.length,
    flagged_rows: session.flagged_rows.length,
    backend: result,
  };
}
