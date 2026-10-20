import { describe, test, expect, beforeEach } from "bun:test";
import { resetDb } from "@/lib/db";
import { createEvent, getEvent, transitionPhase } from "@/lib/events";
import { generatePairings, getTeams, lockTeams } from "@/lib/pairing";
import { registerParticipant } from "@/lib/participants";
import { getMatches } from "@/lib/schedule";
import { POST } from "./route";

beforeEach(() => {
  process.env.DB_PATH = ":memory:";
  resetDb();
});

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/events/test/groups/confirm", {
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

function validGroups(eventId: string) {
  const teams = getTeams(eventId);
  return [
    teams.slice(0, 3).map((team) => team.id),
    teams.slice(3, 6).map((team) => team.id),
  ];
}

describe("group confirm API", () => {
  test("requires a valid admin token", async () => {
    const event = setupLockedEvent();

    const response = await POST(
      jsonRequest({ groups: validGroups(event.id) }),
      params(event.id)
    );

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
      jsonRequest({
        token: event.adminToken,
        groups: validGroups(event.id),
      }),
      params(event.id)
    );

    expect(response.status).toBe(400);
  });

  test("rejects an invalid partition without changing the phase", async () => {
    const event = setupLockedEvent();
    const teams = getTeams(event.id);

    const response = await POST(
      jsonRequest({
        token: event.adminToken,
        groups: [
          teams.slice(0, 3).map((team) => team.id),
          teams.slice(3, 5).map((team) => team.id),
        ],
      }),
      params(event.id)
    );

    expect(response.status).toBe(400);
    expect(getEvent(event.id)?.state).toBe("pairing");
    expect(getMatches(event.id, "group")).toEqual([]);
  });

  test("rejects a malformed body", async () => {
    const event = setupLockedEvent();

    const response = await POST(
      new Request("http://localhost/api/events/test/groups/confirm", {
        method: "POST",
      }),
      params(event.id)
    );

    expect(response.status).toBe(400);
    expect(((await response.json()) as { error: string }).error).toBe(
      "Body permintaan tidak valid."
    );
  });

  test("confirms a valid partition and starts the group stage", async () => {
    const event = setupLockedEvent();
    const groups = validGroups(event.id);

    const response = await POST(
      jsonRequest({ token: event.adminToken, groups }),
      params(event.id)
    );
    const body = (await response.json()) as {
      success: boolean;
      state: string;
      summary: { matchCount: number };
    };

    expect(response.status).toBe(200);
    expect(body.state).toBe("group_stage");
    expect(body.summary.matchCount).toBe(6);
    expect(getEvent(event.id)?.state).toBe("group_stage");
    expect(
      getTeams(event.id)
        .map((team) => team.groupNumber)
        .sort()
    ).toEqual([1, 1, 1, 2, 2, 2]);
    expect(getMatches(event.id, "group")).toHaveLength(6);
  });

  test("rejects a second confirm", async () => {
    const event = setupLockedEvent();
    const groups = validGroups(event.id);
    await POST(
      jsonRequest({ token: event.adminToken, groups }),
      params(event.id)
    );

    const response = await POST(
      jsonRequest({ token: event.adminToken, groups }),
      params(event.id)
    );

    expect(response.status).toBe(400);
  });
});
