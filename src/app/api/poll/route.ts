import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, unauthorizedResponse } from "@/lib/auth";
import { pollAllMonitors } from "@/lib/poller";

export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) return unauthorizedResponse();

  try {
    const result = await pollAllMonitors();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Poll failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) return unauthorizedResponse();

  // Return poll status info
  return NextResponse.json({
    message: "Use POST to trigger a poll cycle",
    pollIntervalMinutes: 15,
  });
}
