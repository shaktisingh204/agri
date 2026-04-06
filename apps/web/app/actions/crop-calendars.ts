"use server";

import { getDb } from "../../lib/mongodb";
import { ObjectId } from "mongodb";
import type { Crop, CropCalendarRecord } from "../../lib/types";

export async function getCrops(): Promise<Crop[]> {
  const db = await getDb();
  const docs = await db.collection("crops").find().sort({ name: 1 }).toArray();
  return docs.map((d) => ({
    id: d._id.toString(),
    name: d.name,
    slug: d.slug,
    category: d.category,
  }));
}

export interface CalendarQuery {
  crop?: string;
  region?: string;
  state?: string;
  country?: string;
  season?: string;
  year?: number;
  month?: number;
}

export async function getCalendars(query: CalendarQuery): Promise<CropCalendarRecord[]> {
  const hasActiveFilters = Boolean(
    query.crop || query.region || query.state || query.country || query.season || query.year || query.month
  );

  if (!hasActiveFilters) {
    return [];
  }

  const db = await getDb();

  // Build region filter
  const regionQuery: Record<string, unknown> = {};
  if (query.region) regionQuery.name = query.region;
  if (query.state) regionQuery.agroZoneName = query.state;
  if (query.country) {
    const countryDoc = await db.collection("countries").findOne({ code: query.country });
    if (countryDoc) regionQuery.countryId = countryDoc._id;
  }

  let regionIds: ObjectId[] | undefined;
  if (Object.keys(regionQuery).length > 0) {
    const regionDocs = await db.collection("regions").find(regionQuery).toArray();
    regionIds = regionDocs.map((r) => r._id);
  }

  // Build crop filter
  let cropIds: ObjectId[] | undefined;
  if (query.crop) {
    const cropDocs = await db.collection("crops").find({ slug: query.crop }).toArray();
    cropIds = cropDocs.map((c) => c._id);
  }

  // Build calendar query
  const calQuery: Record<string, unknown> = {};
  if (cropIds) calQuery.cropId = { $in: cropIds };
  if (regionIds) calQuery.regionId = { $in: regionIds };
  if (query.season) calQuery.seasonName = query.season;
  if (query.month) {
    calQuery.$or = [
      { sowingMonths: query.month },
      { growingMonths: query.month },
      { harvestingMonths: query.month },
    ];
  }

  const entries = await db.collection("cropCalendars").find(calQuery).toArray();

  // Fetch related data
  const allCropIds = [...new Set(entries.map((e) => e.cropId.toString()))];
  const allRegionIds = [...new Set(entries.map((e) => e.regionId.toString()))];

  const [cropDocs, regionDocs] = await Promise.all([
    db.collection("crops").find({ _id: { $in: allCropIds.map((id) => new ObjectId(id)) } }).toArray(),
    db.collection("regions").find({ _id: { $in: allRegionIds.map((id) => new ObjectId(id)) } }).toArray(),
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
      harvestingMonths: entry.harvestingMonths,
    };
  });
}
