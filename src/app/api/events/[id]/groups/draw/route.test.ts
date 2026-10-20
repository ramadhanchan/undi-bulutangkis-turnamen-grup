import { describe, test, expect, beforeEach } from "bun:test";
import { resetDb } from "@/lib/db";
import { createEvent, transitionPhase } from "@/lib/events";
import { generatePairings, getTeams, lockTeams } from "@/lib/pairing";
import { registerParticipant } from "@/lib/participants";
import { POST } from "./route";

beforeEach(() => {
  process.env.DB_PATH = ":memory:";
  resetDb();
});

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/events/test/groups/draw", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupLockedEvent() {
  const event = createEvent("Event");
  for (let index = 0; index < 12; index++) {
    registerParticipant(event.id, `P${index}`);
  }
  transitionPhase(event.id, event.adminToken, "pairing");
  generatePairings(event.id);
  lockTeams(event.id);
  return event;
}

describe("group draw API", () => {
  test("requires a valid admin token", async () => {
    const event = setupLockedEvent();

    const response = await POST(jsonRequest({}), params(event.id));

    expect(response.status).toBe(403);
  });

  test("requires locked teams", async () => {
    const event = createEvent("Event");
    for (let index = 0; index < 12; index++) {
      registerParticipant(event.id, `P${index}`);
    }
    transitionPhase(event.id, event.adminToken, "pairing");
    generatePairings(event.id);

    const response = await POST(
      jsonRequest({ token: event.adminToken }),
      params(event.id)
    );

    expect(response.status).toBe(400);
  });

  test("rejects a malformed body", async () => {
    const event = setupLockedEvent();

    const response = await POST(
      new Request("http://localhost/api/events/test/groups/draw", {
        method: "POST",
      }),
      params(event.id)
    );

    expect(response.status).toBe(400);
    expect(((await response.json()) as { error: string }).error).toBe(
      "Body permintaan tidak valid."
    );
  });

  test("returns a balanced stateless draw with a summary", async () => {
    const event = setupLockedEvent();
    const teams = getTeams(event.id);

    const response = await POST(
      jsonRequest({ token: event.adminToken }),
      params(event.id)
    );
    const body = (await response.json()) as {
      groups: string[][];
      summary: {
        teamCount: number;
        groupCount: number;
        groupSizes: number[];
        matchCount: number;
      };
    };

    expect(response.status).toBe(200);
    expect(body.groups.map((group) => group.length).sort()).toEqual([3, 3]);
    expect(body.groups.flat().sort()).toEqual(
      teams.map((team) => team.id).sort()
    );
    expect(body.summary).toEqual({
      teamCount: 6,
      groupCount: 2,
      groupSizes: [3, 3],
      matchCount: 6,
    });
  });
});
