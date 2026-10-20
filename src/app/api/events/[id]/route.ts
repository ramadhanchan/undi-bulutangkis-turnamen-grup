import { NextResponse } from "next/server";
import { buildEventSnapshot } from "@/lib/event-snapshot";
import { deleteEvent } from "@/lib/events";
import { broadcast } from "@/lib/sse";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const snapshot = buildEventSnapshot(id);
  if (!snapshot) {
    return NextResponse.json(
      { error: "Event tidak ditemukan." },
      { status: 404 }
    );
  }

  return NextResponse.json(snapshot);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.json(
      { error: "Admin Link diperlukan." },
      { status: 401 }
    );
  }
  const deleted = deleteEvent(id, token);
  if (!deleted) {
    return NextResponse.json(
      { error: "Admin Link tidak valid atau event tidak ditemukan." },
      { status: 403 }
    );
  }
  broadcast(id, { type: "event_deleted", eventId: id });
  return NextResponse.json({ success: true });
}
