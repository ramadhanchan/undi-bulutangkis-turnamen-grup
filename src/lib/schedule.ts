import { randomUUID } from "crypto";
import { getDb } from "./db";
import { getTeams } from "./pairing";
import { isValidTeamCount } from "./roster";
import type { Match } from "./types";

export interface RoundRobinMatch {
  team1Index: number;
  team2Index: number;
  round: number;
}

/**
 * Split teams into groups of 3–4, maximizing groups of 4.
 * Valid counts are 3, 4, and every count ≥ 6 except 5.
 */
export function groupSizes(numTeams: number): number[] {
  if (numTeams < 3) {
    const missing = 3 - numTeams;
    throw new Error(
      `Minimal 3 tim untuk membentuk grup. Tambah ${missing} tim.`
    );
  }
  if (!isValidTeamCount(numTeams)) {
    throw new Error(
      "5 tim tidak bisa dibagi menjadi grup 3–4. Tambah 1 tim menjadi 6 atau kurangi 1 tim menjadi 4."
    );
  }
  if (numTeams === 3) return [3];
  if (numTeams === 4) return [4];

  const remainder = numTeams % 4;
  if (remainder === 0) {
    return Array(numTeams / 4).fill(4);
  }
  if (remainder === 3) {
    return [...Array(Math.floor(numTeams / 4)).fill(4), 3];
  }
  if (remainder === 2) {
    return [...Array((numTeams - 6) / 4).fill(4), 3, 3];
  }
  return [...Array((numTeams - 9) / 4).fill(4), 3, 3, 3];
}

/**
 * Generate round-robin match pairs for N teams.
 * Odd counts use a dummy bye slot, so 3 teams produce 3 matches.
 */
export function generateRoundRobin(numTeams: number): RoundRobinMatch[] {
  if (numTeams < 2) throw new Error("Butuh minimal 2 tim");

  const slots: (number | null)[] = Array.from(
    { length: numTeams },
    (_, index) => index
  );
  if (numTeams % 2 !== 0) slots.push(null);

  const slotCount = slots.length;
  const rounds = slotCount - 1;
  const halfSize = slotCount / 2;
  const matches: RoundRobinMatch[] = [];

  for (let round = 0; round < rounds; round++) {
    for (let index = 0; index < halfSize; index++) {
      const team1Index = slots[index];
      const team2Index = slots[slotCount - 1 - index];
      if (team1Index === null || team2Index === null) continue;
      matches.push({ team1Index, team2Index, round: round + 1 });
    }

    const last = slots.pop()!;
    slots.splice(1, 0, last);
  }

  return matches;
}

/**
 * Stateless Group Draw: shuffle team IDs and split them into balanced groups.
 */
export function drawGroupAssignments(teamIds: string[]): string[][] {
  const sizes = groupSizes(teamIds.length);
  const shuffled = [...teamIds];

  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  const groups: string[][] = [];
  let cursor = 0;
  for (const size of sizes) {
    groups.push(shuffled.slice(cursor, cursor + size));
    cursor += size;
  }

  return groups;
}

/**
 * Validate that a proposed partition contains every team exactly once,
 * with the balanced 3–4 split for that team count.
 */
export function validateGroupAssignment(
  teamIds: string[],
  groups: string[][]
): string | null {
  let expectedSizes: number[];
  try {
    expectedSizes = groupSizes(teamIds.length);
  } catch (error) {
    return error instanceof Error ? error.message : "Jumlah tim tidak valid";
  }

  if (groups.length !== expectedSizes.length) {
    return `Jumlah grup harus ${expectedSizes.length}`;
  }

  const expectedSorted = [...expectedSizes].sort((left, right) => right - left);
  const actualSorted = groups
    .map((group) => group.length)
    .sort((left, right) => right - left);

  if (actualSorted.some((size, index) => size !== expectedSorted[index])) {
    return `Ukuran grup harus ${expectedSorted.join(", ")}`;
  }

  const allTeamIds = groups.flat();
  if (allTeamIds.length !== teamIds.length) {
    return "Semua tim harus masuk tepat satu grup";
  }

  const uniqueIds = new Set(allTeamIds);
  if (uniqueIds.size !== allTeamIds.length) {
    return "Ada tim yang muncul lebih dari sekali";
  }

  for (const teamId of teamIds) {
    if (!uniqueIds.has(teamId)) {
      return "Ada tim yang belum masuk grup";
    }
  }

  return null;
}

export interface GroupSummary {
  teamCount: number;
  groupCount: number;
  groupSizes: number[];
  matchCount: number;
}

export function summarizeGroups(groups: string[][]): GroupSummary {
  return {
    teamCount: groups.flat().length,
    groupCount: groups.length,
    groupSizes: groups.map((group) => group.length),
    matchCount: groups.reduce(
      (total, group) => total + (group.length * (group.length - 1)) / 2,
      0
    ),
  };
}

/**
 * Generate group-stage matches from a confirmed partition.
 */
export function generateGroupStage(
  eventId: string,
  groups: string[][]
): void {
  const teams = getTeams(eventId);
  if (teams.length === 0) throw new Error("Belum ada tim");

  const teamIds = teams.map((team) => team.id);
  const error = validateGroupAssignment(teamIds, groups);
  if (error) throw new Error(error);

  const db = getDb();

  // Clear existing group-stage matches
  db.run("DELETE FROM matches WHERE event_id = ? AND phase = 'group'", [eventId]);

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    for (const teamId of groups[groupIndex]) {
      db.run("UPDATE teams SET group_number = ? WHERE id = ? AND event_id = ?", [
        groupIndex + 1,
        teamId,
        eventId,
      ]);
    }
  }

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    const groupTeams = groups[groupIndex];
    const roundRobin = generateRoundRobin(groupTeams.length);

    for (const match of roundRobin) {
      const matchId = randomUUID();
      db.run(
        "INSERT INTO matches (id, event_id, team1_id, team2_id, phase, group_number, round) VALUES (?, ?, ?, ?, 'group', ?, ?)",
        [
          matchId,
          eventId,
          groupTeams[match.team1Index],
          groupTeams[match.team2Index],
          groupIndex + 1,
          match.round,
        ]
      );
    }
  }
}

export function getGroupStageProgress(eventId: string): {
  total: number;
  unfinished: Match[];
} {
  const matches = getMatches(eventId, "group");
  return {
    total: matches.length,
    unfinished: matches.filter((match) => match.winnerTeamId === null),
  };
}

export function getMatches(eventId: string, phase?: "group" | "knockout"): Match[] {
  const db = getDb();
  let query = "SELECT id, event_id, team1_id, team2_id, phase, group_number, round, position, set1_t1, set1_t2, set2_t1, set2_t2, set3_t1, set3_t2, winner_team_id, is_walkover, played_at, created_at FROM matches WHERE event_id = ?";
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
    position: number | null;
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
    position: r.position,
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
