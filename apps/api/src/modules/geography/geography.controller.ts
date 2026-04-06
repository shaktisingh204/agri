import { Controller, Get, Query } from "@nestjs/common";
import { ApiQuery, ApiTags } from "@nestjs/swagger";
import { GeographyService } from "./geography.service";

@ApiTags("geography")
@Controller()
export class GeographyController {
  constructor(private readonly geographyService: GeographyService) {}

  @Get("countries")
  getCountries() {
    return this.geographyService.getCountries();
  }

  @ApiQuery({ name: "country", required: false })
  @Get("regions")
  getRegions(@Query("country") country?: string) {
    return this.geographyService.getRegions(country);
  }
}

