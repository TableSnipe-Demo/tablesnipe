import { timingSafeEqual } from "crypto";
import { getSetting } from "./db";
import { NextRequest, NextResponse } from "next/server";

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function verifyAuth(request: NextRequest): boolean {
  const appSecret = getSetting("app_secret");
  if (!appSecret) {
    // No secret configured = no auth required (first-time setup)
    return true;
  }

  // Check Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    if (safeCompare(token, appSecret)) return true;
  }

  // Check cookie
  const cookieToken = request.cookies.get("tablesnipe_token")?.value;
  if (cookieToken && safeCompare(cookieToken, appSecret)) return true;

  return false;
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
