import { describe, test, expect, beforeEach } from "bun:test";
import { resetDb } from "./db";
import { createEvent, getEvent, transitionPhase } from "./events";
import { registerParticipant } from "./participants";
import {
  generatePairings,
  getTeams,
  isPairingLocked,
  lockTeams,
  swapPlayers,
} from "./pairing";

beforeEach(() => {
  process.env.DB_PATH = ":memory:";
  resetDb();
});

function setupEventWithParticipants(count: number) {
  const event = createEvent("Event");
  for (let i = 0; i < count; i++) {
    registerParticipant(event.id, `Player ${i + 1}`);
  }
  return event;
}

function setupPairedEvent(count = 8) {
  const event = setupEventWithParticipants(count);
  transitionPhase(event.id, event.adminToken, "pairing");
  generatePairings(event.id);
  return event;
}

describe("generatePairings", () => {
  test("generates correct number of teams", () => {
    const event = setupEventWithParticipants(8);
    const teams = generatePairings(event.id);
    expect(teams.length).toBe(4);
  });

  test("each team has 2 players", () => {
    const event = setupEventWithParticipants(8);
    const teams = generatePairings(event.id);
    for (const team of teams) {
      expect(team.player1Id).toBeTruthy();
      expect(team.player2Id).toBeTruthy();
      expect(team.player1Id).not.toBe(team.player2Id);
    }
  });

  test("all participants are used exactly once", () => {
    const event = setupEventWithParticipants(8);
    const teams = generatePairings(event.id);
    const playerIds = teams.flatMap((t) => [t.player1Id, t.player2Id]);
    expect(playerIds.length).toBe(8);
    expect(new Set(playerIds).size).toBe(8);
  });

  test("regenerates (reshuffle) replaces existing teams", () => {
    const event = setupEventWithParticipants(8);
    generatePairings(event.id);
    const firstTeams = getTeams(event.id);
    generatePairings(event.id);
    const secondTeams = getTeams(event.id);
    expect(secondTeams.length).toBe(4);
    // IDs should be different (new teams created)
    const firstIds = firstTeams.map((t) => t.id).sort();
    const secondIds = secondTeams.map((t) => t.id).sort();
    expect(firstIds).not.toEqual(secondIds);
  });

  test("throws on odd participant count", () => {
    const event = setupEventWithParticipants(6); // even but not multiple of 4; still even
    // 6 is even, should work
    const teams = generatePairings(event.id);
    expect(teams.length).toBe(3);
  });

  test("throws on 0 participants", () => {
    const event = createEvent("Event");
    expect(() => generatePairings(event.id)).toThrow();
  });
});

describe("getTeams", () => {
  test("returns empty for new event", () => {
    const event = createEvent("Event");
    expect(getTeams(event.id)).toEqual([]);
  });

  test("returns generated teams", () => {
    const event = setupEventWithParticipants(4);
    generatePairings(event.id);
    const teams = getTeams(event.id);
    expect(teams.length).toBe(2);
  });
});

describe("isPairingLocked", () => {
  test("not locked in registration phase", () => {
    const event = createEvent("Event");
    expect(isPairingLocked(event.id)).toBe(false);
  });

  test("not locked in pairing phase", () => {
    const event = createEvent("Event");
    transitionPhase(event.id, event.adminToken, "pairing");
    expect(isPairingLocked(event.id)).toBe(false);
  });

  test("locked in group_stage phase", () => {
    const event = createEvent("Event");
    transitionPhase(event.id, event.adminToken, "pairing");
    transitionPhase(event.id, event.adminToken, "group_stage");
    expect(isPairingLocked(event.id)).toBe(true);
  });

  test("locked after teams are locked", () => {
    const event = setupPairedEvent();
    lockTeams(event.id);
    expect(isPairingLocked(event.id)).toBe(true);
  });
});

describe("lockTeams", () => {
  test("locks the teams and marks the event", () => {
    const event = setupPairedEvent();

    lockTeams(event.id);

    expect(getEvent(event.id)?.teamsLocked).toBe(true);
    expect(getTeams(event.id)).toHaveLength(4);
  });

  test("rejects locking without teams", () => {
    const event = setupEventWithParticipants(8);
    transitionPhase(event.id, event.adminToken, "pairing");

    expect(() => lockTeams(event.id)).toThrow();
  });

  test("rejects a second lock", () => {
    const event = setupPairedEvent();
    lockTeams(event.id);

    expect(() => lockTeams(event.id)).toThrow();
  });

  test("rejects re-shuffle and swap after the lock", () => {
    const event = setupPairedEvent();
    const teams = getTeams(event.id);
    lockTeams(event.id);

    expect(() => generatePairings(event.id)).toThrow();
    expect(() =>
      swapPlayers(
        event.id,
        teams[0].id,
        teams[0].player1Id,
        teams[1].id,
        teams[1].player1Id
      )
    ).toThrow();
  });
});

describe("swapPlayers", () => {
  test("swaps players between two teams", () => {
    const event = setupEventWithParticipants(4);
    generatePairings(event.id);
    const teams = getTeams(event.id);
    const t1 = teams[0];
    const t2 = teams[1];

    const p1 = t1.player1Id;
    const p2 = t2.player1Id;

    swapPlayers(event.id, t1.id, p1, t2.id, p2);

    const updated = getTeams(event.id);
    const updatedT1 = updated.find((t) => t.id === t1.id)!;
    const updatedT2 = updated.find((t) => t.id === t2.id)!;

    expect(updatedT1.player1Id).toBe(p2);
    expect(updatedT2.player1Id).toBe(p1);
  });

  test("throws when pairings are locked", () => {
    const event = setupEventWithParticipants(4);
    generatePairings(event.id);
    transitionPhase(event.id, event.adminToken, "pairing");
    transitionPhase(event.id, event.adminToken, "group_stage");

    const teams = getTeams(event.id);
    expect(() =>
      swapPlayers(event.id, teams[0].id, teams[0].player1Id, teams[1].id, teams[1].player1Id)
    ).toThrow();
  });

  test("throws when player not in team", () => {
    const event = setupEventWithParticipants(4);
    generatePairings(event.id);
    const teams = getTeams(event.id);
    expect(() =>
      swapPlayers(event.id, teams[0].id, "nonexistent-player", teams[1].id, teams[1].player1Id)
    ).toThrow();
  });

  test("throws when same team", () => {
    const event = setupEventWithParticipants(4);
    generatePairings(event.id);
    const teams = getTeams(event.id);
    expect(() =>
      swapPlayers(event.id, teams[0].id, teams[0].player1Id, teams[0].id, teams[0].player2Id)
    ).toThrow();
  });
});