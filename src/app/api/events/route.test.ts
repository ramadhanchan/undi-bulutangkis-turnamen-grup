import { beforeEach, describe, expect, test } from "bun:test";
import { resetDb } from "@/lib/db";
import { getEvent } from "@/lib/events";
import { POST } from "./route";

beforeEach(() => {
  process.env.DB_PATH = ":memory:";
  resetDb();
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("events API", () => {
  test("creates an event and returns the Admin Link", async () => {
    const response = await POST(jsonRequest({ name: "  Friday Badminton  " }));
    const body = (await response.json()) as {
      id: string;
      name: string;
      state: string;
      adminToken: string;
      adminUrl: string;
    };

    expect(response.status).toBe(201);
    expect(body.name).toBe("Friday Badminton");
    expect(body.state).toBe("registration");
    expect(body.adminUrl).toBe(`/event/${body.id}/admin/${body.adminToken}`);

    const event = getEvent(body.id);
    expect(event?.adminToken).toBe(body.adminToken);
    expect(event?.state).toBe("registration");
  });

  test("rejects an empty name", async () => {
    const response = await POST(jsonRequest({ name: "   " }));
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Nama event wajib diisi");
  });

  test("rejects a malformed body", async () => {
    const response = await POST(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not json",
      })
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("Body permintaan tidak valid.");
  });
});
