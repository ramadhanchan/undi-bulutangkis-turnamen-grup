import { describe, test, expect, beforeEach } from "bun:test";
import {
  isValidSetScore,
  getSetWinner,
  getMatchWinner,
  isValidMatchScore,
  getWalkoverScore,
  recordMatchScore,
} from "./scoring";
import { resetDb } from "./db";
import { createEvent, transitionPhase } from "./events";
import { registerParticipant } from "./participants";
import { generatePairings, getTeams } from "./pairing";
import {
  drawGroupAssignments,
  generateGroupStage,
  getMatches,
} from "./schedule";

beforeEach(() => {
  process.env.DB_PATH = ":memory:";
  resetDb();
});

describe("isValidSetScore", () => {
  test("valid: 21-19", () => expect(isValidSetScore(21, 19)).toBe(true));
  test("valid: 21-0", () => expect(isValidSetScore(21, 0)).toBe(true));
  test("valid: 23-21", () => expect(isValidSetScore(23, 21)).toBe(true));
  test("valid: 30-28", () => expect(isValidSetScore(30, 28)).toBe(true));
  test("valid: 30-29", () => expect(isValidSetScore(30, 29)).toBe(true));
  test("invalid: 20-18 (not enough)", () => expect(isValidSetScore(20, 18)).toBe(false));
  test("invalid: 21-20 (not win by 2)", () => expect(isValidSetScore(21, 20)).toBe(false));
  test("invalid: 22-20 (diff 2 but min 20 < 21... actually 22>21, diff2, valid)", () => expect(isValidSetScore(22, 20)).toBe(true));
  test("invalid: 31-29 (over cap)", () => expect(isValidSetScore(31, 29)).toBe(false));
  test("invalid: 30-30 (not a win)", () => expect(isValidSetScore(30, 30)).toBe(false));
  test("invalid: 0-0", () => expect(isValidSetScore(0, 0)).toBe(false));
  test("invalid: negative", () => expect(isValidSetScore(-1, 21)).toBe(false));
});

describe("getSetWinner", () => {
  test("team1 wins 21-19", () => expect(getSetWinner(21, 19)).toBe(1));
  test("team2 wins 19-21", () => expect(getSetWinner(19, 21)).toBe(2));
  test("invalid returns null", () => expect(getSetWinner(20, 18)).toBeNull());
});

describe("getMatchWinner", () => {
  test("team1 wins 2-0", () => {
    expect(getMatchWinner([{ t1: 21, t2: 19 }, { t1: 21, t2: 15 }])).toBe(1);
  });
  test("team2 wins 2-1", () => {
    expect(getMatchWinner([{ t1: 21, t2: 19 }, { t1: 19, t2: 21 }, { t1: 15, t2: 21 }])).toBe(2);
  });
  test("no winner yet (1-1)", () => {
    expect(getMatchWinner([{ t1: 21, t2: 19 }, { t1: 19, t2: 21 }])).toBeNull();
  });
});

describe("isValidMatchScore", () => {
  test("valid 2-0", () => {
    expect(isValidMatchScore([{ t1: 21, t2: 19 }, { t1: 21, t2: 15 }])).toBe(true);
  });
  test("valid 2-1", () => {
    expect(isValidMatchScore([{ t1: 21, t2: 19 }, { t1: 19, t2: 21 }, { t1: 21, t2: 18 }])).toBe(true);
  });
  test("invalid: only 1 set", () => {
    expect(isValidMatchScore([{ t1: 21, t2: 19 }])).toBe(false);
  });
  test("invalid: 3 sets but 3-0", () => {
    expect(isValidMatchScore([{ t1: 21, t2: 19 }, { t1: 21, t2: 15 }, { t1: 21, t2: 10 }])).toBe(false);
  });
  test("invalid: 2 sets split 1-1", () => {
    expect(isValidMatchScore([{ t1: 21, t2: 19 }, { t1: 19, t2: 21 }])).toBe(false);
  });
});

describe("getWalkoverScore", () => {
  test("returns 2-0 (21-0, 21-0)", () => {
    const wo = getWalkoverScore();
    expect(wo.length).toBe(2);
    expect(wo[0]).toEqual({ t1: 21, t2: 0 });
    expect(wo[1]).toEqual({ t1: 21, t2: 0 });
  });
});

describe("recordMatchScore", () => {
  test("records a valid score", () => {
    const event = createEvent("Event");
    for (let i = 0; i < 8; i++) registerParticipant(event.id, `P${i}`);
    transitionPhase(event.id, event.adminToken, "pairing");
    generatePairings(event.id);
    transitionPhase(event.id, event.adminToken, "group_stage");
    generateGroupStage(
      event.id,
      drawGroupAssignments(getTeams(event.id).map((team) => team.id))
    );
    const matches = getMatches(event.id, "group");
    expect(matches.length).toBe(6); // 4 teams → 1 group → 6 matches

    const match = matches[0];
    const result = recordMatchScore(match.id, [
      { t1: 21, t2: 19 },
      { t1: 21, t2: 15 },
    ]);
    expect(result.winnerTeamId).toBe(match.team1Id);
  });

  test("rejects a walkover without a valid winner", () => {
    const event = createEvent("Event");
    for (let i = 0; i < 8; i++) registerParticipant(event.id, `P${i}`);
    transitionPhase(event.id, event.adminToken, "pairing");
    generatePairings(event.id);
    transitionPhase(event.id, event.adminToken, "group_stage");
    generateGroupStage(
      event.id,
      drawGroupAssignments(getTeams(event.id).map((team) => team.id))
    );
    const match = getMatches(event.id, "group")[0];

    expect(() => recordMatchScore(match.id, [], true)).toThrow();
    expect(() =>
      recordMatchScore(match.id, [], true, "not-a-team")
    ).toThrow();
  });

  test("records walkover", () => {
    const event = createEvent("Event");
    for (let i = 0; i < 8; i++) registerParticipant(event.id, `P${i}`);
    transitionPhase(event.id, event.adminToken, "pairing");
    generatePairings(event.id);
    transitionPhase(event.id, event.adminToken, "group_stage");
    generateGroupStage(
      event.id,
      drawGroupAssignments(getTeams(event.id).map((team) => team.id))
    );
    const matches = getMatches(event.id, "group");
    const match = matches[0];

    const result = recordMatchScore(match.id, [], true, match.team2Id || undefined);
    expect(result.winnerTeamId).toBe(match.team2Id); // opponent wins
  });

  test("rejects invalid score", () => {
    const event = createEvent("Event");
    for (let i = 0; i < 8; i++) registerParticipant(event.id, `P${i}`);
    transitionPhase(event.id, event.adminToken, "pairing");
    generatePairings(event.id);
    transitionPhase(event.id, event.adminToken, "group_stage");
    generateGroupStage(
      event.id,
      drawGroupAssignments(getTeams(event.id).map((team) => team.id))
    );
    const matches = getMatches(event.id, "group");
    const match = matches[0];

    expect(() =>
      recordMatchScore(match.id, [{ t1: 20, t2: 18 }])
    ).toThrow();
  });
});