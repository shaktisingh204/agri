import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, UploadStatus } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { PrismaService } from "../../prisma/prisma.service";
import { CommitUploadDto, CreateUploadDto, SyncUploadDto, UploadCalendarRowDto } from "./uploads.dto";

@Injectable()
export class UploadsService {
  constructor(private readonly prisma: PrismaService) {}

  async createUpload(payload: CreateUploadDto, tenantId = "fao-demo") {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        slug: tenantId
      }
    });

    return this.prisma.upload.create({
      data: {
        tenantId: tenant?.id ?? (await this.prisma.tenant.findFirstOrThrow()).id,
        fileUrl: payload.fileUrl,
        filename: payload.filename,
        status: payload.processedData ? UploadStatus.COMPLETED : UploadStatus.PENDING,
        processedData: payload.processedData as Prisma.InputJsonValue | undefined
      }
    });
  }

  async syncProcessedUpload(payload: SyncUploadDto) {
    const existing = await this.prisma.upload.findUnique({
      where: { id: payload.uploadId }
    });

    if (!existing) {
      throw new NotFoundException("Upload not found.");
    }

    return this.prisma.upload.update({
      where: { id: payload.uploadId },
      data: {
        status: payload.status,
        processedData: payload.processedData as Prisma.InputJsonValue | undefined,
        errorMessage: payload.errorMessage
      }
    });
  }

  async getUploadStatus() {
    return this.prisma.upload.findMany({
      orderBy: {
        createdAt: "desc"
      }
    });
  }

  async commitUpload(payload: CommitUploadDto) {
    const sourceRows =
      payload.rows?.length
        ? payload.rows
        : await this.loadRowsFromSessionFile(payload.sessionFile);

    if (!sourceRows.length) {
      throw new NotFoundException("No extracted rows received for commit.");
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: payload.tenantId ?? "fao-demo" }
    });

    const fallbackTenant = tenant ?? (await this.prisma.tenant.findFirstOrThrow());
    const commitYear = payload.year ?? new Date().getFullYear();
    const normalizedRows = this.mergeDuplicateRows(sourceRows);

    const upload =
      payload.uploadId
        ? await this.prisma.upload.update({
            where: { id: payload.uploadId },
            data: { status: UploadStatus.PROCESSING }
          })
        : await this.prisma.upload.create({
            data: {
              tenantId: fallbackTenant.id,
              filename: `commit-${Date.now()}.pdf`,
              fileUrl: payload.csvFile,
              status: UploadStatus.PROCESSING
            }
          });

    const country = await this.prisma.country.upsert({
      where: { code: "IN" },
      update: {},
      create: {
        code: "IN",
        name: "India"
      }
    });

    const savedCalendars = await this.prisma.$transaction(async (tx) => {
      const createdIds: string[] = [];

      for (const row of normalizedRows) {
        const cropSlug = row.crop.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const crop = await tx.crop.upsert({
          where: { slug: cropSlug },
          update: { name: row.crop },
          create: {
            slug: cropSlug,
            name: row.crop,
            category: "Unknown"
          }
        });

        const region = await tx.region.upsert({
          where: {
            countryId_name_agroZoneName: {
              countryId: country.id,
              name: row.district,
              agroZoneName: row.state
            }
          },
          update: {},
          create: {
            countryId: country.id,
            name: row.district,
            agroZoneName: row.state
          }
        });

        const existingCalendar = await tx.cropCalendar.findFirst({
          where: {
            tenantId: fallbackTenant.id,
            cropId: crop.id,
            regionId: region.id,
            seasonName: row.season,
            year: commitYear
          }
        });

        if (existingCalendar) {
          await tx.cropCalendar.update({
            where: { id: existingCalendar.id },
            data: {
              sowingMonths: this.mergeMonthArrays(existingCalendar.sowingMonths, row.sowing_months),
              harvestingMonths: this.mergeMonthArrays(existingCalendar.harvestingMonths, row.harvesting_months),
              growingMonths: this.buildGrowingMonths(
                this.mergeMonthArrays(existingCalendar.sowingMonths, row.sowing_months),
                this.mergeMonthArrays(existingCalendar.harvestingMonths, row.harvesting_months)
              )
            }
          });
          createdIds.push(existingCalendar.id);
          continue;
        }

        const created = await tx.cropCalendar.create({
          data: {
            tenantId: fallbackTenant.id,
            cropId: crop.id,
            regionId: region.id,
            seasonName: row.season,
            year: commitYear,
            sowingMonths: row.sowing_months,
            harvestingMonths: row.harvesting_months,
            growingMonths: this.buildGrowingMonths(row.sowing_months, row.harvesting_months),
            notes: `Imported via CSV staging file: ${payload.csvFile}`
          }
        });
        createdIds.push(created.id);
      }

      return createdIds;
    });

    const updatedUpload = await this.prisma.upload.update({
      where: { id: upload.id },
      data: {
        status: UploadStatus.COMPLETED,
        processedData: {
          csvFile: payload.csvFile,
          committedRows: normalizedRows.length,
          flaggedRows: payload.flaggedCount ?? payload.flaggedRows?.length ?? 0,
          cropCalendarIds: savedCalendars
        } as Prisma.InputJsonValue
      }
    });

    return {
      uploadId: updatedUpload.id,
      committedRows: normalizedRows.length,
      year: commitYear
    };
  }

  private async loadRowsFromSessionFile(sessionFile?: string) {
    if (!sessionFile) {
      return [];
    }

    const content = await readFile(sessionFile, "utf-8");
    const parsed = JSON.parse(content) as { rows?: unknown[] };
    const rows = parsed.rows ?? [];

    return rows
      .filter((row): row is UploadCalendarRowDto => {
        if (!row || typeof row !== "object") {
          return false;
        }

        const candidate = row as Record<string, unknown>;
        return (
          typeof candidate.crop === "string" &&
          typeof candidate.state === "string" &&
          typeof candidate.district === "string" &&
          typeof candidate.season === "string" &&
          Array.isArray(candidate.sowing_months) &&
          Array.isArray(candidate.harvesting_months)
        );
      })
      .map((row) => ({
        crop: row.crop,
        state: row.state,
        district: row.district,
        season: row.season,
        sowing_months: row.sowing_months.map((month) => Number(month)),
        harvesting_months: row.harvesting_months.map((month) => Number(month))
      }));
  }

  private mergeDuplicateRows(rows: UploadCalendarRowDto[]) {
    const merged = new Map<string, UploadCalendarRowDto>();

    for (const row of rows) {
      const key = `${row.state.toLowerCase()}|${row.district.toLowerCase()}|${row.crop.toLowerCase()}|${row.season.toLowerCase()}`;
      const existing = merged.get(key);

      if (!existing) {
        merged.set(key, {
          ...row,
          sowing_months: this.mergeMonthArrays([], row.sowing_months),
          harvesting_months: this.mergeMonthArrays([], row.harvesting_months)
        });
        continue;
      }

      existing.sowing_months = this.mergeMonthArrays(existing.sowing_months, row.sowing_months);
      existing.harvesting_months = this.mergeMonthArrays(existing.harvesting_months, row.harvesting_months);
    }

    return Array.from(merged.values());
  }

  private mergeMonthArrays(a: number[], b: number[]) {
    return Array.from(new Set([...a, ...b])).sort((left, right) => left - right);
  }

  private buildGrowingMonths(sowing: number[], harvesting: number[]) {
    const monthSet = new Set<number>();
    for (const month of sowing) {
      monthSet.add(month);
    }
    for (const month of harvesting) {
      monthSet.add(month);
    }
    return Array.from(monthSet).sort((left, right) => left - right);
  }
}
