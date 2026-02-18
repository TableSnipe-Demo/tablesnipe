import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, unauthorizedResponse } from "@/lib/auth";
import { startScheduler, stopScheduler, getSchedulerStatus } from "@/lib/scheduler";

export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) return unauthorizedResponse();
  return NextResponse.json(getSchedulerStatus());
}

export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) return unauthorizedResponse();

  const body = await request.json();
  const { action } = body;

  if (action === "start") {
    startScheduler();
    return NextResponse.json({ ...getSchedulerStatus(), message: "Scheduler started" });
  } else if (action === "stop") {
    stopScheduler();
    return NextResponse.json({ ...getSchedulerStatus(), message: "Scheduler stopped" });
  }

  return NextResponse.json({ error: "Invalid action. Use 'start' or 'stop'" }, { status: 400 });
}
