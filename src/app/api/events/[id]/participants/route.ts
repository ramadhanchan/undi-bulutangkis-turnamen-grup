import { NextResponse } from "next/server";
import { getEvent } from "@/lib/events";
import { registerParticipant, getParticipants } from "@/lib/participants";
import { broadcast } from "@/lib/sse";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const event = getEvent(id);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  const participants = getParticipants(id);
  return NextResponse.json(participants.map((p) => ({ id: p.id, name: p.name })));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const event = getEvent(id);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (event.state !== "registration") {
    return NextResponse.json(
      { error: "Registration is closed" },
      { status: 400 }
    );
  }
  try {
    const body = await request.json();
    const participant = registerParticipant(id, body.name);
    broadcast(id, {
      type: "participant_registered",
      participant: { id: participant.id, name: participant.name },
    });
    return NextResponse.json(
      { id: participant.id, name: participant.name },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}