import { NextRequest, NextResponse } from "next/server";
import { getCalendars } from "../../actions/crop-calendars";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const yearStr = params.get("year");
    const monthStr = params.get("month");

    const calendars = await getCalendars({
      crop: params.get("crop") ?? undefined,
      region: params.get("region") ?? undefined,
      state: params.get("state") ?? undefined,
      country: params.get("country") ?? undefined,
      season: params.get("season") ?? undefined,
      year: yearStr ? parseInt(yearStr, 10) : undefined,
      month: monthStr ? parseInt(monthStr, 10) : undefined,
    });

    return NextResponse.json(calendars);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch calendars" },
      { status: 500 }
    );
  }
}
