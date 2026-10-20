import { randomUUID } from "crypto";
import { nextSlotPosition } from "./bracket-layout";
import { getDb } from "./db";
import { getAllGroupStandings } from "./standings";
import type { Match } from "./types";

/**
 * Get qualified teams (top 2 per group) in seed order.
 * Group winners first (ordered by group), then runners-up (ordered by group).
 */
export function getQualifiedTeams(eventId: string): string[] {
  const allStandings = getAllGroupStandings(eventId);
  const groupNumbers = [...allStandings.keys()].sort((left, right) => left - right);

  const winners: string[] = [];
  const runnersUp: string[] = [];

  for (const group of groupNumbers) {
    const standings = allStandings.get(group)!;
    if (standings.length >= 1) winners.push(standings[0].teamId);
    if (standings.length >= 2) runnersUp.push(standings[1].teamId);
  }

  return [...winners, ...runnersUp];
}

function nextPowerOf2(value: number): number {
  let size = 1;
  while (size < value) size *= 2;
  return size;
}

export interface KnockoutSkeletonSlot {
  round: number;
  position: number;
  team1Id: string | null;
  team2Id: string | null;
  isBye: boolean;
}

/**
 * Build the complete bracket shape without touching the database.
 * Used to persist the bracket and to preview it from current standings.
 */
export function buildKnockoutSkeleton(
  qualified: string[]
): KnockoutSkeletonSlot[] {
  if (qualified.length < 2) {
    throw new Error("Butuh minimal 2 tim qualified");
  }

  const bracketSize = nextPowerOf2(qualified.length);
  const numByes = bracketSize - qualified.length;

  // Existing cross-pairing: winners meet runners-up from the other side.
  const numGroups = Math.ceil(qualified.length / 2);
  const winners = qualified.slice(0, numGroups);
  const runnersUp = qualified.slice(numGroups);
  const seeded: string[] = [];

  for (let index = 0; index < numGroups; index++) {
    const runnerIndex = numGroups - 1 - index;
    if (runnerIndex >= 0 && runnerIndex < runnersUp.length) {
      seeded.push(winners[index], runnersUp[runnerIndex]);
    } else {
      seeded.push(winners[index]);
    }
  }

  const byeTeams = seeded.slice(0, numByes);
  const playTeams = seeded.slice(numByes);
  const roundOneMatchCount = bracketSize / 2;
  const slots: KnockoutSkeletonSlot[] = [];
  let position = 0;

  for (const teamId of byeTeams) {
    slots.push({
      round: 1,
      position: position++,
      team1Id: teamId,
      team2Id: null,
      isBye: true,
    });
  }

  for (let index = 0; index < playTeams.length; index += 2) {
    slots.push({
      round: 1,
      position: position++,
      team1Id: playTeams[index],
      team2Id: playTeams[index + 1],
      isBye: false,
    });
  }

  if (position !== roundOneMatchCount) {
    throw new Error("Struktur ronde pertama tidak lengkap");
  }

  const numRounds = Math.log2(bracketSize);
  for (let round = 2; round <= numRounds; round++) {
    const matchCount = bracketSize / 2 ** round;
    for (let slotPosition = 0; slotPosition < matchCount; slotPosition++) {
      slots.push({
        round,
        position: slotPosition,
        team1Id: null,
        team2Id: null,
        isBye: false,
      });
    }
  }

  return slots;
}

/**
 * Generate the complete knockout skeleton through the Final immediately.
 * Round 1 contains bye slots (one team, pre-advanced) and play-in matches;
 * later rounds start as TBD slots and are filled as winners are decided.
 */
export function generateKnockoutBracket(eventId: string): void {
  const qualified = getQualifiedTeams(eventId);
  const skeleton = buildKnockoutSkeleton(qualified);

  const db = getDb();
  db.run("DELETE FROM matches WHERE event_id = ? AND phase = 'knockout'", [
    eventId,
  ]);

  for (const slot of skeleton) {
    db.run(
      "INSERT INTO matches (id, event_id, team1_id, team2_id, phase, round, position, winner_team_id, is_walkover) VALUES (?, ?, ?, ?, 'knockout', ?, ?, ?, 0)",
      [
        randomUUID(),
        eventId,
        slot.team1Id,
        slot.team2Id,
        slot.round,
        slot.position,
        slot.isBye ? slot.team1Id : null,
      ]
    );
  }

  // Byes advance immediately; fill their round-2 slots at generation time.
  advanceKnockoutRound(eventId);
}

export function getKnockoutMatches(eventId: string): Match[] {
  const db = getDb();
  const rows = db
    .query(
      "SELECT id, event_id, team1_id, team2_id, phase, group_number, round, position, set1_t1, set1_t2, set2_t1, set2_t2, set3_t1, set3_t2, winner_team_id, is_walkover, played_at, created_at FROM matches WHERE event_id = ? AND phase = 'knockout' ORDER BY round, position, id"
    )
    .all(eventId) as {
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

  return rows.map((row) => ({
    id: row.id,
    eventId: row.event_id,
    team1Id: row.team1_id,
    team2Id: row.team2_id,
    phase: row.phase as "group" | "knockout",
    groupNumber: row.group_number,
    round: row.round,
    position: row.position,
    set1T1: row.set1_t1,
    set1T2: row.set1_t2,
    set2T1: row.set2_t1,
    set2T2: row.set2_t2,
    set3T1: row.set3_t1,
    set3T2: row.set3_t2,
    winnerTeamId: row.winner_team_id,
    isWalkover: row.is_walkover === 1,
    playedAt: row.played_at,
    createdAt: row.created_at,
  }));
}

export function isKnockoutComplete(eventId: string): boolean {
  const matches = getKnockoutMatches(eventId);
  if (matches.length === 0) return false;
  const maxRound = Math.max(...matches.map((match) => match.round));
  const finalMatches = matches.filter((match) => match.round === maxRound);
  return (
    finalMatches.length === 1 && finalMatches[0].winnerTeamId !== null
  );
}

/**
 * Fill each completed match's winner into the next round.
 * Slot i in round r feeds slot floor(i / 2) in round r + 1.
 */
export function advanceKnockoutRound(eventId: string): void {
  const matches = getKnockoutMatches(eventId);
  if (matches.length === 0) return;

  const db = getDb();

  for (const match of matches) {
    if (match.winnerTeamId === null || match.position === null) continue;

    const nextPosition = nextSlotPosition(match.position);
    const next = matches.find(
      (entry) =>
        entry.round === match.round + 1 && entry.position === nextPosition
    );
    if (!next) continue;

    if (match.position % 2 === 0) {
      if (next.team1Id !== match.winnerTeamId) {
        db.run("UPDATE matches SET team1_id = ? WHERE id = ?", [
          match.winnerTeamId,
          next.id,
        ]);
      }
    } else if (next.team2Id !== match.winnerTeamId) {
      db.run("UPDATE matches SET team2_id = ? WHERE id = ?", [
        match.winnerTeamId,
        next.id,
      ]);
    }
  }
}

export function getChampion(eventId: string): string | null {
  if (!isKnockoutComplete(eventId)) return null;
  const matches = getKnockoutMatches(eventId);
  const maxRound = Math.max(...matches.map((match) => match.round));
  return (
    matches.find((match) => match.round === maxRound)?.winnerTeamId ?? null
  );
}
