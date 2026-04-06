import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UploadStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsArray, IsEnum, IsInt, IsObject, IsOptional, IsString, ValidateNested } from "class-validator";

export class CreateUploadDto {
  @ApiProperty()
  @IsString()
  fileUrl!: string;

  @ApiProperty()
  @IsString()
  filename!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  processedData?: Record<string, unknown>;
}

export class SyncUploadDto {
  @ApiProperty()
  @IsString()
  uploadId!: string;

  @ApiProperty({ enum: UploadStatus })
  @IsEnum(UploadStatus)
  status!: UploadStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  processedData?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  errorMessage?: string;
}

export class UploadCalendarRowDto {
  @ApiProperty()
  @IsString()
  crop!: string;

  @ApiProperty()
  @IsString()
  state!: string;

  @ApiProperty()
  @IsString()
  district!: string;

  @ApiProperty()
  @IsString()
  season!: string;

  @ApiProperty({ type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  sowing_months!: number[];

  @ApiProperty({ type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  harvesting_months!: number[];
}

export class CommitUploadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  uploadId?: string;

  @ApiPropertyOptional({ default: "fao-demo" })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  year?: number;

  @ApiProperty()
  @IsString()
  csvFile!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sessionFile?: string;

  @ApiPropertyOptional({ type: [UploadCalendarRowDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UploadCalendarRowDto)
  rows?: UploadCalendarRowDto[];

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  flaggedCount?: number;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  flaggedRows?: Array<Record<string, unknown>>;
}
