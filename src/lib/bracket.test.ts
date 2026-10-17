import { describe, test, expect, beforeEach } from "bun:test";
import { resetDb } from "./db";
import { createEvent, transitionPhase } from "./events";
import { registerParticipant } from "./participants";
import { generatePairings } from "./pairing";
import { generateGroupStage, getMatches } from "./schedule";
import { recordMatchScore } from "./scoring";
import {
  generateKnockoutBracket,
  getKnockoutMatches,
  getChampion,
  isKnockoutComplete,
  getQualifiedTeams,
  advanceKnockoutRound,
} from "./bracket";

beforeEach(() => {
  process.env.DB_PATH = ":memory:";
  resetDb();
});

function setupTournament(numGroups: number) {
  const event = createEvent("Event");
  const numParticipants = numGroups * 8;
  for (let i = 0; i < numParticipants; i++) registerParticipant(event.id, `P${i}`);
  transitionPhase(event.id, event.adminToken, "pairing");
  generatePairings(event.id);
  transitionPhase(event.id, event.adminToken, "group_stage");
  generateGroupStage(event.id);

  // Play all group matches: team1 wins 2-0
  const matches = getMatches(event.id, "group");
  for (const m of matches) {
    recordMatchScore(m.id, [{ t1: 21, t2: 19 }, { t1: 21, t2: 15 }]);
  }

  transitionPhase(event.id, event.adminToken, "knockout");
  generateKnockoutBracket(event.id);
  return event;
}

describe("getQualifiedTeams", () => {
  test("returns top 2 per group (1 group)", () => {
    const event = setupTournament(1);
    const qualified = getQualifiedTeams(event.id);
    expect(qualified.length).toBe(2);
  });

  test("returns 8 for 4 groups", () => {
    const event = setupTournament(4);
    const qualified = getQualifiedTeams(event.id);
    expect(qualified.length).toBe(8);
  });

  test("returns 4 for 2 groups", () => {
    const event = setupTournament(2);
    const qualified = getQualifiedTeams(event.id);
    expect(qualified.length).toBe(4);
  });

  test("returns 6 for 3 groups", () => {
    const event = setupTournament(3);
    const qualified = getQualifiedTeams(event.id);
    expect(qualified.length).toBe(6);
  });
});

describe("generateKnockoutBracket", () => {
  test("generates bracket for 2 teams (1 group) - 1 match", () => {
    const event = setupTournament(1);
    const matches = getKnockoutMatches(event.id);
    expect(matches.length).toBe(1);
  });

  test("generates bracket for 4 teams (2 groups) - 2 matches initially", () => {
    const event = setupTournament(2);
    const matches = getKnockoutMatches(event.id);
    expect(matches.length).toBe(2);
  });

  test("generates bracket for 8 teams (4 groups) - 4 matches initially", () => {
    const event = setupTournament(4);
    const matches = getKnockoutMatches(event.id);
    expect(matches.length).toBe(4);
  });

  test("generates bracket for 6 teams (3 groups) with byes", () => {
    const event = setupTournament(3);
    const matches = getKnockoutMatches(event.id);
    // 6 teams, bracket size 8: 2 byes + 2 play-in + need round 2 matches
    // Round 1: 2 play-in + 2 bye = 4 matches
    expect(matches.length).toBe(4);
    const byes = matches.filter((m) => m.team2Id === null && m.winnerTeamId !== null);
    expect(byes.length).toBe(2);
  });
});

describe("advanceKnockoutRound", () => {
  test("creates next round when all current round matches complete", () => {
    const event = setupTournament(2);
    const matches = getKnockoutMatches(event.id);
    // Play all semifinal matches
    for (const m of matches) {
      if (m.team2Id !== null) {
        recordMatchScore(m.id, [{ t1: 21, t2: 19 }, { t1: 21, t2: 15 }]);
      }
    }
    const beforeCount = getKnockoutMatches(event.id).length;
    advanceKnockoutRound(event.id);
    const afterCount = getKnockoutMatches(event.id).length;
    expect(afterCount).toBeGreaterThan(beforeCount);
  });
});

describe("isKnockoutComplete", () => {
  test("not complete initially", () => {
    const event = setupTournament(1);
    expect(isKnockoutComplete(event.id)).toBe(false);
  });

  test("complete after final scored", () => {
    const event = setupTournament(1);
    const matches = getKnockoutMatches(event.id);
    recordMatchScore(matches[0].id, [{ t1: 21, t2: 19 }, { t1: 21, t2: 15 }]);
    expect(isKnockoutComplete(event.id)).toBe(true);
  });
});

describe("getChampion", () => {
  test("returns null when not complete", () => {
    const event = setupTournament(1);
    expect(getChampion(event.id)).toBeNull();
  });

  test("returns winner after final", () => {
    const event = setupTournament(1);
    const matches = getKnockoutMatches(event.id);
    const result = recordMatchScore(matches[0].id, [{ t1: 21, t2: 19 }, { t1: 21, t2: 15 }]);
    expect(getChampion(event.id)).toBe(result.winnerTeamId);
  });
});