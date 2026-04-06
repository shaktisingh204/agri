import { NextRequest, NextResponse } from "next/server";
import { registerUser } from "../../../actions/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await registerUser(body);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registration failed" },
      { status: 500 }
    );
  }
}
