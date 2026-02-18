import { NextRequest, NextResponse } from "next/server";
import { getAllSettings, setSetting } from "@/lib/db";
import { verifyAuth, unauthorizedResponse } from "@/lib/auth";

// Sensitive keys that should be masked in responses
const SENSITIVE_KEYS = ["twilio_auth_token", "opentable_token", "app_secret"];

export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) return unauthorizedResponse();

  const settings = getAllSettings();

  // Mask sensitive values
  const masked: Record<string, string> = {};
  for (const [key, value] of Object.entries(settings)) {
    if (SENSITIVE_KEYS.includes(key) && value) {
      masked[key] = value.length > 8 ? value.slice(0, 4) + "..." + value.slice(-4) : "****";
    } else {
      masked[key] = value;
    }
  }

  return NextResponse.json(masked);
}

export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) return unauthorizedResponse();

  const body = await request.json();

  const allowedKeys = [
    "twilio_account_sid",
    "twilio_auth_token",
    "twilio_phone_number",
    "user_phone_number",
    "opentable_token",
    "opentable_gpid",
    "opentable_diner_id",
    "opentable_phone",
    "app_secret",
    "webhook_url",
  ];

  let newSecret: string | null = null;
  for (const [key, value] of Object.entries(body)) {
    if (allowedKeys.includes(key) && typeof value === "string" && value.trim()) {
      setSetting(key, value.trim());
      if (key === "app_secret") {
        newSecret = value.trim();
      }
    }
  }

  const response = NextResponse.json({ success: true });

  // If app_secret was changed, update the auth cookie so the user isn't locked out
  if (newSecret) {
    response.cookies.set("tablesnipe_token", newSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }

  return response;
}
