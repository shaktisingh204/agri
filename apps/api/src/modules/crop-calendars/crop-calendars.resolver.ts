import { Args, Query, Resolver } from "@nestjs/graphql";
import { CropCalendarsService } from "./crop-calendars.service";
import { CropCalendarFilterInput, CropCalendarNode } from "./crop-calendars.dto";

@Resolver(() => CropCalendarNode)
export class CropCalendarsResolver {
  constructor(private readonly cropCalendarsService: CropCalendarsService) {}

  @Query(() => [CropCalendarNode], { name: "cropCalendars" })
  cropCalendars(
    @Args("filters", { nullable: true }) filters?: CropCalendarFilterInput
  ) {
    return this.cropCalendarsService.getCalendars(filters ?? {});
  }
}

