"use server";

import { getDb } from "../../lib/mongodb";
import { ObjectId } from "mongodb";

export interface UsageData {
  totalRequests: number;
  recentEvents: { eventName: string; quantity: number }[];
}

export interface PopularCrop {
  cropName: string;
  usageCount: number;
}

export async function getUsage(): Promise<UsageData> {
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
    recentEvents: events.map((e) => ({
      eventName: e.eventName,
      quantity: e.quantity,
    })),
  };
}

export async function getPopularCrops(): Promise<PopularCrop[]> {
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
      usageCount: (existing?.usageCount ?? 0) + 1,
    };
  }

  return Object.entries(counts)
    .map(([, v]) => v)
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 10);
}
