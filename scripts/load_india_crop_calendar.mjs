import fs from "node:fs";
import path from "node:path";
import { PrismaClient, PlanType, Role, UploadStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    throw new Error("Usage: node scripts/load_india_crop_calendar.mjs <normalized-data.json>");
  }

  const payload = JSON.parse(fs.readFileSync(inputPath, "utf8"));

  const tenant = await prisma.tenant.upsert({
    where: { slug: "fao-demo" },
    update: {
      companyName: "India Crop Calendar Demo",
      planType: PlanType.ENTERPRISE
    },
    create: {
      slug: "fao-demo",
      companyName: "India Crop Calendar Demo",
      planType: PlanType.ENTERPRISE
    }
  });

  await prisma.user.upsert({
    where: { email: "admin@fao-demo.org" },
    update: {
      tenantId: tenant.id,
      fullName: "India Crop Calendar Admin",
      role: Role.ADMIN
    },
    create: {
      tenantId: tenant.id,
      email: "admin@fao-demo.org",
      passwordHash: "$2a$10$demo.hash.replace.in.production",
      fullName: "India Crop Calendar Admin",
      role: Role.ADMIN
    }
  });

  await prisma.$transaction([
    prisma.usageEvent.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.upload.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.cropCalendar.deleteMany({ where: { tenantId: tenant.id } }),
    prisma.region.deleteMany(),
    prisma.country.deleteMany(),
    prisma.crop.deleteMany()
  ]);

  const country = await prisma.country.create({
    data: {
      code: payload.country.code,
      name: payload.country.name
    }
  });

  if (payload.crops.length > 0) {
    await prisma.crop.createMany({ data: payload.crops });
  }

  if (payload.regions.length > 0) {
    await prisma.region.createMany({
      data: payload.regions.map((region) => ({
        countryId: country.id,
        name: region.name,
        agroZoneName: region.agroZoneName
      }))
    });
  }

  const cropMap = new Map(
    (await prisma.crop.findMany()).map((crop) => [crop.slug, crop.id])
  );
  const regionMap = new Map(
    (
      await prisma.region.findMany({
        where: { countryId: country.id }
      })
    ).map((region) => [`${region.agroZoneName}::${region.name}`, region.id])
  );

  const calendars = payload.calendars
    .map((calendar) => {
      const cropId = cropMap.get(calendar.cropSlug);
      const regionId = regionMap.get(`${calendar.agroZoneName}::${calendar.regionName}`);
      if (!cropId || !regionId) {
        return null;
      }

      return {
        tenantId: tenant.id,
        cropId,
        regionId,
        sowingMonths: calendar.sowingMonths,
        growingMonths: calendar.growingMonths,
        harvestingMonths: calendar.harvestingMonths,
        seasonName: calendar.seasonName,
        year: calendar.year,
        notes: calendar.notes
      };
    })
    .filter(Boolean);

  const calendarChunks = [];
  for (let index = 0; index < calendars.length; index += 500) {
    calendarChunks.push(calendars.slice(index, index + 500));
  }

  for (const chunk of calendarChunks) {
    await prisma.cropCalendar.createMany({ data: chunk });
  }

  for (const upload of payload.uploads) {
    await prisma.upload.create({
      data: {
        tenantId: tenant.id,
        filename: upload.filename,
        fileUrl: upload.fileUrl,
        status: UploadStatus[upload.status],
        processedData: upload.processedData
      }
    });
  }

  for (const usageEvent of payload.usageEvents) {
    await prisma.usageEvent.create({
      data: {
        tenantId: tenant.id,
        eventName: usageEvent.eventName,
        eventGroup: usageEvent.eventGroup,
        quantity: usageEvent.quantity
      }
    });
  }

  console.log(
    JSON.stringify({
      country: payload.country.name,
      crops: payload.crops.length,
      regions: payload.regions.length,
      calendars: calendars.length,
      upload: path.basename(payload.uploads[0]?.fileUrl ?? "")
    })
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
