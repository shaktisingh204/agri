"use server";

import { getDb } from "../../lib/mongodb";
import { ObjectId } from "mongodb";
import type { Country, Region } from "../../lib/types";

export async function getCountries(): Promise<Country[]> {
  const db = await getDb();
  const docs = await db.collection("countries").find().sort({ name: 1 }).toArray();
  return docs.map((d) => ({ id: d._id.toString(), code: d.code, name: d.name }));
}

export async function getRegions(countryCode?: string): Promise<Region[]> {
  const db = await getDb();
  let countryFilter: Record<string, unknown> = {};

  if (countryCode) {
    const countryDoc = await db.collection("countries").findOne({ code: countryCode });
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
        : { id: "", code: "", name: "" },
    };
  });
}
