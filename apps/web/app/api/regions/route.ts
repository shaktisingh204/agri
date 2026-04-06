import { NextRequest, NextResponse } from "next/server";
import { getRegions } from "../../actions/geography";

export async function GET(request: NextRequest) {
  try {
    const country = request.nextUrl.searchParams.get("country") ?? undefined;
    const regions = await getRegions(country);
    return NextResponse.json(regions);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch regions" },
      { status: 500 }
    );
  }
}
