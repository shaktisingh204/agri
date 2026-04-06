import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import { Cache } from "cache-manager";
import { PrismaService } from "../../prisma/prisma.service";
import { CropCalendarQueryDto } from "./crop-calendars.dto";

@Injectable()
export class CropCalendarsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) {}

  async getCrops() {
    return this.prisma.crop.findMany({
      orderBy: { name: "asc" }
    });
  }

  async getCalendars(query: CropCalendarQueryDto, tenantId = "default") {
    const hasActiveFilters = Boolean(
      query.crop || query.region || query.state || query.country || query.season || query.year || query.month
    );

    if (!hasActiveFilters) {
      return [];
    }

    const cacheKey = `calendar:${tenantId}:${JSON.stringify(query)}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const regionFilter =
      query.region || query.state || query.country
        ? {
            ...(query.region ? { name: query.region } : {}),
            ...(query.state ? { agroZoneName: query.state } : {}),
            ...(query.country
              ? {
                  country: {
                    code: query.country
                  }
                }
              : {})
          }
        : undefined;

    const calendars = await this.prisma.cropCalendar.findMany({
      where: {
        tenant: tenantId === "default" ? undefined : { slug: tenantId },
        crop: query.crop
          ? {
              slug: query.crop
            }
          : undefined,
        seasonName: query.season,
        year: query.year,
        ...(query.month
          ? {
              OR: [
                {
                  sowingMonths: {
                    has: query.month
                  }
                },
                {
                  growingMonths: {
                    has: query.month
                  }
                },
                {
                  harvestingMonths: {
                    has: query.month
                  }
                }
              ]
            }
          : {}),
        region: regionFilter
      },
      include: {
        crop: true,
        region: {
          include: {
            country: true
          }
        },
        tenant: true
      },
      orderBy: [{ crop: { name: "asc" } }, { region: { name: "asc" } }]
    });

    const normalized = calendars.map((entry) => ({
      id: entry.id,
      cropName: entry.crop.name,
      cropCategory: entry.crop.category,
      countryCode: entry.region.country.code,
      countryName: entry.region.country.name,
      stateName: entry.region.agroZoneName,
      regionName: entry.region.name,
      agroEcologicalZone: entry.region.agroZoneName,
      seasonName: entry.seasonName,
      year: entry.year,
      sowingMonths: entry.sowingMonths,
      growingMonths: entry.growingMonths,
      harvestingMonths: entry.harvestingMonths
    }));

    await this.cacheManager.set(cacheKey, normalized, 60_000);
    return normalized;
  }
}
