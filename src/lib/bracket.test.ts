import { describe, test, expect, beforeEach } from "bun:test";
import { resetDb } from "./db";
import { createEvent, transitionPhase } from "./events";
import { registerParticipant } from "./participants";
import { generatePairings, getTeams } from "./pairing";
import {
  drawGroupAssignments,
  generateGroupStage,
  getMatches,
} from "./schedule";
import { recordMatchScore } from "./scoring";
import {
  advanceKnockoutRound,
  buildKnockoutSkeleton,
  generateKnockoutBracket,
  getChampion,
  getKnockoutMatches,
  getQualifiedTeams,
  isKnockoutComplete,
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
  generateGroupStage(
    event.id,
    drawGroupAssignments(getTeams(event.id).map((team) => team.id))
  );

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

describe("buildKnockoutSkeleton", () => {
  test("builds every round without touching the database", () => {
    const skeleton = buildKnockoutSkeleton(["A", "B", "C", "D"]);

    expect(skeleton.filter((slot) => slot.round === 1).length).toBe(2);
    expect(skeleton.filter((slot) => slot.round === 2).length).toBe(1);
    expect(skeleton.filter((slot) => slot.isBye).length).toBe(0);
  });

  test("marks top seeds as byes", () => {
    const skeleton = buildKnockoutSkeleton(["A", "B", "C", "D", "E", "F"]);

    expect(skeleton.filter((slot) => slot.isBye).length).toBe(2);
    expect(skeleton.filter((slot) => slot.round === 1).length).toBe(4);
    expect(skeleton.filter((slot) => slot.round === 3).length).toBe(1);
  });
});

describe("generateKnockoutBracket", () => {
  test("generates bracket for 2 teams (1 group) - 1 match", () => {
    const event = setupTournament(1);
    const matches = getKnockoutMatches(event.id);
    expect(matches.length).toBe(1);
  });

  test("generates bracket for 4 teams (2 groups) - 3 matches", () => {
    const event = setupTournament(2);
    const matches = getKnockoutMatches(event.id);
    expect(matches.length).toBe(3);
  });

  test("generates bracket for 8 teams (4 groups) - 7 matches", () => {
    const event = setupTournament(4);
    const matches = getKnockoutMatches(event.id);
    expect(matches.length).toBe(7);
  });

  test("generates bracket for 6 teams (3 groups) with byes", () => {
    const event = setupTournament(3);
    const matches = getKnockoutMatches(event.id);
    // 6 teams, bracket size 8: 2 byes + 2 play-in + 2 semifinal + final
    expect(matches.length).toBe(7);
    const byes = matches.filter((m) => m.team2Id === null && m.winnerTeamId !== null);
    expect(byes.length).toBe(2);

    const roundTwo = matches.filter((m) => m.round === 2);
    expect(roundTwo[0].team1Id).not.toBeNull();
    expect(roundTwo[0].team2Id).not.toBeNull();
  });

  test("creates every round with deterministic positions", () => {
    const event = setupTournament(3);
    const matches = getKnockoutMatches(event.id);

    expect(matches.filter((m) => m.round === 1)).toHaveLength(4);
    expect(matches.filter((m) => m.round === 2)).toHaveLength(2);
    expect(matches.filter((m) => m.round === 3)).toHaveLength(1);
    expect(matches.every((m) => m.position !== null)).toBe(true);
    expect(
      matches.filter(
        (m) => m.round === 1 && m.team2Id === null && m.winnerTeamId !== null
      )
    ).toHaveLength(2);
  });
});

describe("advanceKnockoutRound", () => {
  test("fills the next round slots when the current round is decided", () => {
    const event = setupTournament(2);
    const roundOne = getKnockoutMatches(event.id).filter(
      (m) => m.round === 1
    );

    expect(roundOne).toHaveLength(2);
    for (const match of roundOne) {
      recordMatchScore(match.id, [
        { t1: 21, t2: 19 },
        { t1: 21, t2: 15 },
      ]);
    }
    advanceKnockoutRound(event.id);

    const final = getKnockoutMatches(event.id).find((m) => m.round === 2);
    expect(final?.team1Id).toBeTruthy();
    expect(final?.team2Id).toBeTruthy();
  });

  test("allows a correction before the dependent next round is decided", () => {
    const event = setupTournament(2);
    const roundOne = getKnockoutMatches(event.id).filter(
      (m) => m.round === 1
    );
    recordMatchScore(roundOne[0].id, [
      { t1: 21, t2: 19 },
      { t1: 21, t2: 15 },
    ]);
    advanceKnockoutRound(event.id);

    recordMatchScore(roundOne[0].id, [
      { t1: 19, t2: 21 },
      { t1: 15, t2: 21 },
    ]);
    advanceKnockoutRound(event.id);

    const final = getKnockoutMatches(event.id).find((m) => m.round === 2)!;
    expect(final.team1Id).toBe(roundOne[0].team2Id);
  });

  test("rejects correcting a match after the dependent next round is decided", () => {
    const event = setupTournament(2);
    const roundOne = getKnockoutMatches(event.id).filter(
      (m) => m.round === 1
    );
    for (const match of roundOne) {
      recordMatchScore(match.id, [
        { t1: 21, t2: 19 },
        { t1: 21, t2: 15 },
      ]);
    }
    advanceKnockoutRound(event.id);

    const final = getKnockoutMatches(event.id).find((m) => m.round === 2)!;
    recordMatchScore(final.id, [
      { t1: 21, t2: 19 },
      { t1: 21, t2: 15 },
    ]);

    expect(() =>
      recordMatchScore(roundOne[0].id, [
        { t1: 19, t2: 21 },
        { t1: 15, t2: 21 },
      ])
    ).toThrow();
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