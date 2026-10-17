import { NextResponse } from "next/server";
import { transitionPhase } from "@/lib/events";
import { broadcast } from "@/lib/sse";
import type { EventState } from "@/lib/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { token, targetState } = body;
    if (!token) {
      return NextResponse.json({ error: "Admin token required" }, { status: 401 });
    }
    const event = transitionPhase(id, token, targetState as EventState);
    broadcast(id, { type: "phase_transition", state: event.state });
    return NextResponse.json({ id: event.id, state: event.state });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("Invalid admin token") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}