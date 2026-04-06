CREATE TYPE "Role" AS ENUM ('ADMIN', 'ANALYST', 'VIEWER');
CREATE TYPE "PlanType" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "BillingProvider" AS ENUM ('STRIPE', 'RAZORPAY');

CREATE TABLE "Tenant" (
  "id" TEXT PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
  "companyName" TEXT NOT NULL,
  "planType" "PlanType" NOT NULL DEFAULT 'FREE',
  "billingProvider" "BillingProvider",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Subscription" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "provider" "BillingProvider" NOT NULL,
  "externalId" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL,
  "currentPeriodEnd" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Crop" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "category" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Country" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Region" (
  "id" TEXT PRIMARY KEY,
  "countryId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "agroZoneName" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Region_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Region_countryId_name_agroZoneName_key" UNIQUE ("countryId", "name", "agroZoneName")
);

CREATE TABLE "CropCalendar" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "cropId" TEXT NOT NULL,
  "regionId" TEXT NOT NULL,
  "sowingMonths" INTEGER[] NOT NULL,
  "growingMonths" INTEGER[] NOT NULL,
  "harvestingMonths" INTEGER[] NOT NULL,
  "seasonName" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CropCalendar_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CropCalendar_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "Crop"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CropCalendar_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Upload" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "status" "UploadStatus" NOT NULL DEFAULT 'PENDING',
  "processedData" JSONB,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Upload_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "UsageEvent" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "eventName" TEXT NOT NULL,
  "eventGroup" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsageEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Tenant_planType_idx" ON "Tenant"("planType");
CREATE INDEX "User_tenantId_role_idx" ON "User"("tenantId", "role");
CREATE INDEX "Subscription_tenantId_status_idx" ON "Subscription"("tenantId", "status");
CREATE INDEX "Crop_name_category_idx" ON "Crop"("name", "category");
CREATE INDEX "Region_countryId_agroZoneName_idx" ON "Region"("countryId", "agroZoneName");
CREATE INDEX "CropCalendar_tenantId_cropId_regionId_idx" ON "CropCalendar"("tenantId", "cropId", "regionId");
CREATE INDEX "CropCalendar_cropId_regionId_idx" ON "CropCalendar"("cropId", "regionId");
CREATE INDEX "CropCalendar_seasonName_year_idx" ON "CropCalendar"("seasonName", "year");
CREATE INDEX "Upload_tenantId_status_idx" ON "Upload"("tenantId", "status");
CREATE INDEX "UsageEvent_tenantId_createdAt_idx" ON "UsageEvent"("tenantId", "createdAt");
CREATE INDEX "UsageEvent_eventGroup_eventName_idx" ON "UsageEvent"("eventGroup", "eventName");

