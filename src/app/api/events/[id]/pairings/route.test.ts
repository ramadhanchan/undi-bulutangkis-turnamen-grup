import { describe, test, expect, beforeEach } from "bun:test";
import { resetDb } from "@/lib/db";
import { createEvent, getEvent } from "@/lib/events";
import { getTeams } from "@/lib/pairing";
import { registerParticipant } from "@/lib/participants";
import { PATCH, POST } from "./route";
import { POST as lockTeamsRoute } from "../lock-teams/route";

beforeEach(() => {
  process.env.DB_PATH = ":memory:";
  resetDb();
});

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function jsonRequest(body: unknown, method = "POST") {
  return new Request("http://localhost/api/events/test/pairings", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupEvent() {
  const event = createEvent("Event");
  for (let index = 0; index < 8; index++) {
    registerParticipant(event.id, `P${index}`);
  }
  return event;
}

describe("pairings API", () => {
  test("requires a valid admin token", async () => {
    const event = setupEvent();
    const response = await POST(jsonRequest({}), params(event.id));
    expect(response.status).toBe(403);
    expect(getTeams(event.id)).toEqual([]);
  });

  test("generates teams and moves the event to pairing", async () => {
    const event = setupEvent();

    const response = await POST(
      jsonRequest({ token: event.adminToken }),
      params(event.id)
    );

    expect(response.status).toBe(201);
    expect(getEvent(event.id)?.state).toBe("pairing");
    expect(getTeams(event.id)).toHaveLength(4);
  });

  test("re-shuffles and replaces the teams", async () => {
    const event = setupEvent();
    await POST(jsonRequest({ token: event.adminToken }), params(event.id));
    const firstIds = getTeams(event.id)
      .map((team) => team.id)
      .sort();

    const response = await POST(
      jsonRequest({ token: event.adminToken }),
      params(event.id)
    );
    const secondIds = getTeams(event.id)
      .map((team) => team.id)
      .sort();

    expect(response.status).toBe(201);
    expect(secondIds).not.toEqual(firstIds);
    expect(getEvent(event.id)?.state).toBe("pairing");
  });

  test("swaps participants between teams", async () => {
    const event = setupEvent();
    await POST(jsonRequest({ token: event.adminToken }), params(event.id));
    const [first, second] = getTeams(event.id);

    const response = await PATCH(
      jsonRequest(
        {
          token: event.adminToken,
          team1Id: first.id,
          player1Id: first.player1Id,
          team2Id: second.id,
          player2Id: second.player1Id,
        },
        "PATCH"
      ),
      params(event.id)
    );
    const updated = getTeams(event.id);

    expect(response.status).toBe(200);
    expect(updated.find((team) => team.id === first.id)?.player1Id).toBe(
      second.player1Id
    );
    expect(updated.find((team) => team.id === second.id)?.player1Id).toBe(
      first.player1Id
    );
  });

  test("rejects re-shuffle and swap after the lock", async () => {
    const event = setupEvent();
    await POST(jsonRequest({ token: event.adminToken }), params(event.id));
    const locked = await lockTeamsRoute(
      jsonRequest({ token: event.adminToken }),
      params(event.id)
    );
    expect(locked.status).toBe(200);

    const reshuffle = await POST(
      jsonRequest({ token: event.adminToken }),
      params(event.id)
    );
    const [first, second] = getTeams(event.id);
    const swap = await PATCH(
      jsonRequest(
        {
          token: event.adminToken,
          team1Id: first.id,
          player1Id: first.player1Id,
          team2Id: second.id,
          player2Id: second.player1Id,
        },
        "PATCH"
      ),
      params(event.id)
    );

    expect(reshuffle.status).toBe(400);
    expect(swap.status).toBe(400);
  });
});
