export type SubscriptionPlan = "FREE" | "PRO" | "ENTERPRISE";
export type UserRole = "ADMIN" | "ANALYST" | "VIEWER";
export type PhaseType = "SOWING" | "GROWING" | "HARVESTING";

export interface CropPhaseWindow {
  phase: PhaseType;
  months: number[];
}

export interface CropCalendarRecord {
  id: string;
  cropName: string;
  cropCategory: string;
  countryCode: string;
  countryName: string;
  regionName: string;
  agroEcologicalZone: string;
  seasonName: string;
  year: number;
  sowingMonths: number[];
  growingMonths: number[];
  harvestingMonths: number[];
  tenantId: string;
}

export const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];

