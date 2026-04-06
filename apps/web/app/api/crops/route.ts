import { NextResponse } from "next/server";
import { getCrops } from "../../actions/crop-calendars";

export async function GET() {
  try {
    const crops = await getCrops();
    return NextResponse.json(crops);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch crops" },
      { status: 500 }
    );
  }
}
