import { describe, test, expect, beforeEach } from "bun:test";
import { resetDb } from "./db";
import { createEvent, transitionPhase } from "./events";
import { registerParticipant } from "./participants";
import { generatePairings, getTeams, lockTeams } from "./pairing";
import {
  drawGroupAssignments,
  generateGroupStage,
  generateRoundRobin,
  getMatches,
  groupSizes,
  summarizeGroups,
  validateGroupAssignment,
} from "./schedule";

beforeEach(() => {
  process.env.DB_PATH = ":memory:";
  resetDb();
});

function setupLockedEvent(participantCount: number) {
  const event = createEvent("Event");
  for (let index = 0; index < participantCount; index++) {
    registerParticipant(event.id, `P${index}`);
  }
  transitionPhase(event.id, event.adminToken, "pairing");
  generatePairings(event.id);
  lockTeams(event.id);
  return event;
}

describe("groupSizes", () => {
  test("uses 3 or 4 teams per group", () => {
    expect(groupSizes(3)).toEqual([3]);
    expect(groupSizes(4)).toEqual([4]);
    expect(groupSizes(6)).toEqual([3, 3]);
    expect(groupSizes(7)).toEqual([4, 3]);
    expect(groupSizes(8)).toEqual([4, 4]);
    expect(groupSizes(9)).toEqual([3, 3, 3]);
    expect(groupSizes(10)).toEqual([4, 3, 3]);
    expect(groupSizes(11)).toEqual([4, 4, 3]);
    expect(groupSizes(12)).toEqual([4, 4, 4]);
    expect(groupSizes(13)).toEqual([4, 3, 3, 3]);
    expect(groupSizes(14)).toEqual([4, 4, 3, 3]);
    expect(groupSizes(15)).toEqual([4, 4, 4, 3]);
  });

  test("rejects 1 and 2 teams", () => {
    expect(() => groupSizes(1)).toThrow();
    expect(() => groupSizes(2)).toThrow();
  });

  test("rejects 5 teams with actionable guidance", () => {
    expect(() => groupSizes(5)).toThrow(/5 tim/);
    expect(() => groupSizes(5)).toThrow(/6/);
    expect(() => groupSizes(5)).toThrow(/4/);
  });

  test("supports every valid count from 16 to 21", () => {
    for (const count of [16, 17, 18, 19, 20, 21]) {
      const sizes = groupSizes(count);
      expect(sizes.reduce((sum, size) => sum + size, 0)).toBe(count);
      expect(sizes.every((size) => size === 3 || size === 4)).toBe(true);
    }
  });
});

describe("generateRoundRobin", () => {
  test("4 teams produce 6 matches and every team plays 3", () => {
    const matches = generateRoundRobin(4);
    const appearances = new Map<number, number>();

    for (const match of matches) {
      appearances.set(
        match.team1Index,
        (appearances.get(match.team1Index) ?? 0) + 1
      );
      appearances.set(
        match.team2Index,
        (appearances.get(match.team2Index) ?? 0) + 1
      );
    }

    expect(matches).toHaveLength(6);
    expect([...appearances.keys()].sort()).toEqual([0, 1, 2, 3]);
    expect([...appearances.values()]).toEqual([3, 3, 3, 3]);
  });

  test("3 teams produce 3 matches without a bye match", () => {
    const matches = generateRoundRobin(3);
    const appearances = new Map<number, number>();
    const pairs = new Set<string>();

    for (const match of matches) {
      appearances.set(
        match.team1Index,
        (appearances.get(match.team1Index) ?? 0) + 1
      );
      appearances.set(
        match.team2Index,
        (appearances.get(match.team2Index) ?? 0) + 1
      );
      pairs.add([match.team1Index, match.team2Index].sort().join("-"));
    }

    expect(matches).toHaveLength(3);
    expect(pairs.size).toBe(3);
    expect([...appearances.keys()].sort()).toEqual([0, 1, 2]);
    expect([...appearances.values()]).toEqual([2, 2, 2]);
    expect(new Set(matches.map((match) => match.round)).size).toBe(3);
  });
});

describe("drawGroupAssignments", () => {
  test("partitions every team once into balanced groups", () => {
    const teamIds = Array.from({ length: 10 }, (_, index) => `team-${index}`);
    const groups = drawGroupAssignments(teamIds);

    expect(groups.map((group) => group.length).sort()).toEqual([3, 3, 4]);
    expect(groups.flat().sort()).toEqual([...teamIds].sort());
  });

  test("rejects 5 teams", () => {
    expect(() =>
      drawGroupAssignments(["a", "b", "c", "d", "e"])
    ).toThrow(/5 tim/);
  });
});

describe("summarizeGroups", () => {
  test("reports team, group, and match counts", () => {
    expect(
      summarizeGroups([
        ["a", "b", "c", "d"],
        ["e", "f", "g"],
        ["h", "i", "j"],
      ])
    ).toEqual({
      teamCount: 10,
      groupCount: 3,
      groupSizes: [4, 3, 3],
      matchCount: 12,
    });
  });
});

describe("validateGroupAssignment", () => {
  const teamIds = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];

  test("accepts a valid 4 + 3 + 3 partition", () => {
    expect(
      validateGroupAssignment(teamIds, [
        ["a", "b", "c", "d"],
        ["e", "f", "g"],
        ["h", "i", "j"],
      ])
    ).toBeNull();
  });

  test("rejects the wrong group sizes", () => {
    expect(
      validateGroupAssignment(teamIds, [
        ["a", "b", "c", "d"],
        ["e", "f"],
        ["g", "h", "i", "j"],
      ])
    ).not.toBeNull();
  });

  test("rejects duplicate teams", () => {
    expect(
      validateGroupAssignment(teamIds, [
        ["a", "b", "c", "d"],
        ["e", "f", "g"],
        ["h", "i", "a"],
      ])
    ).not.toBeNull();
  });

  test("rejects a foreign team that leaves a team missing", () => {
    expect(
      validateGroupAssignment(teamIds, [
        ["a", "b", "c", "d"],
        ["e", "f", "g"],
        ["h", "i", "foreign"],
      ])
    ).toBe("Ada tim yang belum masuk grup");
  });
});

describe("generateGroupStage", () => {
  test("creates 3-team groups with 3 matches each", () => {
    const event = setupLockedEvent(12);

    generateGroupStage(
      event.id,
      drawGroupAssignments(getTeams(event.id).map((team) => team.id))
    );

    const teams = getTeams(event.id);
    const matches = getMatches(event.id, "group");

    expect(teams.map((team) => team.groupNumber).sort()).toEqual([
      1, 1, 1, 2, 2, 2,
    ]);
    expect(matches).toHaveLength(6);
    expect(matches.every((match) => match.team1Id && match.team2Id)).toBe(true);
  });

  test("creates 4-team groups with 6 matches each", () => {
    const event = setupLockedEvent(16);

    generateGroupStage(
      event.id,
      drawGroupAssignments(getTeams(event.id).map((team) => team.id))
    );

    const teams = getTeams(event.id);
    const matches = getMatches(event.id, "group");

    expect(teams.map((team) => team.groupNumber).sort()).toEqual([
      1, 1, 1, 1, 2, 2, 2, 2,
    ]);
    expect(matches).toHaveLength(12);
  });

  test("accepts an explicit partition", () => {
    const event = setupLockedEvent(12);
    const teams = getTeams(event.id);
    const groups = [
      teams.slice(0, 3).map((team) => team.id),
      teams.slice(3, 6).map((team) => team.id),
    ];

    generateGroupStage(event.id, groups);

    expect(getMatches(event.id, "group")).toHaveLength(6);
    expect(
      getTeams(event.id)
        .filter((team) => groups[0].includes(team.id))
        .every((team) => team.groupNumber === 1)
    ).toBe(true);
  });

  test("rejects an invalid partition", () => {
    const event = setupLockedEvent(12);
    const teams = getTeams(event.id);

    expect(() =>
      generateGroupStage(event.id, [
        teams.slice(0, 3).map((team) => team.id),
        teams.slice(3, 5).map((team) => team.id),
      ])
    ).toThrow();
  });
});
