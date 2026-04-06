import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsage() {
    const events = await this.prisma.usageEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 20
    });

    const totalRequests = events.reduce((sum, event) => sum + event.quantity, 0);

    return {
      totalRequests,
      recentEvents: events
    };
  }

  async getPopularCrops() {
    const calendars = await this.prisma.cropCalendar.findMany({
      include: {
        crop: true
      }
    });

    const counts = calendars.reduce<Record<string, { cropName: string; usageCount: number }>>((acc, calendar) => {
      const existing = acc[calendar.cropId];
      acc[calendar.cropId] = {
        cropName: calendar.crop.name,
        usageCount: (existing?.usageCount ?? 0) + 1
      };
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([cropId, value]) => ({
        cropId,
        ...value
      }))
      .sort((left, right) => right.usageCount - left.usageCount)
      .slice(0, 10);
  }
}
