import { describe, test, expect, beforeEach } from "bun:test";
import { resetDb } from "@/lib/db";
import { createEvent, getEvent } from "@/lib/events";
import { registerParticipant } from "@/lib/participants";
import { POST as pairingsPost } from "../pairings/route";
import { POST } from "./route";

beforeEach(() => {
  process.env.DB_PATH = ":memory:";
  resetDb();
});

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/events/test/lock-teams", {
    method: "POST",
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

describe("lock-teams API", () => {
  test("requires a valid admin token", async () => {
    const event = setupEvent();

    const response = await POST(jsonRequest({}), params(event.id));

    expect(response.status).toBe(403);
    expect(getEvent(event.id)?.teamsLocked).toBe(false);
  });

  test("requires the pairing phase and existing teams", async () => {
    const event = setupEvent();

    const response = await POST(
      jsonRequest({ token: event.adminToken }),
      params(event.id)
    );

    expect(response.status).toBe(400);
  });

  test("locks the teams", async () => {
    const event = setupEvent();
    await pairingsPost(
      jsonRequest({ token: event.adminToken }),
      params(event.id)
    );

    const response = await POST(
      jsonRequest({ token: event.adminToken }),
      params(event.id)
    );

    expect(response.status).toBe(200);
    expect(getEvent(event.id)?.teamsLocked).toBe(true);
  });

  test("rejects a second lock", async () => {
    const event = setupEvent();
    await pairingsPost(
      jsonRequest({ token: event.adminToken }),
      params(event.id)
    );
    await POST(jsonRequest({ token: event.adminToken }), params(event.id));

    const response = await POST(
      jsonRequest({ token: event.adminToken }),
      params(event.id)
    );

    expect(response.status).toBe(400);
  });
});
