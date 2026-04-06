import { Controller, Get, Headers, Query } from "@nestjs/common";
import { ApiHeader, ApiQuery, ApiTags } from "@nestjs/swagger";
import { CropCalendarsService } from "./crop-calendars.service";
import { CropCalendarQueryDto } from "./crop-calendars.dto";

@ApiTags("crop-calendars")
@Controller()
export class CropCalendarsController {
  constructor(private readonly cropCalendarsService: CropCalendarsService) {}

  @Get("crops")
  getCrops() {
    return this.cropCalendarsService.getCrops();
  }

  @ApiHeader({ name: "x-tenant-id", required: false })
  @ApiQuery({ name: "crop", required: false })
  @ApiQuery({ name: "region", required: false })
  @ApiQuery({ name: "state", required: false })
  @ApiQuery({ name: "country", required: false })
  @ApiQuery({ name: "season", required: false })
  @ApiQuery({ name: "year", required: false, type: Number })
  @ApiQuery({ name: "month", required: false, type: Number })
  @Get("calendar")
  getCalendar(
    @Headers("x-tenant-id") tenantId: string | undefined,
    @Query() query: CropCalendarQueryDto
  ) {
    return this.cropCalendarsService.getCalendars(query, tenantId);
  }
}
