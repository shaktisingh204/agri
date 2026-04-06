export interface Country {
  id: string;
  code: string;
  name: string;
}

export interface Region {
  id: string;
  name: string;
  agroZoneName: string;
  latitude?: number;
  longitude?: number;
  country: Country;
}

export interface Crop {
  id: string;
  name: string;
  slug: string;
  category: string;
}

export interface CropCalendarRecord {
  id: string;
  cropName: string;
  cropCategory: string;
  countryCode: string;
  countryName: string;
  stateName: string;
  regionName: string;
  agroEcologicalZone: string;
  seasonName: string;
  year: number;
  sowingMonths: number[];
  growingMonths: number[];
  harvestingMonths: number[];
}

export interface UploadRecord {
  id: string;
  filename: string;
  status: string;
  createdAt: string;
  processedData?: Record<string, unknown>;
}

export interface IngestionPreviewRow {
  crop: string;
  state: string;
  district: string;
  season: string;
  sowing_months: number[];
  harvesting_months: number[];
}

export interface IngestionFlaggedRow {
  reason: string;
  row: Record<string, unknown>;
}

export interface IngestionPreviewPayload {
  status: string;
  preview: {
    rows: IngestionPreviewRow[];
    flagged_rows: IngestionFlaggedRow[];
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
  };
}
