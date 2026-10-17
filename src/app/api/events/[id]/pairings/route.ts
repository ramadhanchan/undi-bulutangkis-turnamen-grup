import { NextResponse } from "next/server";
import { getEvent } from "@/lib/events";
import { isPairingLocked, generatePairings, getTeams, swapPlayers } from "@/lib/pairing";
import { getParticipants } from "@/lib/participants";
import { broadcast } from "@/lib/sse";
import { verifyAdminToken } from "@/lib/events";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const event = getEvent(id);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  const teams = getTeams(id);
  const participants = getParticipants(id);
  const pMap = new Map(participants.map((p) => [p.id, p.name]));

  const result = teams.map((t) => ({
    id: t.id,
    player1: { id: t.player1Id, name: pMap.get(t.player1Id) || "Unknown" },
    player2: { id: t.player2Id, name: pMap.get(t.player2Id) || "Unknown" },
    groupNumber: t.groupNumber,
  }));

  return NextResponse.json(result);
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
  try {
    const body = await request.json();
    const { token } = body;
    if (!token || !verifyAdminToken(id, token)) {
      return NextResponse.json({ error: "Invalid admin token" }, { status: 403 });
    }
    if (isPairingLocked(id)) {
      return NextResponse.json({ error: "Pairings are locked" }, { status: 400 });
    }
    if (event.state !== "pairing" && event.state !== "registration") {
      return NextResponse.json(
        { error: "Event must be in registration or pairing phase" },
        { status: 400 }
      );
    }

    const teams = generatePairings(id);
    const participants = getParticipants(id);
    const pMap = new Map(participants.map((p) => [p.id, p.name]));

    const result = teams.map((t) => ({
      id: t.id,
      player1: { id: t.player1Id, name: pMap.get(t.player1Id) || "Unknown" },
      player2: { id: t.player2Id, name: pMap.get(t.player2Id) || "Unknown" },
      groupNumber: t.groupNumber,
    }));

    broadcast(id, { type: "pairings_generated", teams: result });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const event = getEvent(id);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  try {
    const body = await request.json();
    const { token, team1Id, player1Id, team2Id, player2Id } = body;
    if (!token || !verifyAdminToken(id, token)) {
      return NextResponse.json({ error: "Invalid admin token" }, { status: 403 });
    }
    if (isPairingLocked(id)) {
      return NextResponse.json({ error: "Pairings are locked" }, { status: 400 });
    }

    swapPlayers(id, team1Id, player1Id, team2Id, player2Id);

    const teams = getTeams(id);
    const participants = getParticipants(id);
    const pMap = new Map(participants.map((p) => [p.id, p.name]));

    const result = teams.map((t) => ({
      id: t.id,
      player1: { id: t.player1Id, name: pMap.get(t.player1Id) || "Unknown" },
      player2: { id: t.player2Id, name: pMap.get(t.player2Id) || "Unknown" },
      groupNumber: t.groupNumber,
    }));

    broadcast(id, { type: "pairings_updated", teams: result });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}