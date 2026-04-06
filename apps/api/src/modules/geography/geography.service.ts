import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import { Cache } from "cache-manager";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class GeographyService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) {}

  async getCountries() {
    const cacheKey = "countries";
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const countries = await this.prisma.country.findMany({
      orderBy: { name: "asc" }
    });

    await this.cacheManager.set(cacheKey, countries, 60_000);
    return countries;
  }

  async getRegions(countryCode?: string) {
    return this.prisma.region.findMany({
      where: countryCode
        ? {
            country: {
              code: countryCode
            }
          }
        : undefined,
      include: {
        country: true
      },
      orderBy: [{ country: { name: "asc" } }, { name: "asc" }]
    });
  }
}

