import { NextResponse } from "next/server";
import { getCountries } from "../../actions/geography";

export async function GET() {
  try {
    const countries = await getCountries();
    return NextResponse.json(countries);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch countries" },
      { status: 500 }
    );
  }
}
