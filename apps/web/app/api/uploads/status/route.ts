import { NextResponse } from "next/server";
import { getUploadStatus } from "../../../actions/uploads";

export async function GET() {
  try {
    const uploads = await getUploadStatus();
    return NextResponse.json(uploads);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch upload status" },
      { status: 500 }
    );
  }
}
