import { NextRequest, NextResponse } from "next/server";
import { commitSession } from "../../../actions/ingestion";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.session_id) {
      return NextResponse.json(
        { error: "session_id is required" },
        { status: 400 }
      );
    }

    const result = await commitSession({
      session_id: body.session_id,
      upload_id: body.upload_id,
      tenant_id: body.tenant_id,
      year: body.year,
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
