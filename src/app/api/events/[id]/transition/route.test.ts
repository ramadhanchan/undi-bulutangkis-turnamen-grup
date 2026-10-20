import { describe, test, expect, beforeEach } from "bun:test";
import { getKnockoutMatches } from "@/lib/bracket";
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

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/events/test/transition", {
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

describe("transition API", () => {
  test("rejects a malformed body", async () => {
    const event = setupGroupStage();

    const response = await POST(
      new Request("http://localhost/api/events/test/transition", {
        method: "POST",
      }),
      params(event.id)
    );

    expect(response.status).toBe(400);
    expect(((await response.json()) as { error: string }).error).toBe(
      "Body permintaan tidak valid."
    );
  });

  test("rejects the generic group-stage transition", async () => {
    const event = setupGroupStage();

    const response = await POST(
      jsonRequest({ token: event.adminToken, targetState: "group_stage" }),
      params(event.id)
    );

    expect(response.status).toBe(400);
    expect(getEvent(event.id)?.state).toBe("group_stage");
  });

  test("rejects starting the knockout while group matches are unfinished", async () => {
    const event = setupGroupStage();

    const response = await POST(
      jsonRequest({ token: event.adminToken, targetState: "knockout" }),
      params(event.id)
    );

    expect(response.status).toBe(400);
    expect(getEvent(event.id)?.state).toBe("group_stage");
  });

  test("starts the knockout when every group match is finished", async () => {
    const event = setupGroupStage();
    for (const match of getMatches(event.id, "group")) {
      recordMatchScore(match.id, [
        { t1: 21, t2: 19 },
        { t1: 21, t2: 15 },
      ]);
    }

    const response = await POST(
      jsonRequest({ token: event.adminToken, targetState: "knockout" }),
      params(event.id)
    );

    expect(response.status).toBe(200);
    expect(getEvent(event.id)?.state).toBe("knockout");
    expect(getKnockoutMatches(event.id).length).toBeGreaterThan(0);
  });

  test("rejects manually finishing the event", async () => {
    const event = setupGroupStage();
    for (const match of getMatches(event.id, "group")) {
      recordMatchScore(match.id, [
        { t1: 21, t2: 19 },
        { t1: 21, t2: 15 },
      ]);
    }
    await POST(
      jsonRequest({ token: event.adminToken, targetState: "knockout" }),
      params(event.id)
    );
    expect(getEvent(event.id)?.state).toBe("knockout");

    const response = await POST(
      jsonRequest({ token: event.adminToken, targetState: "finished" }),
      params(event.id)
    );

    expect(response.status).toBe(400);
    expect(getEvent(event.id)?.state).toBe("knockout");
  });
});
