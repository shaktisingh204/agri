"use server";

import { getDb } from "../../lib/mongodb";
import { ObjectId } from "mongodb";

export async function createUpload(data: {
  fileUrl: string;
  filename: string;
  tenantSlug?: string;
  processedData?: Record<string, unknown>;
}) {
  const { fileUrl, filename, tenantSlug, processedData } = data;

  if (!fileUrl || !filename) {
    return { error: "fileUrl and filename are required" };
  }

  const db = await getDb();
  const tenant =
    (await db.collection("tenants").findOne({ slug: tenantSlug ?? "fao-demo" })) ??
    (await db.collection("tenants").findOne());

  if (!tenant) {
    return { error: "No tenant found" };
  }

  const result = await db.collection("uploads").insertOne({
    tenantId: tenant._id,
    fileUrl,
    filename,
    status: processedData ? "COMPLETED" : "PENDING",
    processedData: processedData ?? null,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    id: result.insertedId.toString(),
    filename,
    status: processedData ? "COMPLETED" : "PENDING",
  };
}

export async function updateUploadIngestion(data: {
  uploadId: string;
  status: string;
  processedData?: Record<string, unknown>;
  errorMessage?: string;
}) {
  const { uploadId, status, processedData, errorMessage } = data;

  if (!uploadId || !status) {
    return { error: "uploadId and status are required" };
  }

  const db = await getDb();
  const existing = await db.collection("uploads").findOne({ _id: new ObjectId(uploadId) });
  if (!existing) {
    return { error: "Upload not found" };
  }

  await db.collection("uploads").updateOne(
    { _id: new ObjectId(uploadId) },
    {
      $set: {
        status,
        processedData: processedData ?? existing.processedData,
        errorMessage: errorMessage ?? existing.errorMessage,
        updatedAt: new Date(),
      },
    }
  );

  return { id: uploadId, status };
}

export async function getUploadStatus() {
  const db = await getDb();
  const uploads = await db.collection("uploads").find().sort({ createdAt: -1 }).toArray();
  return uploads.map((u) => ({
    id: u._id.toString(),
    filename: u.filename,
    status: u.status,
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt),
    processedData: (u.processedData as Record<string, unknown>) ?? undefined,
  }));
}
