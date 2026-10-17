import { NextResponse } from "next/server";
import { createEvent } from "@/lib/events";
import { broadcast } from "@/lib/sse";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;
    const event = createEvent(name);
    broadcast(event.id, { type: "event_created", event: { id: event.id, name: event.name, state: event.state } });
    return NextResponse.json(
      {
        id: event.id,
        name: event.name,
        state: event.state,
        adminToken: event.adminToken,
        adminUrl: `/event/${event.id}/admin/${event.adminToken}`,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}