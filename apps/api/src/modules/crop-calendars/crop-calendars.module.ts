import { Module } from "@nestjs/common";
import { CropCalendarsController } from "./crop-calendars.controller";
import { CropCalendarsResolver } from "./crop-calendars.resolver";
import { CropCalendarsService } from "./crop-calendars.service";

@Module({
  controllers: [CropCalendarsController],
  providers: [CropCalendarsService, CropCalendarsResolver],
  exports: [CropCalendarsService]
})
export class CropCalendarsModule {}

