import { NextResponse } from "next/server";
import { getUsage } from "../../actions/analytics";

export async function GET() {
  try {
    const usage = await getUsage();
    return NextResponse.json(usage);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch usage" },
      { status: 500 }
    );
  }
}
