import { NextRequest, NextResponse } from "next/server";
import { createUpload } from "../../../actions/uploads";

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id") ?? undefined;
    const body = await request.json();
    const result = await createUpload({
      fileUrl: body.fileUrl,
      filename: body.filename,
      tenantSlug: tenantId,
      processedData: body.processedData,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload creation failed" },
      { status: 500 }
    );
  }
}
