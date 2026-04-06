"use server";

import { getDb } from "../../lib/mongodb";
import { ObjectId } from "mongodb";

interface CalendarRow {
  crop: string;
  state: string;
  district: string;
  season: string;
  sowing_months: number[];
  harvesting_months: number[];
}

function mergeMonthArrays(a: number[], b: number[]) {
  return Array.from(new Set([...a, ...b])).sort((l, r) => l - r);
}

function buildGrowingMonths(sowing: number[], harvesting: number[]) {
  return Array.from(new Set([...sowing, ...harvesting])).sort((l, r) => l - r);
}

function mergeDuplicateRows(rows: CalendarRow[]) {
  const merged = new Map<string, CalendarRow>();
  for (const row of rows) {
    const key = `${row.state.toLowerCase()}|${row.district.toLowerCase()}|${row.crop.toLowerCase()}|${row.season.toLowerCase()}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, {
        ...row,
        sowing_months: mergeMonthArrays([], row.sowing_months),
        harvesting_months: mergeMonthArrays([], row.harvesting_months),
      });
    } else {
      existing.sowing_months = mergeMonthArrays(existing.sowing_months, row.sowing_months);
      existing.harvesting_months = mergeMonthArrays(existing.harvesting_months, row.harvesting_months);
    }
  }
  return Array.from(merged.values());
}

export async function commitCropCalendarData(body: {
  uploadId?: string;
  tenantId?: string;
  year?: number;
  csvFile: string;
  rows?: CalendarRow[];
  flaggedCount?: number;
  flaggedRows?: Array<Record<string, unknown>>;
}) {
  const { uploadId, tenantId, year: rawYear, csvFile, rows, flaggedCount, flaggedRows } = body;

  if (!csvFile) {
    return { error: "csvFile is required" };
  }

  const sourceRows = rows?.length ? rows : [];
  if (!sourceRows.length) {
    return { error: "No extracted rows received for commit" };
  }

  const db = await getDb();
  const tenant =
    (await db.collection("tenants").findOne({ slug: tenantId ?? "fao-demo" })) ??
    (await db.collection("tenants").findOne());

  if (!tenant) {
    return { error: "No tenant found" };
  }

  const commitYear = rawYear ?? new Date().getFullYear();
  const normalizedRows = mergeDuplicateRows(sourceRows);

  // Create or update upload record
  let uploadObjId: ObjectId;
  if (uploadId) {
    uploadObjId = new ObjectId(uploadId);
    await db.collection("uploads").updateOne(
      { _id: uploadObjId },
      { $set: { status: "PROCESSING", updatedAt: new Date() } }
    );
  } else {
    const result = await db.collection("uploads").insertOne({
      tenantId: tenant._id,
      filename: `commit-${Date.now()}.pdf`,
      fileUrl: csvFile,
      status: "PROCESSING",
      processedData: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    uploadObjId = result.insertedId;
  }

  // Upsert India as country
  await db.collection("countries").updateOne(
    { code: "IN" },
    { $setOnInsert: { code: "IN", name: "India", createdAt: new Date() }, $set: { updatedAt: new Date() } },
    { upsert: true }
  );
  const country = await db.collection("countries").findOne({ code: "IN" });

  const createdIds: string[] = [];

  for (const row of normalizedRows) {
    const cropSlug = row.crop
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Upsert crop
    await db.collection("crops").updateOne(
      { slug: cropSlug },
      {
        $set: { name: row.crop, updatedAt: new Date() },
        $setOnInsert: { slug: cropSlug, category: "Unknown", createdAt: new Date() },
      },
      { upsert: true }
    );
    const crop = await db.collection("crops").findOne({ slug: cropSlug });

    // Upsert region
    await db.collection("regions").updateOne(
      { countryId: country!._id, name: row.district, agroZoneName: row.state },
      {
        $set: { updatedAt: new Date() },
        $setOnInsert: {
          countryId: country!._id,
          name: row.district,
          agroZoneName: row.state,
          latitude: null,
          longitude: null,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
    const region = await db.collection("regions").findOne({
      countryId: country!._id,
      name: row.district,
      agroZoneName: row.state,
    });

    // Check existing calendar
    const existingCalendar = await db.collection("cropCalendars").findOne({
      tenantId: tenant._id,
      cropId: crop!._id,
      regionId: region!._id,
      seasonName: row.season,
      year: commitYear,
    });

    if (existingCalendar) {
      const newSowing = mergeMonthArrays(existingCalendar.sowingMonths, row.sowing_months);
      const newHarvesting = mergeMonthArrays(existingCalendar.harvestingMonths, row.harvesting_months);
      await db.collection("cropCalendars").updateOne(
        { _id: existingCalendar._id },
        {
          $set: {
            sowingMonths: newSowing,
            harvestingMonths: newHarvesting,
            growingMonths: buildGrowingMonths(newSowing, newHarvesting),
            updatedAt: new Date(),
          },
        }
      );
      createdIds.push(existingCalendar._id.toString());
    } else {
      const result = await db.collection("cropCalendars").insertOne({
        tenantId: tenant._id,
        cropId: crop!._id,
        regionId: region!._id,
        seasonName: row.season,
        year: commitYear,
        sowingMonths: row.sowing_months,
        harvestingMonths: row.harvesting_months,
        growingMonths: buildGrowingMonths(row.sowing_months, row.harvesting_months),
        notes: `Imported via CSV staging file: ${csvFile}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      createdIds.push(result.insertedId.toString());
    }
  }

  // Mark upload as completed
  await db.collection("uploads").updateOne(
    { _id: uploadObjId },
    {
      $set: {
        status: "COMPLETED",
        processedData: {
          csvFile,
          committedRows: normalizedRows.length,
          flaggedRows: flaggedCount ?? flaggedRows?.length ?? 0,
          cropCalendarIds: createdIds,
        },
        updatedAt: new Date(),
      },
    }
  );

  return {
    uploadId: uploadObjId.toString(),
    committedRows: normalizedRows.length,
    year: commitYear,
  };
}
