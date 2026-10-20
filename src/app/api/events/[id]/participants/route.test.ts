import { describe, test, expect, beforeEach } from "bun:test";
import { resetDb } from "@/lib/db";
import { createEvent, transitionPhase } from "@/lib/events";
import { getParticipants } from "@/lib/participants";
import { DELETE, GET, PATCH, POST } from "./route";

beforeEach(() => {
  process.env.DB_PATH = ":memory:";
  resetDb();
});

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function jsonRequest(body: unknown, method = "POST") {
  return new Request("http://localhost/api/events/test/participants", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("participants API", () => {
  test("GET is public", async () => {
    const event = createEvent("Event");
    await POST(
      jsonRequest({ token: event.adminToken, name: "Asep" }),
      params(event.id)
    );

    const response = await GET(new Request("http://localhost"), params(event.id));
    const body = (await response.json()) as { id: string; name: string }[];

    expect(response.status).toBe(200);
    expect(body).toEqual([{ id: expect.any(String), name: "Asep" }]);
  });

  test("POST requires a valid admin token", async () => {
    const event = createEvent("Event");

    const missing = await POST(
      jsonRequest({ name: "Asep" }),
      params(event.id)
    );
    const invalid = await POST(
      jsonRequest({ token: "wrong", name: "Asep" }),
      params(event.id)
    );

    expect(missing.status).toBe(403);
    expect(invalid.status).toBe(403);
    expect(getParticipants(event.id)).toEqual([]);
  });

  test("PATCH requires a valid admin token", async () => {
    const event = createEvent("Event");

    const response = await PATCH(
      jsonRequest({ participantId: "missing", name: "Asep" }, "PATCH"),
      params(event.id)
    );

    expect(response.status).toBe(403);
  });

  test("POST adds a single participant", async () => {
    const event = createEvent("Event");

    const response = await POST(
      jsonRequest({ token: event.adminToken, name: "  Asep  " }),
      params(event.id)
    );
    const body = (await response.json()) as { id: string; name: string };

    expect(response.status).toBe(201);
    expect(body.name).toBe("Asep");
    expect(getParticipants(event.id).map((participant) => participant.name)).toEqual([
      "Asep",
    ]);
  });

  test("POST bulk ignores empty lines and reports duplicates per line", async () => {
    const event = createEvent("Event");

    const response = await POST(
      jsonRequest({
        token: event.adminToken,
        names: ["Asep", "Budi", "asep", "  ", "Candra"],
      }),
      params(event.id)
    );
    const body = (await response.json()) as {
      created: { name: string }[];
      errors: { name: string; message: string }[];
    };

    expect(response.status).toBe(201);
    expect(body.created.map((participant) => participant.name)).toEqual([
      "Asep",
      "Budi",
      "Candra",
    ]);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].name).toBe("asep");
  });

  test("POST bulk returns per-line errors when no line can be added", async () => {
    const event = createEvent("Event");

    const response = await POST(
      jsonRequest({
        token: event.adminToken,
        names: ["", "   ", "A".repeat(51)],
      }),
      params(event.id)
    );
    const body = (await response.json()) as {
      errors: { name: string; message: string }[];
      error?: string;
    };

    expect(response.status).toBe(400);
    expect(body.errors).toHaveLength(1);
    expect(body.error).toBeUndefined();
  });

  test("POST is closed after registration", async () => {
    const event = createEvent("Event");
    transitionPhase(event.id, event.adminToken, "pairing");

    const response = await POST(
      jsonRequest({ token: event.adminToken, name: "Asep" }),
      params(event.id)
    );

    expect(response.status).toBe(400);
  });

  test("PATCH and DELETE are closed after registration", async () => {
    const event = createEvent("Event");
    const created = await POST(
      jsonRequest({ token: event.adminToken, name: "Asep" }),
      params(event.id)
    );
    const createdBody = (await created.json()) as { id: string };
    transitionPhase(event.id, event.adminToken, "pairing");

    const renamed = await PATCH(
      jsonRequest(
        {
          token: event.adminToken,
          participantId: createdBody.id,
          name: "Asep K",
        },
        "PATCH"
      ),
      params(event.id)
    );
    const removed = await DELETE(
      new Request(
        `http://localhost/api/events/${event.id}/participants?token=${event.adminToken}&participantId=${createdBody.id}`,
        { method: "DELETE" }
      ),
      params(event.id)
    );

    expect(renamed.status).toBe(400);
    expect(removed.status).toBe(400);
  });

  test("PATCH renames a participant and rejects duplicates", async () => {
    const event = createEvent("Event");
    const first = await POST(
      jsonRequest({ token: event.adminToken, name: "Asep" }),
      params(event.id)
    );
    const firstBody = (await first.json()) as { id: string };
    await POST(
      jsonRequest({ token: event.adminToken, name: "Budi" }),
      params(event.id)
    );

    const renamed = await PATCH(
      jsonRequest(
        {
          token: event.adminToken,
          participantId: firstBody.id,
          name: "Asep Kurnia",
        },
        "PATCH"
      ),
      params(event.id)
    );
    const duplicate = await PATCH(
      jsonRequest(
        { token: event.adminToken, participantId: firstBody.id, name: "budi" },
        "PATCH"
      ),
      params(event.id)
    );

    expect(renamed.status).toBe(200);
    expect(duplicate.status).toBe(400);
    expect(
      getParticipants(event.id).map((participant) => participant.name)
    ).toEqual(["Asep Kurnia", "Budi"]);
  });

  test("DELETE removes a participant and requires a token", async () => {
    const event = createEvent("Event");
    const created = await POST(
      jsonRequest({ token: event.adminToken, name: "Asep" }),
      params(event.id)
    );
    const createdBody = (await created.json()) as { id: string };

    const missingToken = await DELETE(
      new Request(
        `http://localhost/api/events/${event.id}/participants?participantId=${createdBody.id}`,
        { method: "DELETE" }
      ),
      params(event.id)
    );
    const removed = await DELETE(
      new Request(
        `http://localhost/api/events/${event.id}/participants?token=${event.adminToken}&participantId=${createdBody.id}`,
        { method: "DELETE" }
      ),
      params(event.id)
    );

    expect(missingToken.status).toBe(403);
    expect(removed.status).toBe(200);
    expect(getParticipants(event.id)).toEqual([]);
  });
});
