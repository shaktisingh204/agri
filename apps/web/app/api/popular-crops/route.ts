import { NextResponse } from "next/server";
import { getPopularCrops } from "../../actions/analytics";

export async function GET() {
  try {
    const popularCrops = await getPopularCrops();
    return NextResponse.json(popularCrops);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch popular crops" },
      { status: 500 }
    );
  }
}
