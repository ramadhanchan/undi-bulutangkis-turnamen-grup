import { randomUUID } from "crypto";
import { getDb } from "./db";
import { getParticipants } from "./participants";
import { getEvent } from "./events";
import type { Team } from "./types";

export function isPairingLocked(eventId: string): boolean {
  const event = getEvent(eventId);
  if (!event) return true;
  return (
    event.state === "group_stage" ||
    event.state === "knockout" ||
    event.state === "finished"
  );
}

export function generatePairings(eventId: string): Team[] {
  const participants = getParticipants(eventId);
  if (participants.length === 0 || participants.length % 2 !== 0) {
    throw new Error("Participant count must be even for pairing");
  }

  const db = getDb();

  // Delete existing teams
  db.run("DELETE FROM teams WHERE event_id = ?", [eventId]);

  // Fisher-Yates shuffle
  const shuffled = [...participants];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const teams: Team[] = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    const teamId = randomUUID();
    db.run(
      "INSERT INTO teams (id, event_id, player1_id, player2_id) VALUES (?, ?, ?, ?)",
      [teamId, eventId, shuffled[i].id, shuffled[i + 1].id]
    );
    teams.push({
      id: teamId,
      eventId,
      player1Id: shuffled[i].id,
      player2Id: shuffled[i + 1].id,
      groupNumber: null,
      createdAt: new Date().toISOString(),
    });
  }

  return teams;
}

export function getTeams(eventId: string): Team[] {
  const db = getDb();
  const rows = db
    .query("SELECT id, event_id, player1_id, player2_id, group_number, created_at FROM teams WHERE event_id = ?")
    .all(eventId) as {
    id: string;
    event_id: string;
    player1_id: string;
    player2_id: string;
    group_number: number | null;
    created_at: string;
  }[];

  return rows.map((r) => ({
    id: r.id,
    eventId: r.event_id,
    player1Id: r.player1_id,
    player2Id: r.player2_id,
    groupNumber: r.group_number,
    createdAt: r.created_at,
  }));
}

export function swapPlayers(
  eventId: string,
  team1Id: string,
  player1Id: string,
  team2Id: string,
  player2Id: string
): void {
  if (isPairingLocked(eventId)) {
    throw new Error("Pairings are locked");
  }

  const db = getDb();

  // Verify both players exist in their respective teams
  const team1 = db
    .query("SELECT player1_id, player2_id FROM teams WHERE id = ? AND event_id = ?")
    .get(team1Id, eventId) as { player1_id: string; player2_id: string } | null;
  const team2 = db
    .query("SELECT player1_id, player2_id FROM teams WHERE id = ? AND event_id = ?")
    .get(team2Id, eventId) as { player1_id: string; player2_id: string } | null;

  if (!team1 || !team2) throw new Error("Team not found");
  if (team1Id === team2Id) throw new Error("Cannot swap within the same team");

  const team1HasPlayer = team1.player1_id === player1Id || team1.player2_id === player1Id;
  const team2HasPlayer = team2.player1_id === player2Id || team2.player2_id === player2Id;

  if (!team1HasPlayer) throw new Error("Player not found in team 1");
  if (!team2HasPlayer) throw new Error("Player not found in team 2");

  // Perform swap
  const t1Other = team1.player1_id === player1Id ? team1.player2_id : team1.player1_id;
  const t2Other = team2.player1_id === player2Id ? team2.player2_id : team2.player1_id;

  db.run("UPDATE teams SET player1_id = ?, player2_id = ? WHERE id = ?", [
    player2Id,
    t1Other,
    team1Id,
  ]);
  db.run("UPDATE teams SET player1_id = ?, player2_id = ? WHERE id = ?", [
    player1Id,
    t2Other,
    team2Id,
  ]);
}