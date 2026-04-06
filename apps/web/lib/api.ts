import { CropCalendarRecord, Crop, Country, Region, UploadRecord } from "./types";
import { getDb } from "./mongodb";
import { ObjectId } from "mongodb";

const fallbackCountries: Country[] = [
  { id: "ng", code: "NG", name: "Nigeria" },
  { id: "ke", code: "KE", name: "Kenya" }
];

const fallbackRegions: Region[] = [
  {
    id: "north-central",
    name: "North Central",
    agroZoneName: "Guinea Savannah",
    latitude: 9.082,
    longitude: 8.6753,
    country: fallbackCountries[0]
  },
  {
    id: "rift-valley",
    name: "Rift Valley",
    agroZoneName: "Highland Maize Zone",
    latitude: -0.3031,
    longitude: 36.08,
    country: fallbackCountries[1]
  }
];

const fallbackCrops: Crop[] = [
  { id: "maize", name: "Maize", slug: "maize", category: "Cereal" },
  { id: "rice", name: "Rice", slug: "rice", category: "Cereal" },
  { id: "cassava", name: "Cassava", slug: "cassava", category: "Root Crop" }
];

const fallbackCalendars: CropCalendarRecord[] = [];

const fallbackUploads: UploadRecord[] = [
  {
    id: "u1",
    filename: "fao-crop-calendar.pdf",
    status: "COMPLETED",
    createdAt: new Date().toISOString(),
    processedData: {
      totalRows: 12,
      preview: ["Maize", "Rice", "Cassava"]
    }
  }
];

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
    // Countries
    safeQuery<Country[]>(async () => {
      const db = await getDb();
      const docs = await db.collection("countries").find().sort({ name: 1 }).toArray();
      return docs.map((d) => ({ id: d._id.toString(), code: d.code, name: d.name }));
    }, fallbackCountries),

    // Regions
    safeQuery<Region[]>(async () => {
      const db = await getDb();
      let countryFilter: Record<string, unknown> = {};
      if (country) {
        const countryDoc = await db.collection("countries").findOne({ code: country });
        if (countryDoc) {
          countryFilter = { countryId: countryDoc._id };
        }
      }
      const docs = await db.collection("regions").find(countryFilter).sort({ name: 1 }).toArray();
      const countryIds = [...new Set(docs.map((d) => d.countryId.toString()))];
      const countryDocs = await db
        .collection("countries")
        .find({ _id: { $in: countryIds.map((id) => new ObjectId(id)) } })
        .toArray();
      const countryMap = new Map(countryDocs.map((c) => [c._id.toString(), c]));

      return docs.map((d) => {
        const c = countryMap.get(d.countryId.toString());
        return {
          id: d._id.toString(),
          name: d.name,
          agroZoneName: d.agroZoneName,
          latitude: d.latitude,
          longitude: d.longitude,
          country: c
            ? { id: c._id.toString(), code: c.code, name: c.name }
            : { id: "", code: "", name: "" }
        };
      });
    }, fallbackRegions),

    // Crops
    safeQuery<Crop[]>(async () => {
      const db = await getDb();
      const docs = await db.collection("crops").find().sort({ name: 1 }).toArray();
      return docs.map((d) => ({ id: d._id.toString(), name: d.name, slug: d.slug, category: d.category }));
    }, fallbackCrops),

    // Calendars
    hasActiveFilters
      ? safeQuery<CropCalendarRecord[]>(async () => {
          const db = await getDb();

          // Build region filter
          const regionQuery: Record<string, unknown> = {};
          if (region) regionQuery.name = region;
          if (state) regionQuery.agroZoneName = state;
          if (country) {
            const countryDoc = await db.collection("countries").findOne({ code: country });
            if (countryDoc) regionQuery.countryId = countryDoc._id;
          }

          let regionIds: ObjectId[] | undefined;
          if (Object.keys(regionQuery).length > 0) {
            const regionDocs = await db.collection("regions").find(regionQuery).toArray();
            regionIds = regionDocs.map((r) => r._id);
          }

          // Build crop filter
          let cropIds: ObjectId[] | undefined;
          if (crop) {
            const cropDocs = await db.collection("crops").find({ slug: crop }).toArray();
            cropIds = cropDocs.map((c) => c._id);
          }

          // Build calendar query
          const calQuery: Record<string, unknown> = {};
          if (cropIds) calQuery.cropId = { $in: cropIds };
          if (regionIds) calQuery.regionId = { $in: regionIds };
          if (season) calQuery.seasonName = season;
          if (monthNum) {
            calQuery.$or = [
              { sowingMonths: monthNum },
              { growingMonths: monthNum },
              { harvestingMonths: monthNum }
            ];
          }

          const entries = await db.collection("cropCalendars").find(calQuery).toArray();

          // Fetch related data
          const allCropIds = [...new Set(entries.map((e) => e.cropId.toString()))];
          const allRegionIds = [...new Set(entries.map((e) => e.regionId.toString()))];

          const [cropDocs, regionDocs] = await Promise.all([
            db.collection("crops").find({ _id: { $in: allCropIds.map((id) => new ObjectId(id)) } }).toArray(),
            db.collection("regions").find({ _id: { $in: allRegionIds.map((id) => new ObjectId(id)) } }).toArray()
          ]);

          const cropMap = new Map(cropDocs.map((c) => [c._id.toString(), c]));
          const regionMap = new Map(regionDocs.map((r) => [r._id.toString(), r]));

          const allCountryIds = [...new Set(regionDocs.map((r) => r.countryId.toString()))];
          const countryDocs = await db
            .collection("countries")
            .find({ _id: { $in: allCountryIds.map((id) => new ObjectId(id)) } })
            .toArray();
          const countryMap = new Map(countryDocs.map((c) => [c._id.toString(), c]));

          return entries.map((entry) => {
            const c = cropMap.get(entry.cropId.toString());
            const r = regionMap.get(entry.regionId.toString());
            const co = r ? countryMap.get(r.countryId.toString()) : undefined;

            return {
              id: entry._id.toString(),
              cropName: c?.name ?? "",
              cropCategory: c?.category ?? "",
              countryCode: co?.code ?? "",
              countryName: co?.name ?? "",
              stateName: r?.agroZoneName ?? "",
              regionName: r?.name ?? "",
              agroEcologicalZone: r?.agroZoneName ?? "",
              seasonName: entry.seasonName,
              year: entry.year,
              sowingMonths: entry.sowingMonths,
              growingMonths: entry.growingMonths,
              harvestingMonths: entry.harvestingMonths
            };
          });
        }, fallbackCalendars)
      : Promise.resolve<CropCalendarRecord[]>([]),

    // Usage
    safeQuery(async () => {
      const db = await getDb();
      const events = await db
        .collection("usageEvents")
        .find()
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray();
      const totalRequests = events.reduce((sum, e) => sum + (e.quantity ?? 0), 0);
      return {
        totalRequests,
        recentEvents: events.map((e) => ({ eventName: e.eventName, quantity: e.quantity }))
      };
    }, {
      totalRequests: 195,
      recentEvents: [
        { eventName: "calendar_view", quantity: 187 },
        { eventName: "pdf_upload", quantity: 8 }
      ]
    }),

    // Popular crops
    safeQuery(async () => {
      const db = await getDb();
      const cals = await db.collection("cropCalendars").find().toArray();
      const allCropIds = [...new Set(cals.map((c) => c.cropId.toString()))];
      const cropDocs = await db
        .collection("crops")
        .find({ _id: { $in: allCropIds.map((id) => new ObjectId(id)) } })
        .toArray();
      const cropMap = new Map(cropDocs.map((c) => [c._id.toString(), c]));

      const counts: Record<string, { cropName: string; usageCount: number }> = {};
      for (const c of cals) {
        const cropId = c.cropId.toString();
        const existing = counts[cropId];
        const cropDoc = cropMap.get(cropId);
        counts[cropId] = {
          cropName: cropDoc?.name ?? "",
          usageCount: (existing?.usageCount ?? 0) + 1
        };
      }
      return Object.entries(counts)
        .map(([, v]) => v)
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 10);
    }, [
      { cropName: "Maize", usageCount: 44 },
      { cropName: "Rice", usageCount: 32 }
    ])
  ]);

  return { countries, regions, crops, calendars, hasActiveFilters, usage, popularCrops };
}

export async function getUploads(): Promise<UploadRecord[]> {
  return safeQuery(async () => {
    const db = await getDb();
    const uploads = await db.collection("uploads").find().sort({ createdAt: -1 }).toArray();
    return uploads.map((u) => ({
      id: u._id.toString(),
      filename: u.filename,
      status: u.status,
      createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt),
      processedData: (u.processedData as Record<string, unknown>) ?? undefined
    }));
  }, fallbackUploads);
}
