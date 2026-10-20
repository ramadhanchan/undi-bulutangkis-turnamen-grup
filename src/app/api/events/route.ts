import { NextResponse } from "next/server";
import { createEvent } from "@/lib/events";
import { readJsonBody } from "@/lib/http";
import { broadcast } from "@/lib/sse";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body) {
    return NextResponse.json(
      { error: "Body permintaan tidak valid." },
      { status: 400 }
    );
  }
  if (typeof body.name !== "string") {
    return NextResponse.json(
      { error: "Nama event wajib diisi" },
      { status: 400 }
    );
  }

  try {
    const event = createEvent(body.name);
    broadcast(event.id, {
      type: "event_created",
      event: { id: event.id, name: event.name, state: event.state },
    });
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
    const message =
      error instanceof Error && error.message.startsWith("Nama event")
        ? error.message
        : "Gagal membuat event.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}