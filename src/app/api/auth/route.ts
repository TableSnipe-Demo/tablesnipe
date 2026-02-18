import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { secret } = body;

  if (!secret) {
    return NextResponse.json({ error: "Secret is required" }, { status: 400 });
  }

  const appSecret = getSetting("app_secret");

  // First-time setup: if no secret exists, set it
  if (!appSecret) {
    setSetting("app_secret", secret);
    const response = NextResponse.json({ success: true, firstTime: true });
    response.cookies.set("tablesnipe_token", secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });
    return response;
  }

  // Verify secret
  if (!safeCompare(secret, appSecret)) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("tablesnipe_token", secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return response;
}
