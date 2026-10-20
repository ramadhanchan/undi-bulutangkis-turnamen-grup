import { describe, test, expect, beforeEach } from "bun:test";
import {
  generateKnockoutBracket,
  getChampion,
  getKnockoutMatches,
} from "@/lib/bracket";
import { resetDb } from "@/lib/db";
import { createEvent, getEvent, transitionPhase } from "@/lib/events";
import { generatePairings, getTeams, lockTeams } from "@/lib/pairing";
import { registerParticipant } from "@/lib/participants";
import {
  drawGroupAssignments,
  generateGroupStage,
  getMatches,
} from "@/lib/schedule";
import { recordMatchScore } from "@/lib/scoring";
import { POST } from "./route";

beforeEach(() => {
  process.env.DB_PATH = ":memory:";
  resetDb();
});

function params(id: string, matchId: string) {
  return { params: Promise.resolve({ id, matchId }) };
}

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/events/test/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupGroupStage() {
  const event = createEvent("Event");
  for (let index = 0; index < 8; index++) {
    registerParticipant(event.id, `P${index}`);
  }
  transitionPhase(event.id, event.adminToken, "pairing");
  generatePairings(event.id);
  lockTeams(event.id);
  generateGroupStage(
    event.id,
    drawGroupAssignments(getTeams(event.id).map((team) => team.id))
  );
  transitionPhase(event.id, event.adminToken, "group_stage");
  return event;
}

function setupKnockoutBracket() {
  const event = createEvent("Event");
  for (let index = 0; index < 16; index++) {
    registerParticipant(event.id, `P${index}`);
  }
  transitionPhase(event.id, event.adminToken, "pairing");
  generatePairings(event.id);
  lockTeams(event.id);
  generateGroupStage(
    event.id,
    drawGroupAssignments(getTeams(event.id).map((team) => team.id))
  );
  transitionPhase(event.id, event.adminToken, "group_stage");
  for (const match of getMatches(event.id, "group")) {
    recordMatchScore(match.id, [
      { t1: 21, t2: 19 },
      { t1: 21, t2: 15 },
    ]);
  }
  transitionPhase(event.id, event.adminToken, "knockout");
  generateKnockoutBracket(event.id);
  return event;
}

function setupKnockoutFinal() {
  const event = createEvent("Event");
  for (let index = 0; index < 8; index++) {
    registerParticipant(event.id, `P${index}`);
  }
  transitionPhase(event.id, event.adminToken, "pairing");
  generatePairings(event.id);
  lockTeams(event.id);
  generateGroupStage(
    event.id,
    drawGroupAssignments(getTeams(event.id).map((team) => team.id))
  );
  transitionPhase(event.id, event.adminToken, "group_stage");
  for (const match of getMatches(event.id, "group")) {
    recordMatchScore(match.id, [
      { t1: 21, t2: 19 },
      { t1: 21, t2: 15 },
    ]);
  }
  transitionPhase(event.id, event.adminToken, "knockout");
  generateKnockoutBracket(event.id);
  return event;
}

describe("score API", () => {
  test("requires a valid admin token", async () => {
    const event = setupGroupStage();
    const match = getMatches(event.id, "group")[0];

    const response = await POST(
      jsonRequest({
        sets: [
          { t1: 21, t2: 19 },
          { t1: 21, t2: 15 },
        ],
      }),
      params(event.id, match.id)
    );

    expect(response.status).toBe(403);
  });

  test("saves a group score", async () => {
    const event = setupGroupStage();
    const match = getMatches(event.id, "group")[0];

    const response = await POST(
      jsonRequest({
        token: event.adminToken,
        sets: [
          { t1: 21, t2: 19 },
          { t1: 21, t2: 15 },
        ],
      }),
      params(event.id, match.id)
    );
    const updated = getMatches(event.id, "group").find(
      (entry) => entry.id === match.id
    );

    expect(response.status).toBe(200);
    expect(updated?.winnerTeamId).toBe(match.team1Id);
    expect(updated?.set1T1).toBe(21);
    expect(updated?.set1T2).toBe(19);
  });

  test("records a walkover with the chosen winner", async () => {
    const event = setupGroupStage();
    const match = getMatches(event.id, "group")[0];

    const response = await POST(
      jsonRequest({
        token: event.adminToken,
        sets: [],
        isWalkover: true,
        walkoverWinnerId: match.team2Id,
      }),
      params(event.id, match.id)
    );
    const updated = getMatches(event.id, "group").find(
      (entry) => entry.id === match.id
    );

    expect(response.status).toBe(200);
    expect(updated?.winnerTeamId).toBe(match.team2Id);
    expect(updated?.set1T1).toBe(0);
    expect(updated?.set1T2).toBe(21);
    expect(updated?.isWalkover).toBe(true);
  });

  test("corrects a group score while the group stage is active", async () => {
    const event = setupGroupStage();
    const match = getMatches(event.id, "group")[0];
    await POST(
      jsonRequest({
        token: event.adminToken,
        sets: [
          { t1: 21, t2: 19 },
          { t1: 21, t2: 15 },
        ],
      }),
      params(event.id, match.id)
    );

    const response = await POST(
      jsonRequest({
        token: event.adminToken,
        sets: [
          { t1: 19, t2: 21 },
          { t1: 15, t2: 21 },
        ],
      }),
      params(event.id, match.id)
    );
    const updated = getMatches(event.id, "group").find(
      (entry) => entry.id === match.id
    );

    expect(response.status).toBe(200);
    expect(updated?.winnerTeamId).toBe(match.team2Id);
  });

  test("rejects group score changes after the knockout starts", async () => {
    const event = setupGroupStage();
    const match = getMatches(event.id, "group")[0];
    transitionPhase(event.id, event.adminToken, "knockout");

    const response = await POST(
      jsonRequest({
        token: event.adminToken,
        sets: [
          { t1: 21, t2: 19 },
          { t1: 21, t2: 15 },
        ],
      }),
      params(event.id, match.id)
    );

    expect(response.status).toBe(400);
  });

  test("rejects scoring a match whose teams are still TBD", async () => {
    const event = setupKnockoutBracket();
    const final = getKnockoutMatches(event.id).find((m) => m.round === 2);
    if (!final) throw new Error("Final match missing");

    const response = await POST(
      jsonRequest({
        token: event.adminToken,
        sets: [
          { t1: 21, t2: 19 },
          { t1: 21, t2: 15 },
        ],
      }),
      params(event.id, final.id)
    );

    expect(response.status).toBe(400);
    expect(((await response.json()) as { error: string }).error).toBe(
      "Match belum siap dimainkan"
    );
  });

  test("marks the event finished when the final is scored", async () => {
    const event = setupKnockoutFinal();
    const final = getKnockoutMatches(event.id)[0];

    const response = await POST(
      jsonRequest({
        token: event.adminToken,
        sets: [
          { t1: 21, t2: 19 },
          { t1: 21, t2: 15 },
        ],
      }),
      params(event.id, final.id)
    );

    expect(response.status).toBe(200);
    expect(getEvent(event.id)?.state).toBe("finished");
    expect(getChampion(event.id)).toBe(final.team1Id);

    const correction = await POST(
      jsonRequest({
        token: event.adminToken,
        sets: [
          { t1: 19, t2: 21 },
          { t1: 15, t2: 21 },
        ],
      }),
      params(event.id, final.id)
    );

    expect(correction.status).toBe(200);
    expect(getEvent(event.id)?.state).toBe("finished");
    expect(getChampion(event.id)).toBe(final.team2Id);
  });

  test("rejects an invalid walkover winner", async () => {
    const event = setupGroupStage();
    const match = getMatches(event.id, "group")[0];

    const response = await POST(
      jsonRequest({
        token: event.adminToken,
        sets: [],
        isWalkover: true,
        walkoverWinnerId: "not-a-team",
      }),
      params(event.id, match.id)
    );

    expect(response.status).toBe(400);
  });

  test("rejects non-numeric set values", async () => {
    const event = setupGroupStage();
    const match = getMatches(event.id, "group")[0];

    const response = await POST(
      jsonRequest({
        token: event.adminToken,
        sets: [
          { t1: "21", t2: 19 },
          { t1: 21, t2: 15 },
        ],
      }),
      params(event.id, match.id)
    );

    expect(response.status).toBe(400);
  });

  test("rejects a malformed body", async () => {
    const event = setupGroupStage();
    const match = getMatches(event.id, "group")[0];

    const response = await POST(
      new Request("http://localhost/api/events/test/score", {
        method: "POST",
      }),
      params(event.id, match.id)
    );

    expect(response.status).toBe(400);
    expect(((await response.json()) as { error: string }).error).toBe(
      "Body permintaan tidak valid."
    );
  });
});
