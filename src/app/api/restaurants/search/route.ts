import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, unauthorizedResponse } from "@/lib/auth";
import { searchRestaurants } from "@/lib/opentable";

export async function GET(request: NextRequest) {
  if (!verifyAuth(request)) return unauthorizedResponse();

  const query = request.nextUrl.searchParams.get("q");
  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const results = await searchRestaurants(query);
    return NextResponse.json(results);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Search failed" },
      { status: 500 }
    );
  }
}
