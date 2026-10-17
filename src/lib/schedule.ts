import { randomUUID } from "crypto";
import { getDb } from "./db";
import { getTeams } from "./pairing";
import type { Match } from "./types";

export interface RoundRobinMatch {
  team1Index: number;
  team2Index: number;
  round: number;
}

/**
 * Generate round-robin match pairs for N teams.
 * For 4 teams: 6 matches, 3 rounds, 2 matches per round.
 * Returns array of { team1Index, team2Index, round }.
 */
export function generateRoundRobin(numTeams: number): RoundRobinMatch[] {
  if (numTeams < 2) throw new Error("Need at least 2 teams");
  if (numTeams % 2 !== 0) throw new Error("Number of teams must be even");

  const matches: RoundRobinMatch[] = [];
  const teamIndices = Array.from({ length: numTeams }, (_, i) => i);

  // Standard round-robin: fix first team, rotate the rest
  const rounds = numTeams - 1;
  const halfSize = numTeams / 2;

  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < halfSize; i++) {
      const t1 = teamIndices[i];
      const t2 = teamIndices[numTeams - 1 - i];
      matches.push({ team1Index: t1, team2Index: t2, round: round + 1 });
    }
    // Rotate: keep first fixed, rotate rest
    const last = teamIndices.pop()!;
    teamIndices.splice(1, 0, last);
  }

  return matches;
}

/**
 * Assign teams to groups of 4. Returns array of group numbers per team (by index).
 */
export function assignGroups(numTeams: number): number[] {
  if (numTeams % 4 !== 0) {
    throw new Error("Number of teams must be a multiple of 4");
  }
  const groups: number[] = [];
  for (let i = 0; i < numTeams; i++) {
    groups.push(Math.floor(i / 4) + 1);
  }
  return groups;
}

/**
 * Generate group stage matches for an event.
 * Assigns teams to groups, then generates round-robin per group.
 * Inserts match records into DB.
 */
export function generateGroupStage(eventId: string): void {
  const teams = getTeams(eventId);
  if (teams.length === 0) throw new Error("No teams found");
  if (teams.length % 4 !== 0) {
    throw new Error("Number of teams must be a multiple of 4");
  }

  const db = getDb();

  // Clear existing group-stage matches
  db.run("DELETE FROM matches WHERE event_id = ? AND phase = 'group'", [eventId]);

  const numGroups = teams.length / 4;
  const groupAssignments = assignGroups(teams.length);

  // Update team group numbers
  for (let i = 0; i < teams.length; i++) {
    db.run("UPDATE teams SET group_number = ? WHERE id = ?", [
      groupAssignments[i],
      teams[i].id,
    ]);
  }

  // Generate matches per group
  for (let g = 1; g <= numGroups; g++) {
    const groupTeams = teams.filter((_, idx) => groupAssignments[idx] === g);
    const roundRobin = generateRoundRobin(4);

    for (const m of roundRobin) {
      const matchId = randomUUID();
      db.run(
        "INSERT INTO matches (id, event_id, team1_id, team2_id, phase, group_number, round) VALUES (?, ?, ?, ?, 'group', ?, ?)",
        [
          matchId,
          eventId,
          groupTeams[m.team1Index].id,
          groupTeams[m.team2Index].id,
          g,
          m.round,
        ]
      );
    }
  }
}

export function getMatches(eventId: string, phase?: "group" | "knockout"): Match[] {
  const db = getDb();
  let query = "SELECT id, event_id, team1_id, team2_id, phase, group_number, round, set1_t1, set1_t2, set2_t1, set2_t2, set3_t1, set3_t2, winner_team_id, is_walkover, played_at, created_at FROM matches WHERE event_id = ?";
  const params: string[] = [eventId];
  if (phase) {
    query += " AND phase = ?";
    params.push(phase);
  }
  query += " ORDER BY phase, group_number, round";

  const rows = db.query(query).all(...params) as {
    id: string;
    event_id: string;
    team1_id: string | null;
    team2_id: string | null;
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
    created_at: string;
  }[];
  return rows.map((r) => ({
    id: r.id,
    eventId: r.event_id,
    team1Id: r.team1_id,
    team2Id: r.team2_id,
    phase: r.phase as "group" | "knockout",
    groupNumber: r.group_number,
    round: r.round,
    set1T1: r.set1_t1,
    set1T2: r.set1_t2,
    set2T1: r.set2_t1,
    set2T2: r.set2_t2,
    set3T1: r.set3_t1,
    set3T2: r.set3_t2,
    winnerTeamId: r.winner_team_id,
    isWalkover: r.is_walkover === 1,
    playedAt: r.played_at,
    createdAt: r.created_at,
  }));
}