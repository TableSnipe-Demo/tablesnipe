import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getMonitors, createMonitor, updateMonitor } from "@/lib/db";
import { verifyAuth, unauthorizedResponse } from "@/lib/auth";

export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) return unauthorizedResponse();

  const monitors = getMonitors();
  return NextResponse.json(monitors);
}

export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) return unauthorizedResponse();

  const body = await request.json();
  const {
    restaurant_id,
    restaurant_name,
    party_size = 2,
    target_days = [],
    target_time_start = "19:00",
    target_time_end = "21:00",
    weeks_ahead = 4,
  } = body;

  if (!restaurant_id || !restaurant_name) {
    return NextResponse.json(
      { error: "restaurant_id and restaurant_name are required" },
      { status: 400 }
    );
  }

  const monitor = createMonitor({
    id: uuidv4(),
    restaurant_id,
    restaurant_name,
    party_size,
    target_days: JSON.stringify(target_days),
    target_time_start,
    target_time_end,
    weeks_ahead,
    active: 1,
  });

  return NextResponse.json(monitor, { status: 201 });
}

export async function PUT(request: NextRequest) {
  if (!verifyAuth(request)) return unauthorizedResponse();

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  if (updates.target_days && Array.isArray(updates.target_days)) {
    updates.target_days = JSON.stringify(updates.target_days);
  }

  const monitor = updateMonitor(id, updates);
  if (!monitor) {
    return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
  }

  return NextResponse.json(monitor);
}
