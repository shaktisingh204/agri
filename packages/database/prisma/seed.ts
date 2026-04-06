import {
  BillingProvider,
  PlanType,
  PrismaClient,
  Role,
  UploadStatus
} from "@prisma/client";

const prisma = new PrismaClient();

const countries = [
  {
    code: "NG",
    name: "Nigeria",
    regions: [
      { name: "North Central", agroZoneName: "Guinea Savannah", latitude: 9.082, longitude: 8.6753 },
      { name: "North West", agroZoneName: "Sudan Savannah", latitude: 12.0022, longitude: 8.592 },
      { name: "South West", agroZoneName: "Derived Savannah", latitude: 7.3775, longitude: 3.947 }
    ]
  },
  {
    code: "KE",
    name: "Kenya",
    regions: [
      { name: "Rift Valley", agroZoneName: "Highland Maize Zone", latitude: -0.3031, longitude: 36.08 },
      { name: "Western", agroZoneName: "Lake Basin", latitude: 0.5143, longitude: 34.5653 },
      { name: "Eastern", agroZoneName: "Semi-Arid Lowlands", latitude: -0.4346, longitude: 37.975 }
    ]
  },
  {
    code: "GH",
    name: "Ghana",
    regions: [
      { name: "Northern", agroZoneName: "Interior Savannah", latitude: 9.4075, longitude: -0.8533 },
      { name: "Ashanti", agroZoneName: "Forest Transition", latitude: 6.6885, longitude: -1.6244 },
      { name: "Volta", agroZoneName: "Coastal Transition", latitude: 6.6008, longitude: 0.472 }
    ]
  },
  {
    code: "TZ",
    name: "Tanzania",
    regions: [
      { name: "Mbeya", agroZoneName: "Southern Highlands", latitude: -8.9094, longitude: 33.4607 },
      { name: "Morogoro", agroZoneName: "Sub-Humid Plains", latitude: -6.8278, longitude: 37.6591 },
      { name: "Dodoma", agroZoneName: "Central Semi-Arid", latitude: -6.163, longitude: 35.7516 }
    ]
  },
  {
    code: "UG",
    name: "Uganda",
    regions: [
      { name: "Central", agroZoneName: "Lake Victoria Crescent", latitude: 0.3476, longitude: 32.5825 },
      { name: "Eastern", agroZoneName: "Montane Mixed Farming", latitude: 1.0806, longitude: 34.175 },
      { name: "Northern", agroZoneName: "Northern Farming System", latitude: 2.7724, longitude: 32.2881 }
    ]
  },
  {
    code: "ET",
    name: "Ethiopia",
    regions: [
      { name: "Oromia", agroZoneName: "Mid-Altitude Mixed Farming", latitude: 8.9806, longitude: 38.7578 },
      { name: "Amhara", agroZoneName: "Highland Cereals", latitude: 11.5936, longitude: 37.3908 },
      { name: "SNNP", agroZoneName: "Enset-Coffee Zone", latitude: 6.8333, longitude: 37.75 }
    ]
  },
  {
    code: "ZM",
    name: "Zambia",
    regions: [
      { name: "Central", agroZoneName: "Plateau Zone", latitude: -14.9833, longitude: 28.7 },
      { name: "Eastern", agroZoneName: "Maize-Cotton Belt", latitude: -13.537, longitude: 32.6401 },
      { name: "Southern", agroZoneName: "Dryland Mixed Farming", latitude: -16.8244, longitude: 26.987 }
    ]
  },
  {
    code: "IN",
    name: "India",
    regions: [
      { name: "Punjab", agroZoneName: "Irrigated Plains", latitude: 31.1471, longitude: 75.3412 },
      { name: "Maharashtra", agroZoneName: "Semi-Arid Tropics", latitude: 19.7515, longitude: 75.7139 },
      { name: "West Bengal", agroZoneName: "Humid Alluvial Plains", latitude: 22.9868, longitude: 87.855 }
    ]
  }
] as const;

const crops = [
  { slug: "maize", name: "Maize", category: "Cereal" },
  { slug: "rice", name: "Rice", category: "Cereal" },
  { slug: "wheat", name: "Wheat", category: "Cereal" },
  { slug: "sorghum", name: "Sorghum", category: "Cereal" },
  { slug: "millet", name: "Millet", category: "Cereal" },
  { slug: "cassava", name: "Cassava", category: "Root & Tuber" },
  { slug: "yam", name: "Yam", category: "Root & Tuber" },
  { slug: "beans", name: "Beans", category: "Legume" },
  { slug: "groundnut", name: "Groundnut", category: "Legume" },
  { slug: "cotton", name: "Cotton", category: "Cash Crop" },
  { slug: "coffee", name: "Coffee", category: "Cash Crop" },
  { slug: "tea", name: "Tea", category: "Cash Crop" }
] as const;

type CalendarSeed = {
  countryCode: string;
  regionName: string;
  cropSlug: string;
  seasonName: string;
  year: number;
  sowingMonths: number[];
  growingMonths: number[];
  harvestingMonths: number[];
  notes?: string;
};

const calendars: CalendarSeed[] = [
  { countryCode: "NG", regionName: "North Central", cropSlug: "maize", seasonName: "Main Rainy Season", year: 2026, sowingMonths: [4, 5], growingMonths: [6, 7, 8], harvestingMonths: [9, 10] },
  { countryCode: "NG", regionName: "North West", cropSlug: "sorghum", seasonName: "Sahel Wet Season", year: 2026, sowingMonths: [5, 6], growingMonths: [7, 8], harvestingMonths: [9, 10] },
  { countryCode: "NG", regionName: "South West", cropSlug: "cassava", seasonName: "Perennial Cycle", year: 2026, sowingMonths: [3, 4], growingMonths: [5, 6, 7, 8, 9, 10], harvestingMonths: [11, 12] },
  { countryCode: "NG", regionName: "North Central", cropSlug: "yam", seasonName: "Tuber Season", year: 2026, sowingMonths: [3, 4], growingMonths: [5, 6, 7, 8], harvestingMonths: [9, 10, 11] },
  { countryCode: "KE", regionName: "Rift Valley", cropSlug: "maize", seasonName: "Long Rains", year: 2026, sowingMonths: [3, 4], growingMonths: [5, 6, 7], harvestingMonths: [8, 9] },
  { countryCode: "KE", regionName: "Western", cropSlug: "beans", seasonName: "Long Rains", year: 2026, sowingMonths: [3, 4], growingMonths: [5, 6], harvestingMonths: [6, 7] },
  { countryCode: "KE", regionName: "Eastern", cropSlug: "millet", seasonName: "Short Rains", year: 2026, sowingMonths: [10, 11], growingMonths: [11, 12], harvestingMonths: [1, 2] },
  { countryCode: "GH", regionName: "Northern", cropSlug: "groundnut", seasonName: "Northern Wet Season", year: 2026, sowingMonths: [5, 6], growingMonths: [7, 8], harvestingMonths: [9, 10] },
  { countryCode: "GH", regionName: "Ashanti", cropSlug: "maize", seasonName: "Major Season", year: 2026, sowingMonths: [3, 4], growingMonths: [5, 6], harvestingMonths: [7, 8] },
  { countryCode: "GH", regionName: "Volta", cropSlug: "rice", seasonName: "Lowland Cycle", year: 2026, sowingMonths: [4, 5], growingMonths: [6, 7, 8], harvestingMonths: [9, 10] },
  { countryCode: "TZ", regionName: "Mbeya", cropSlug: "wheat", seasonName: "Highland Cool Season", year: 2026, sowingMonths: [5, 6], growingMonths: [7, 8, 9], harvestingMonths: [10, 11] },
  { countryCode: "TZ", regionName: "Morogoro", cropSlug: "rice", seasonName: "Msimu Main Season", year: 2026, sowingMonths: [11, 12], growingMonths: [1, 2, 3], harvestingMonths: [4, 5] },
  { countryCode: "TZ", regionName: "Dodoma", cropSlug: "sorghum", seasonName: "Semi-Arid Main Season", year: 2026, sowingMonths: [12, 1], growingMonths: [2, 3], harvestingMonths: [4, 5] },
  { countryCode: "UG", regionName: "Central", cropSlug: "coffee", seasonName: "Main Harvest Window", year: 2026, sowingMonths: [3, 4], growingMonths: [5, 6, 7, 8], harvestingMonths: [9, 10, 11] },
  { countryCode: "UG", regionName: "Eastern", cropSlug: "beans", seasonName: "First Rains", year: 2026, sowingMonths: [3, 4], growingMonths: [4, 5], harvestingMonths: [6, 7] },
  { countryCode: "UG", regionName: "Northern", cropSlug: "cassava", seasonName: "Staple Cycle", year: 2026, sowingMonths: [4, 5], growingMonths: [6, 7, 8, 9], harvestingMonths: [10, 11, 12] },
  { countryCode: "ET", regionName: "Oromia", cropSlug: "wheat", seasonName: "Meher", year: 2026, sowingMonths: [6, 7], growingMonths: [8, 9, 10], harvestingMonths: [11, 12] },
  { countryCode: "ET", regionName: "Amhara", cropSlug: "teff", seasonName: "Meher", year: 2026, sowingMonths: [6, 7], growingMonths: [8, 9], harvestingMonths: [10, 11], notes: "Teff represented through wheat-like cereal timing in some dashboards." },
  { countryCode: "ET", regionName: "SNNP", cropSlug: "coffee", seasonName: "Coffee Harvest", year: 2026, sowingMonths: [4, 5], growingMonths: [6, 7, 8, 9], harvestingMonths: [10, 11, 12] },
  { countryCode: "ZM", regionName: "Central", cropSlug: "maize", seasonName: "Rainfed Main Season", year: 2026, sowingMonths: [11, 12], growingMonths: [1, 2, 3], harvestingMonths: [4, 5] },
  { countryCode: "ZM", regionName: "Eastern", cropSlug: "cotton", seasonName: "Commercial Cycle", year: 2026, sowingMonths: [11, 12], growingMonths: [1, 2, 3, 4], harvestingMonths: [5, 6] },
  { countryCode: "ZM", regionName: "Southern", cropSlug: "groundnut", seasonName: "Short Rainfed Cycle", year: 2026, sowingMonths: [11, 12], growingMonths: [1, 2], harvestingMonths: [3, 4] },
  { countryCode: "IN", regionName: "Punjab", cropSlug: "wheat", seasonName: "Rabi", year: 2026, sowingMonths: [11, 12], growingMonths: [1, 2, 3], harvestingMonths: [4, 5] },
  { countryCode: "IN", regionName: "Punjab", cropSlug: "rice", seasonName: "Kharif", year: 2026, sowingMonths: [6, 7], growingMonths: [8, 9], harvestingMonths: [10, 11] },
  { countryCode: "IN", regionName: "Maharashtra", cropSlug: "cotton", seasonName: "Kharif", year: 2026, sowingMonths: [6, 7], growingMonths: [8, 9, 10], harvestingMonths: [11, 12, 1] },
  { countryCode: "IN", regionName: "West Bengal", cropSlug: "rice", seasonName: "Aman", year: 2026, sowingMonths: [6, 7], growingMonths: [8, 9, 10], harvestingMonths: [11, 12] }
];

const extraCrops = [{ slug: "teff", name: "Teff", category: "Cereal" }] as const;

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "fao-demo" },
    update: {
      companyName: "FAO Demo Intelligence",
      planType: PlanType.ENTERPRISE,
      billingProvider: BillingProvider.STRIPE
    },
    create: {
      slug: "fao-demo",
      companyName: "FAO Demo Intelligence",
      planType: PlanType.ENTERPRISE,
      billingProvider: BillingProvider.STRIPE
    }
  });

  await prisma.user.upsert({
    where: { email: "admin@fao-demo.org" },
    update: {
      tenantId: tenant.id,
      fullName: "Demo Platform Admin",
      role: Role.ADMIN
    },
    create: {
      tenantId: tenant.id,
      email: "admin@fao-demo.org",
      passwordHash: "$2a$10$demo.hash.replace.in.production",
      fullName: "Demo Platform Admin",
      role: Role.ADMIN
    }
  });

  for (const countryData of countries) {
    const country = await prisma.country.upsert({
      where: { code: countryData.code },
      update: { name: countryData.name },
      create: { code: countryData.code, name: countryData.name }
    });

    for (const regionData of countryData.regions) {
      await prisma.region.upsert({
        where: {
          countryId_name_agroZoneName: {
            countryId: country.id,
            name: regionData.name,
            agroZoneName: regionData.agroZoneName
          }
        },
        update: {
          latitude: regionData.latitude,
          longitude: regionData.longitude
        },
        create: {
          countryId: country.id,
          name: regionData.name,
          agroZoneName: regionData.agroZoneName,
          latitude: regionData.latitude,
          longitude: regionData.longitude
        }
      });
    }
  }

  for (const cropData of [...crops, ...extraCrops]) {
    await prisma.crop.upsert({
      where: { slug: cropData.slug },
      update: {
        name: cropData.name,
        category: cropData.category
      },
      create: cropData
    });
  }

  const countryMap = new Map((await prisma.country.findMany()).map((country) => [country.code, country]));
  const cropMap = new Map((await prisma.crop.findMany()).map((crop) => [crop.slug, crop]));
  const regionMap = new Map(
    (
      await prisma.region.findMany({
        include: {
          country: true
        }
      })
    ).map((region) => [`${region.country.code}:${region.name}`, region])
  );

  for (const entry of calendars) {
    const country = countryMap.get(entry.countryCode);
    const crop = cropMap.get(entry.cropSlug);
    const region = regionMap.get(`${entry.countryCode}:${entry.regionName}`);

    if (!country || !crop || !region) {
      throw new Error(`Missing dependency for calendar seed ${entry.countryCode}/${entry.regionName}/${entry.cropSlug}`);
    }

    const existing = await prisma.cropCalendar.findFirst({
      where: {
        tenantId: tenant.id,
        cropId: crop.id,
        regionId: region.id,
        seasonName: entry.seasonName,
        year: entry.year
      }
    });

    if (existing) {
      await prisma.cropCalendar.update({
        where: { id: existing.id },
        data: {
          sowingMonths: entry.sowingMonths,
          growingMonths: entry.growingMonths,
          harvestingMonths: entry.harvestingMonths,
          notes: entry.notes
        }
      });
      continue;
    }

    await prisma.cropCalendar.create({
      data: {
        tenantId: tenant.id,
        cropId: crop.id,
        regionId: region.id,
        sowingMonths: entry.sowingMonths,
        growingMonths: entry.growingMonths,
        harvestingMonths: entry.harvestingMonths,
        seasonName: entry.seasonName,
        year: entry.year,
        notes: entry.notes
      }
    });
  }

  const uploads = [
    {
      filename: "fao-west-africa-crop-calendar.pdf",
      fileUrl: "s3://agri-crop-assets/demo/fao-west-africa-crop-calendar.pdf",
      status: UploadStatus.COMPLETED,
      processedData: {
        totalRows: 48,
        previewCrops: ["Maize", "Cassava", "Groundnut", "Rice"]
      }
    },
    {
      filename: "east-africa-seasonality-brief.pdf",
      fileUrl: "s3://agri-crop-assets/demo/east-africa-seasonality-brief.pdf",
      status: UploadStatus.COMPLETED,
      processedData: {
        totalRows: 36,
        previewCrops: ["Maize", "Beans", "Coffee", "Wheat"]
      }
    },
    {
      filename: "asia-monsoon-crop-patterns.pdf",
      fileUrl: "s3://agri-crop-assets/demo/asia-monsoon-crop-patterns.pdf",
      status: UploadStatus.COMPLETED,
      processedData: {
        totalRows: 24,
        previewCrops: ["Rice", "Wheat", "Cotton"]
      }
    }
  ];

  for (const upload of uploads) {
    const existing = await prisma.upload.findFirst({
      where: {
        tenantId: tenant.id,
        filename: upload.filename
      }
    });

    if (existing) {
      await prisma.upload.update({
        where: { id: existing.id },
        data: upload
      });
      continue;
    }

    await prisma.upload.create({
      data: {
        tenantId: tenant.id,
        ...upload
      }
    });
  }

  const usageEvents = [
    { eventName: "calendar_view", eventGroup: "usage", quantity: 187 },
    { eventName: "calendar_filter", eventGroup: "usage", quantity: 132 },
    { eventName: "region_map_open", eventGroup: "usage", quantity: 94 },
    { eventName: "comparison_mode", eventGroup: "usage", quantity: 51 },
    { eventName: "pdf_upload", eventGroup: "admin", quantity: 8 },
    { eventName: "preview_extract", eventGroup: "admin", quantity: 6 },
    { eventName: "commit_upload", eventGroup: "admin", quantity: 5 },
    { eventName: "graphql_query", eventGroup: "api", quantity: 73 }
  ];

  for (const usageEvent of usageEvents) {
    const existing = await prisma.usageEvent.findFirst({
      where: {
        tenantId: tenant.id,
        eventName: usageEvent.eventName,
        eventGroup: usageEvent.eventGroup
      }
    });

    if (existing) {
      await prisma.usageEvent.update({
        where: { id: existing.id },
        data: { quantity: usageEvent.quantity }
      });
      continue;
    }

    await prisma.usageEvent.create({
      data: {
        tenantId: tenant.id,
        ...usageEvent
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
