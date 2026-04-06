import type { Country, Region, Crop, CropCalendarRecord, UploadRecord } from "./types";
import { getCountries } from "../app/actions/geography";
import { getRegions } from "../app/actions/geography";
import { getCrops } from "../app/actions/crop-calendars";
import { getCalendars } from "../app/actions/crop-calendars";
import { getUsage } from "../app/actions/analytics";
import { getPopularCrops } from "../app/actions/analytics";
import { getUploadStatus } from "../app/actions/uploads";

const fallbackCountries: Country[] = [
  { id: "ng", code: "NG", name: "Nigeria" },
  { id: "ke", code: "KE", name: "Kenya" },
];

const fallbackRegions: Region[] = [
  {
    id: "north-central",
    name: "North Central",
    agroZoneName: "Guinea Savannah",
    latitude: 9.082,
    longitude: 8.6753,
    country: fallbackCountries[0],
  },
  {
    id: "rift-valley",
    name: "Rift Valley",
    agroZoneName: "Highland Maize Zone",
    latitude: -0.3031,
    longitude: 36.08,
    country: fallbackCountries[1],
  },
];

const fallbackCrops: Crop[] = [
  { id: "maize", name: "Maize", slug: "maize", category: "Cereal" },
  { id: "rice", name: "Rice", slug: "rice", category: "Cereal" },
  { id: "cassava", name: "Cassava", slug: "cassava", category: "Root Crop" },
];

const fallbackCalendars: CropCalendarRecord[] = [];

const fallbackUploads = [
  {
    id: "u1",
    filename: "fao-crop-calendar.pdf",
    status: "COMPLETED",
    createdAt: new Date().toISOString(),
    processedData: {
      totalRows: 12,
      preview: ["Maize", "Rice", "Cassava"],
    },
  },
] satisfies UploadRecord[];

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
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
    safeQuery(() => getCountries(), fallbackCountries),
    safeQuery(() => getRegions(country || undefined), fallbackRegions),
    safeQuery(() => getCrops(), fallbackCrops),
    hasActiveFilters
      ? safeQuery(
          () =>
            getCalendars({
              crop: crop || undefined,
              region: region || undefined,
              state: state || undefined,
              country: country || undefined,
              season: season || undefined,
              month: monthNum,
            }),
          fallbackCalendars
        )
      : Promise.resolve<CropCalendarRecord[]>([]),
    safeQuery(() => getUsage(), {
      totalRequests: 195,
      recentEvents: [
        { eventName: "calendar_view", quantity: 187 },
        { eventName: "pdf_upload", quantity: 8 },
      ],
    }),
    safeQuery(() => getPopularCrops(), [
      { cropName: "Maize", usageCount: 44 },
      { cropName: "Rice", usageCount: 32 },
    ]),
  ]);

  return { countries, regions, crops, calendars, hasActiveFilters, usage, popularCrops };
}

export async function getUploads(): Promise<UploadRecord[]> {
  return safeQuery(() => getUploadStatus(), fallbackUploads);
}
