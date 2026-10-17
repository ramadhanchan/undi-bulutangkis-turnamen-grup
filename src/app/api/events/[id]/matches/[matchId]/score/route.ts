import { NextResponse } from "next/server";
import { getEvent, verifyAdminToken } from "@/lib/events";
import { recordMatchScore } from "@/lib/scoring";
import { broadcast } from "@/lib/sse";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const { id, matchId } = await params;
  const event = getEvent(id);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  try {
    const body = await request.json();
    const { token, sets, isWalkover, walkoverWinnerId } = body;
    if (!token || !verifyAdminToken(id, token)) {
      return NextResponse.json({ error: "Invalid admin token" }, { status: 403 });
    }

    const result = recordMatchScore(matchId, sets || [], isWalkover || false, walkoverWinnerId);
    broadcast(id, { type: "score_updated", matchId, winnerTeamId: result.winnerTeamId });
    return NextResponse.json({ success: true, winnerTeamId: result.winnerTeamId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}