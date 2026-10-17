import { NextResponse } from "next/server";
import { getEvent, deleteEvent } from "@/lib/events";
import { getDb } from "@/lib/db";
import { getAllGroupStandings } from "@/lib/standings";
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

  const db = getDb();

  const participants = db
    .query("SELECT id, name, created_at FROM participants WHERE event_id = ? ORDER BY created_at")
    .all(id) as { id: string; name: string; created_at: string }[];

  const teams = db
    .query("SELECT id, player1_id, player2_id, group_number, created_at FROM teams WHERE event_id = ?")
    .all(id) as {
    id: string;
    player1_id: string;
    player2_id: string;
    group_number: number | null;
    created_at: string;
  }[];

  const matches = db
    .query(
      "SELECT id, team1_id, team2_id, phase, group_number, round, set1_t1, set1_t2, set2_t1, set2_t2, set3_t1, set3_t2, winner_team_id, is_walkover, played_at FROM matches WHERE event_id = ? ORDER BY phase, round, group_number"
    )
    .all(id) as {
      id: string;
      team1_id: string;
      team2_id: string;
      phase: string;
      group_number: number | null;
      round: number;
      set1_t1: number | null;
      set1_t2: number | null;
      set2_t1: number | null;
      set2_t2: number | null;
      set3_t1: number | null;
      set3_t2: number | null;
      winner_team_id: string | null;
      is_walkover: number;
      played_at: string | null;
    }[];

  // Build standings
  let standingsData: unknown[] = [];
  if (event.state === "group_stage" || event.state === "knockout" || event.state === "finished") {
    const allStandings = getAllGroupStandings(id);
    const standingsObj: Record<string, unknown[]> = {};
    for (const [groupNum, groupStandings] of allStandings) {
      standingsObj[String(groupNum)] = groupStandings;
    }
    standingsData = Object.entries(standingsObj).map(([group, standings]) => ({
      group: Number(group),
      standings,
    }));
  }
  const participantMap = new Map(participants.map((p) => [p.id, p.name]));
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  const teamList = teams.map((t) => ({
    id: t.id,
    player1: { id: t.player1_id, name: participantMap.get(t.player1_id) || "Unknown" },
    player2: { id: t.player2_id, name: participantMap.get(t.player2_id) || "Unknown" },
    groupNumber: t.group_number,
  }));

  const matchList = matches.map((m) => ({
    id: m.id,
    team1: teamMap.get(m.team1_id)
      ? {
          id: m.team1_id,
          name: `${participantMap.get(teamMap.get(m.team1_id)!.player1_id)} / ${participantMap.get(teamMap.get(m.team1_id)!.player2_id)}`,
        }
      : { id: m.team1_id, name: "Unknown" },
    team2: teamMap.get(m.team2_id)
      ? {
          id: m.team2_id,
          name: `${participantMap.get(teamMap.get(m.team2_id)!.player1_id)} / ${participantMap.get(teamMap.get(m.team2_id)!.player2_id)}`,
        }
      : { id: m.team2_id, name: "Unknown" },
    phase: m.phase,
    groupNumber: m.group_number,
    round: m.round,
    sets: [
      { t1: m.set1_t1, t2: m.set1_t2 },
      { t1: m.set2_t1, t2: m.set2_t2 },
      { t1: m.set3_t1, t2: m.set3_t2 },
    ],
    winnerTeamId: m.winner_team_id,
    isWalkover: m.is_walkover === 1,
    playedAt: m.played_at,
  }));

  return NextResponse.json({
    id: event.id,
    name: event.name,
    state: event.state,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
    participants: participants.map((p) => ({ id: p.id, name: p.name })),
    teams: teamList,
    matches: matchList,
    standings: standingsData,
    bracket: null, // populated in ticket #06
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