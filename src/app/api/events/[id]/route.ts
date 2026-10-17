import { NextResponse } from "next/server";
import { getEvent, deleteEvent } from "@/lib/events";
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
  return NextResponse.json({
    id: event.id,
    name: event.name,
    state: event.state,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Admin token required" }, { status: 401 });
  }
  const deleted = deleteEvent(id, token);
  if (!deleted) {
    return NextResponse.json({ error: "Invalid admin token or event not found" }, { status: 403 });
  }
  broadcast(id, { type: "event_deleted", eventId: id });
  return NextResponse.json({ success: true });
}