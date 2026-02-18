import { NextRequest, NextResponse } from "next/server";
import { getMonitor, deleteMonitor, updateMonitor, getAlertsByMonitor } from "@/lib/db";
import { verifyAuth, unauthorizedResponse } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAuth(request)) return unauthorizedResponse();

  const { id } = await params;
  const monitor = getMonitor(id);
  if (!monitor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const alerts = getAlertsByMonitor(id);
  return NextResponse.json({ ...monitor, alerts });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAuth(request)) return unauthorizedResponse();

  const { id } = await params;
  const body = await request.json();

  if (body.target_days && Array.isArray(body.target_days)) {
    body.target_days = JSON.stringify(body.target_days);
  }

  const monitor = updateMonitor(id, body);
  if (!monitor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(monitor);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAuth(request)) return unauthorizedResponse();

  const { id } = await params;
  const deleted = deleteMonitor(id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
