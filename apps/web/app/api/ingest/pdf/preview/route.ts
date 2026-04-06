import { NextRequest, NextResponse } from "next/server";
import { extractCalendarFromFile } from "../../../../actions/ingestion";

const ALLOWED_EXTENSIONS = [".pdf", ".xlsx", ".xls"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: "Only PDF and XLSX files are supported" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await extractCalendarFromFile(file.name, buffer);

    return NextResponse.json({
      status: "preview_ready",
      preview: result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ingestion failed" },
      { status: 500 }
    );
  }
}
