import { getSetting } from "./db";
import { NextRequest, NextResponse } from "next/server";

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
    if (token === appSecret) return true;
  }

  // Check cookie
  const cookieToken = request.cookies.get("tablesnipe_token")?.value;
  if (cookieToken === appSecret) return true;

  return false;
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
