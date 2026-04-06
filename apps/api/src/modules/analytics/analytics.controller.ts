import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AnalyticsService } from "./analytics.service";

@ApiTags("analytics")
@Controller()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("usage")
  getUsage() {
    return this.analyticsService.getUsage();
  }

  @Get("popular-crops")
  getPopularCrops() {
    return this.analyticsService.getPopularCrops();
  }
}

