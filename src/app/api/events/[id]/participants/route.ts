import { NextResponse } from "next/server";
import { readAdminRequest } from "@/lib/admin-request";
import { isEventState } from "@/lib/event-state";
import { getEvent, verifyAdminToken } from "@/lib/events";
import { getTeams } from "@/lib/pairing";
import {
  getParticipants,
  registerParticipant,
  registerParticipants,
  removeParticipant,
  renameParticipant,
} from "@/lib/participants";
import { broadcast } from "@/lib/sse";
import type { EventState } from "@/lib/types";

function registrationGate(
  eventId: string,
  state: EventState
): NextResponse | null {
  if (!isEventState(state, ["registration"]) || getTeams(eventId).length > 0) {
    return NextResponse.json(
      { error: "Pendaftaran sudah ditutup" },
      { status: 400 }
    );
  }
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const event = getEvent(id);
  if (!event) {
    return NextResponse.json(
      { error: "Event tidak ditemukan." },
      { status: 404 }
    );
  }
  const participants = getParticipants(id);
  return NextResponse.json(participants.map((p) => ({ id: p.id, name: p.name })));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await readAdminRequest(request, id);
  if ("response" in admin) return admin.response;
  const { body, event } = admin;

  try {
    const gate = registrationGate(id, event.state);
    if (gate) return gate;

    if (Array.isArray(body.names)) {
      const names = body.names.filter(
        (name: unknown): name is string => typeof name === "string"
      );
      const result = registerParticipants(id, names);
      broadcast(id, { type: "participants_updated" });
      return NextResponse.json(result, {
        status: result.created.length > 0 ? 201 : 400,
      });
    }

    if (typeof body?.name !== "string") {
      return NextResponse.json(
        { error: "Nama peserta wajib diisi" },
        { status: 400 }
      );
    }

    const participant = registerParticipant(id, body.name);
    broadcast(id, { type: "participants_updated" });
    return NextResponse.json(
      { id: participant.id, name: participant.name },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await readAdminRequest(request, id);
  if ("response" in admin) return admin.response;
  const { body, event } = admin;

  try {
    const gate = registrationGate(id, event.state);
    if (gate) return gate;

    const participantId =
      typeof body.participantId === "string" ? body.participantId : "";
    const name = typeof body.name === "string" ? body.name : "";
    if (!participantId) {
      return NextResponse.json(
        { error: "Peserta tidak ditemukan" },
        { status: 400 }
      );
    }

    const participant = renameParticipant(id, participantId, name);
    broadcast(id, { type: "participants_updated" });
    return NextResponse.json({ id: participant.id, name: participant.name });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const event = getEvent(id);
  if (!event) {
    return NextResponse.json(
      { error: "Event tidak ditemukan." },
      { status: 404 }
    );
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  if (!token || !verifyAdminToken(id, token)) {
    return NextResponse.json(
      { error: "Admin Link tidak valid" },
      { status: 403 }
    );
  }
  const gate = registrationGate(id, event.state);
  if (gate) return gate;

  const participantId = url.searchParams.get("participantId") ?? "";
  if (!participantId) {
    return NextResponse.json(
      { error: "Peserta tidak ditemukan" },
      { status: 400 }
    );
  }

  const removed = removeParticipant(id, participantId);
  if (!removed) {
    return NextResponse.json(
      { error: "Peserta tidak ditemukan" },
      { status: 404 }
    );
  }

  broadcast(id, { type: "participants_updated" });
  return NextResponse.json({ success: true });
}
