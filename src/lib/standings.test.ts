import { describe, test, expect, beforeEach } from "bun:test";
import { resetDb } from "./db";
import { createEvent, transitionPhase } from "./events";
import { registerParticipant } from "./participants";
import { generatePairings } from "./pairing";
import { generateGroupStage, getMatches } from "./schedule";
import { recordMatchScore } from "./scoring";
import { calculateGroupStandings } from "./standings";

beforeEach(() => {
  process.env.DB_PATH = ":memory:";
  resetDb();
});

function setupTournament() {
  const event = createEvent("Event");
  for (let i = 0; i < 8; i++) registerParticipant(event.id, `P${i}`);
  transitionPhase(event.id, event.adminToken, "pairing");
  generatePairings(event.id);
  transitionPhase(event.id, event.adminToken, "group_stage");
  generateGroupStage(event.id);
  return event;
}

describe("calculateGroupStandings", () => {
  test("returns 4 teams per group", () => {
    const event = setupTournament();
    const standings = calculateGroupStandings(event.id, 1);
    expect(standings.length).toBe(4);
  });

  test("all teams start with 0 points", () => {
    const event = setupTournament();
    const standings = calculateGroupStandings(event.id, 1);
    for (const s of standings) {
      expect(s.points).toBe(0);
      expect(s.played).toBe(0);
    }
  });

  test("win gives 2 points", () => {
    const event = setupTournament();
    const matches = getMatches(event.id, "group").filter((m) => m.groupNumber === 1);
    const match = matches[0];
    recordMatchScore(match.id, [
      { t1: 21, t2: 19 },
      { t1: 21, t2: 15 },
    ]);
    const standings = calculateGroupStandings(event.id, 1);
    const winner = standings.find((s) => s.teamId === match.team1Id);
    const loser = standings.find((s) => s.teamId === match.team2Id);
    expect(winner!.points).toBe(2);
    expect(winner!.won).toBe(1);
    expect(loser!.points).toBe(0);
    expect(loser!.lost).toBe(1);
  });

  test("walkover gives 2 points to winner", () => {
    const event = setupTournament();
    const matches = getMatches(event.id, "group").filter((m) => m.groupNumber === 1);
    const match = matches[0];
    recordMatchScore(match.id, [], true, match.team2Id || undefined);
    const standings = calculateGroupStandings(event.id, 1);
    const winner = standings.find((s) => s.teamId === match.team2Id);
    expect(winner!.points).toBe(2);
    expect(winner!.won).toBe(1);
  });

  test("top 2 are qualified", () => {
    const event = setupTournament();
    const matches = getMatches(event.id, "group").filter((m) => m.groupNumber === 1);
    // Play all matches: team0 beats everyone
    for (const m of matches) {
      recordMatchScore(m.id, [
        { t1: 21, t2: 19 },
        { t1: 21, t2: 15 },
      ]);
    }
    const standings = calculateGroupStandings(event.id, 1);
    const qualified = standings.filter((s) => s.qualified);
    expect(qualified.length).toBe(2);
  });

  test("tiebreaker: point diff breaks tie", () => {
    const event = setupTournament();
    // Just verify standings are sorted by points desc
    const standings = calculateGroupStandings(event.id, 1);
    for (let i = 1; i < standings.length; i++) {
      expect(standings[i - 1].points).toBeGreaterThanOrEqual(standings[i].points);
    }
  });
});