import { NextRequest, NextResponse } from "next/server";
import { loginUser } from "../../../actions/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await loginUser(body);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed" },
      { status: 500 }
    );
  }
}
