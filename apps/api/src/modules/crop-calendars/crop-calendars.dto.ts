import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Field, InputType, Int, ObjectType } from "@nestjs/graphql";
import { Type } from "class-transformer";

export class CropCalendarQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  crop?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  season?: string;

  @ApiPropertyOptional({ minimum: 2000, maximum: 2100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}

@InputType()
export class CropCalendarFilterInput {
  @Field(() => String, { nullable: true })
  crop?: string;

  @Field(() => String, { nullable: true })
  region?: string;

  @Field(() => String, { nullable: true })
  state?: string;

  @Field(() => String, { nullable: true })
  country?: string;

  @Field(() => String, { nullable: true })
  season?: string;

  @Field(() => Int, { nullable: true })
  year?: number;

  @Field(() => Int, { nullable: true })
  month?: number;
}

@ObjectType()
export class CropCalendarNode {
  @Field()
  id!: string;

  @Field()
  cropName!: string;

  @Field()
  cropCategory!: string;

  @Field()
  countryCode!: string;

  @Field()
  countryName!: string;

  @Field()
  stateName!: string;

  @Field()
  regionName!: string;

  @Field()
  agroEcologicalZone!: string;

  @Field()
  seasonName!: string;

  @Field(() => Int)
  year!: number;

  @Field(() => [Int])
  sowingMonths!: number[];

  @Field(() => [Int])
  growingMonths!: number[];

  @Field(() => [Int])
  harvestingMonths!: number[];
}
