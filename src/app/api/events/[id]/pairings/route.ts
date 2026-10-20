import { NextResponse } from "next/server";
import { readAdminRequest } from "@/lib/admin-request";
import { getDb } from "@/lib/db";
import { isEventState } from "@/lib/event-state";
import { buildTeamViews } from "@/lib/event-snapshot";
import { getEvent, transitionPhase } from "@/lib/events";
import {
  generatePairings,
  getTeams,
  isPairingLocked,
  swapPlayers,
} from "@/lib/pairing";
import { canPair, getParticipants } from "@/lib/participants";
import { broadcast } from "@/lib/sse";

function teamResponse(eventId: string) {
  const participants = getParticipants(eventId);
  const playerNames = new Map(
    participants.map((participant) => [participant.id, participant.name])
  );

  return buildTeamViews(getTeams(eventId), playerNames);
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

  return NextResponse.json(teamResponse(id));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = await readAdminRequest(request, id);
  if ("response" in admin) return admin.response;
  const { token, event } = admin;
  try {
    if (isPairingLocked(id)) {
      return NextResponse.json(
        { error: "Undian tim sudah dikunci" },
        { status: 400 }
      );
    }
    if (!isEventState(event.state, ["registration", "pairing"])) {
      return NextResponse.json(
        { error: "Event harus berada di fase pendaftaran atau undian tim" },
        { status: 400 }
      );
    }

    const check = canPair(id);
    if (!check.ok) {
      return NextResponse.json(
        { error: check.reason ?? "Roster belum valid" },
        { status: 400 }
      );
    }

    const db = getDb();
    db.transaction(() => {
      generatePairings(id);
      if (event.state === "registration") {
        transitionPhase(id, token, "pairing");
      }
    })();

    const result = teamResponse(id);
    broadcast(id, { type: "pairings_generated", teams: result });
    return NextResponse.json(result, { status: 201 });
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
  const { body } = admin;
  try {
    const team1Id = typeof body.team1Id === "string" ? body.team1Id : "";
    const player1Id =
      typeof body.player1Id === "string" ? body.player1Id : "";
    const team2Id = typeof body.team2Id === "string" ? body.team2Id : "";
    const player2Id =
      typeof body.player2Id === "string" ? body.player2Id : "";

    if (isPairingLocked(id)) {
      return NextResponse.json(
        { error: "Undian tim sudah dikunci" },
        { status: 400 }
      );
    }

    swapPlayers(id, team1Id, player1Id, team2Id, player2Id);

    const result = teamResponse(id);
    broadcast(id, { type: "pairings_updated", teams: result });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
