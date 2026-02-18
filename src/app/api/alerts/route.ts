import { NextRequest, NextResponse } from "next/server";
import { getAlerts } from "@/lib/db";
import { verifyAuth, unauthorizedResponse } from "@/lib/auth";

export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) return unauthorizedResponse();

  const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "50");
  const alerts = getAlerts(limit);
  return NextResponse.json(alerts);
}
