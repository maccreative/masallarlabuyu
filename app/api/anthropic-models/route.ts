import { NextResponse } from "next/server";

export const runtime = "nodejs";

// GET /api/anthropic-models
// Anthropic hesabında erişilebilir modelleri listeler.
export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: "ANTHROPIC_API_KEY not set" },
      { status: 500 }
    );
  }

  const res = await fetch("https://api.anthropic.com/v1/models", {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
  });

  const text = await res.text();

  // JSON gelirse parse eder, gelmezse ham text döner
  try {
    const json = JSON.parse(text);

    return NextResponse.json(
      {
        success: res.ok,
        status: res.status,
        data: json,
      },
      { status: res.ok ? 200 : 500 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        status: res.status,
        raw: text.slice(0, 2000),
      },
      { status: 500 }
    );
  }
}
