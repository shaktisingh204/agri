import { Body, Controller, Get, Headers, Post } from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";
import { CommitUploadDto, CreateUploadDto, SyncUploadDto } from "./uploads.dto";
import { UploadsService } from "./uploads.service";

@ApiTags("uploads")
@Controller()
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @ApiHeader({ name: "x-tenant-id", required: false })
  @Post("upload/pdf")
  createUpload(
    @Body() payload: CreateUploadDto,
    @Headers("x-tenant-id") tenantId?: string
  ) {
    return this.uploadsService.createUpload(payload, tenantId);
  }

  @Post("admin/uploads/ingestion")
  syncProcessedUpload(@Body() payload: SyncUploadDto) {
    return this.uploadsService.syncProcessedUpload(payload);
  }

  @Post("admin/uploads/commit")
  commitUpload(@Body() payload: CommitUploadDto) {
    return this.uploadsService.commitUpload(payload);
  }

  @Get("uploads/status")
  getUploadStatus() {
    return this.uploadsService.getUploadStatus();
  }
}
