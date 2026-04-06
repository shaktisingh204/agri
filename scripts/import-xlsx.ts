import { MongoClient } from "mongodb";
import * as XLSX from "xlsx";
import path from "path";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb+srv://adsinc:adsinc@cluster0.kaofmaq.mongodb.net/agri_crop_calendar?retryWrites=true&w=majority";
const XLSX_PATH = path.resolve(__dirname, "../New_Crop_Calendar.xlsx");

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

  // Skip garbage data
  if (!cleaned || cleaned === "-" || cleaned === "--" || cleaned === "- -") return [];
  if (/^0001/.test(cleaned)) return [];
  if (/Not Practice/i.test(cleaned)) return [];
  if (/^00\/01\/1900/.test(cleaned)) return [];

  const months = new Set<number>();

  // Try to extract month names from the text
  const lowerText = cleaned.toLowerCase();

  // Match month names (full or abbreviated)
  const monthPattern = /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = monthPattern.exec(lowerText)) !== null) {
    const monthNum = MONTH_MAP[match[1].toLowerCase()];
    if (monthNum) months.add(monthNum);
  }

  // Also try to extract from date formats like "25/06/2018" or "15/10/2018"
  const datePattern = /(\d{1,2})\/(\d{1,2})\/(\d{4})/g;
  while ((match = datePattern.exec(cleaned)) !== null) {
    const monthVal = parseInt(match[2], 10);
    if (monthVal >= 1 && monthVal <= 12) {
      months.add(monthVal);
    }
  }

  return Array.from(months).sort((a, b) => a - b);
}

function expandMonthRange(fromMonths: number[], toMonths: number[]): number[] {
  if (fromMonths.length === 0 && toMonths.length === 0) return [];

  const allMonths = [...fromMonths, ...toMonths];
  if (allMonths.length <= 1) return allMonths;

  const minMonth = Math.min(...allMonths);
  const maxMonth = Math.max(...allMonths);

  const result: number[] = [];
  if (minMonth <= maxMonth) {
    for (let m = minMonth; m <= maxMonth; m++) {
      result.push(m);
    }
  } else {
    // Wraps around year (e.g., Nov to Feb)
    for (let m = minMonth; m <= 12; m++) result.push(m);
    for (let m = 1; m <= maxMonth; m++) result.push(m);
  }

  return result;
}

function buildGrowingMonths(sowing: number[], harvesting: number[]): number[] {
  return Array.from(new Set([...sowing, ...harvesting])).sort((a, b) => a - b);
}

interface RawRow {
  "Sl. No.": string | number;
  State: string;
  "Name of the district (All districts)": string;
  "District code": string | number;
  Crop: string;
  Season: string;
  "Sowing Period": string;
  "Harvesting period": string;
}

async function main() {
  console.log("Reading xlsx file:", XLSX_PATH);
  const workbook = XLSX.readFile(XLSX_PATH);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "" });

  console.log(`Parsed ${rawData.length} rows from sheet "${sheetName}"`);

  // Filter valid rows
  const validRows = rawData.filter((row) => {
    const state = String(row.State ?? "").trim();
    const district = String(row["Name of the district (All districts)"] ?? "").trim();
    const crop = String(row.Crop ?? "").trim();
    if (!state || !district || !crop) return false;
    if (/other crop/i.test(crop)) return false;
    if (crop === "From              To") return false;
    return true;
  });

  console.log(`${validRows.length} valid rows after filtering`);

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  // Ensure India country exists
  await db.collection("countries").updateOne(
    { code: "IN" },
    {
      $set: { name: "India", updatedAt: new Date() },
      $setOnInsert: { code: "IN", createdAt: new Date() },
    },
    { upsert: true }
  );
  const country = await db.collection("countries").findOne({ code: "IN" });

  // Ensure tenant exists
  await db.collection("tenants").updateOne(
    { slug: "fao-demo" },
    {
      $set: { updatedAt: new Date() },
      $setOnInsert: {
        slug: "fao-demo",
        companyName: "FAO Demo Intelligence",
        planType: "ENTERPRISE",
        billingProvider: "STRIPE",
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
  const tenant = await db.collection("tenants").findOne({ slug: "fao-demo" });

  // Create indexes
  await db.collection("crops").createIndex({ slug: 1 }, { unique: true });
  await db.collection("regions").createIndex(
    { countryId: 1, name: 1, agroZoneName: 1 },
    { unique: true }
  );

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const year = new Date().getFullYear();

  // Cache for crops and regions to avoid repeated lookups
  const cropCache = new Map<string, { _id: unknown }>();
  const regionCache = new Map<string, { _id: unknown }>();

  const total = validRows.length;
  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i];
    if ((i + 1) % 100 === 0 || i === 0) {
      console.log(`Processing row ${i + 1}/${total}...`);
    }
    const stateName = String(row.State).trim();
    const districtName = String(row["Name of the district (All districts)"]).trim();
    const cropName = String(row.Crop).trim();
    const season = String(row.Season ?? "").trim() || "General";
    const sowingText = String(row["Sowing Period"] ?? "");
    const harvestingText = String(row["Harvesting period"] ?? "");

    const sowingMonths = parseMonthsFromText(sowingText);
    const harvestingMonths = parseMonthsFromText(harvestingText);

    // Skip rows where we couldn't parse any months
    if (sowingMonths.length === 0 && harvestingMonths.length === 0) {
      skipped++;
      continue;
    }

    const growingMonths = buildGrowingMonths(sowingMonths, harvestingMonths);

    // Upsert crop
    const cropSlug = cropName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    let cropDoc = cropCache.get(cropSlug);
    if (!cropDoc) {
      await db.collection("crops").updateOne(
        { slug: cropSlug },
        {
          $set: { name: cropName, updatedAt: new Date() },
          $setOnInsert: { slug: cropSlug, category: "Unknown", createdAt: new Date() },
        },
        { upsert: true }
      );
      cropDoc = (await db.collection("crops").findOne({ slug: cropSlug }))!;
      cropCache.set(cropSlug, cropDoc);
    }

    // Upsert region (district as region name, state as agroZoneName)
    const regionKey = `${stateName}|${districtName}`;
    let regionDoc = regionCache.get(regionKey);
    if (!regionDoc) {
      await db.collection("regions").updateOne(
        { countryId: country!._id, name: districtName, agroZoneName: stateName },
        {
          $set: { updatedAt: new Date() },
          $setOnInsert: {
            countryId: country!._id,
            name: districtName,
            agroZoneName: stateName,
            latitude: null,
            longitude: null,
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
      regionDoc = (await db.collection("regions").findOne({
        countryId: country!._id,
        name: districtName,
        agroZoneName: stateName,
      }))!;
      regionCache.set(regionKey, regionDoc);
    }

    // Upsert crop calendar
    const existing = await db.collection("cropCalendars").findOne({
      tenantId: tenant!._id,
      cropId: cropDoc._id,
      regionId: regionDoc._id,
      seasonName: season,
      year,
    });

    if (existing) {
      const mergedSowing = Array.from(new Set([...existing.sowingMonths, ...sowingMonths])).sort((a, b) => a - b);
      const mergedHarvesting = Array.from(new Set([...existing.harvestingMonths, ...harvestingMonths])).sort((a, b) => a - b);
      await db.collection("cropCalendars").updateOne(
        { _id: existing._id },
        {
          $set: {
            sowingMonths: mergedSowing,
            harvestingMonths: mergedHarvesting,
            growingMonths: buildGrowingMonths(mergedSowing, mergedHarvesting),
            updatedAt: new Date(),
          },
        }
      );
      updated++;
    } else {
      await db.collection("cropCalendars").insertOne({
        tenantId: tenant!._id,
        cropId: cropDoc._id,
        regionId: regionDoc._id,
        seasonName: season,
        year,
        sowingMonths,
        harvestingMonths,
        growingMonths,
        notes: `Imported from New_Crop_Calendar.xlsx - ${stateName}/${districtName}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      inserted++;
    }
  }

  console.log(`\nImport complete!`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Updated:  ${updated}`);
  console.log(`  Skipped:  ${skipped} (no parseable months)`);

  await client.close();
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
