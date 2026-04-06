import { NextRequest, NextResponse } from "next/server";
import { commitCropCalendarData } from "../../../../actions/commit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await commitCropCalendarData({
      uploadId: body.uploadId,
      tenantId: body.tenantId,
      year: body.year,
      csvFile: body.csvFile,
      rows: body.rows,
      flaggedCount: body.flaggedCount,
      flaggedRows: body.flaggedRows,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Commit failed" },
      { status: 500 }
    );
  }
}
