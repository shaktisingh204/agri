import { NextRequest, NextResponse } from "next/server";
import { updateUploadIngestion } from "../../../../actions/uploads";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await updateUploadIngestion({
      uploadId: body.uploadId,
      status: body.status,
      processedData: body.processedData,
      errorMessage: body.errorMessage,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}
