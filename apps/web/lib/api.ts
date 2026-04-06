import type { Country, Region, Crop, CropCalendarRecord, UploadRecord } from "./types";
import { getCountries } from "../app/actions/geography";
import { getRegions } from "../app/actions/geography";
import { getCrops } from "../app/actions/crop-calendars";
import { getCalendars } from "../app/actions/crop-calendars";
import { getUsage } from "../app/actions/analytics";
import { getPopularCrops } from "../app/actions/analytics";
import { getUploadStatus } from "../app/actions/uploads";

async function safeQuery<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(`[${label}] query failed:`, error instanceof Error ? error.message : error);
    return fallback;
  }
}

export async function getDashboardData(searchParams?: Record<string, string | string[] | undefined>) {
  const country = typeof searchParams?.country === "string" ? searchParams.country : "";
  const state = typeof searchParams?.state === "string" ? searchParams.state : "";
  const region = typeof searchParams?.region === "string" ? searchParams.region : "";
  const crop = typeof searchParams?.crop === "string" ? searchParams.crop : "";
  const season = typeof searchParams?.season === "string" ? searchParams.season : "";
  const month = typeof searchParams?.month === "string" ? searchParams.month : "";
  const hasActiveFilters = Boolean(country || state || region || crop || season || month);

  const monthNum = month ? parseInt(month, 10) : undefined;

  const [countries, regions, crops, calendars, usage, popularCrops] = await Promise.all([
    safeQuery("countries", () => getCountries(), []),
    safeQuery("regions", () => getRegions(country || undefined), []),
    safeQuery("crops", () => getCrops(), []),
    hasActiveFilters
      ? safeQuery(
          "calendars",
          () =>
            getCalendars({
              crop: crop || undefined,
              region: region || undefined,
              state: state || undefined,
              country: country || undefined,
              season: season || undefined,
              month: monthNum,
            }),
          []
        )
      : Promise.resolve<CropCalendarRecord[]>([]),
    safeQuery("usage", () => getUsage(), { totalRequests: 0, recentEvents: [] }),
    safeQuery("popularCrops", () => getPopularCrops(), []),
  ]);

  return { countries, regions, crops, calendars, hasActiveFilters, usage, popularCrops };
}

export async function getUploads(): Promise<UploadRecord[]> {
  return safeQuery("uploads", () => getUploadStatus(), []);
}
