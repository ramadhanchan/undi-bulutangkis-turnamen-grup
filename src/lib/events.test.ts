import { describe, test, expect, beforeEach } from "bun:test";
import { resetDb } from "./db";
import {
  createEvent,
  getEvent,
  validateEventName,
  deleteEvent,
  transitionPhase,
  verifyAdminToken,
  regenerateAdminToken,
} from "./events";

beforeEach(() => {
  process.env.DB_PATH = ":memory:";
  resetDb();
});

describe("validateEventName", () => {
  test("returns null for valid name", () => {
    expect(validateEventName("Friday Badminton")).toBeNull();
  });

  test("returns error for empty name", () => {
    expect(validateEventName("")).not.toBeNull();
    expect(validateEventName("   ")).not.toBeNull();
  });

  test("returns error for name over 100 chars", () => {
    expect(validateEventName("a".repeat(101))).not.toBeNull();
  });
});

describe("createEvent", () => {
  test("creates event with name and admin token", () => {
    const event = createEvent("Test Event");
    expect(event.name).toBe("Test Event");
    expect(event.state).toBe("registration");
    expect(event.id).toBeTruthy();
    expect(event.adminToken).toBeTruthy();
  });

  test("trims name", () => {
    const event = createEvent("  Trimmed  ");
    expect(event.name).toBe("Trimmed");
  });

  test("throws on empty name", () => {
    expect(() => createEvent("")).toThrow();
  });

  test("admin token is unique per event", () => {
    const e1 = createEvent("Event 1");
    const e2 = createEvent("Event 2");
    expect(e1.adminToken).not.toBe(e2.adminToken);
    expect(e1.id).not.toBe(e2.id);
  });
});

describe("getEvent", () => {
  test("returns event by id", () => {
    const created = createEvent("My Event");
    const fetched = getEvent(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.name).toBe("My Event");
    expect(fetched!.adminToken).toBe(created.adminToken);
  });

  test("returns null for unknown id", () => {
    expect(getEvent("nonexistent")).toBeNull();
  });
});

describe("verifyAdminToken", () => {
  test("returns true for correct token", () => {
    const event = createEvent("Event");
    expect(verifyAdminToken(event.id, event.adminToken)).toBe(true);
  });

  test("returns false for wrong token", () => {
    const event = createEvent("Event");
    expect(verifyAdminToken(event.id, "wrong-token")).toBe(false);
  });

  test("returns false for unknown event", () => {
    expect(verifyAdminToken("nonexistent", "token")).toBe(false);
  });
});

describe("deleteEvent", () => {
  test("deletes event with correct token", () => {
    const event = createEvent("Event");
    const deleted = deleteEvent(event.id, event.adminToken);
    expect(deleted).toBe(true);
    expect(getEvent(event.id)).toBeNull();
  });

  test("rejects deletion with wrong token", () => {
    const event = createEvent("Event");
    const deleted = deleteEvent(event.id, "wrong-token");
    expect(deleted).toBe(false);
    expect(getEvent(event.id)).not.toBeNull();
  });
});

describe("transitionPhase", () => {
  test("transitions registration -> pairing", () => {
    const event = createEvent("Event");
    const updated = transitionPhase(event.id, event.adminToken, "pairing");
    expect(updated.state).toBe("pairing");
  });

  test("rejects invalid transition", () => {
    const event = createEvent("Event");
    expect(() =>
      transitionPhase(event.id, event.adminToken, "knockout")
    ).toThrow();
  });

  test("rejects with wrong token", () => {
    const event = createEvent("Event");
    expect(() =>
      transitionPhase(event.id, "wrong-token", "pairing")
    ).toThrow();
  });

  test("allows full lifecycle", () => {
    const event = createEvent("Event");
    transitionPhase(event.id, event.adminToken, "pairing");
    transitionPhase(event.id, event.adminToken, "group_stage");
    transitionPhase(event.id, event.adminToken, "knockout");
    const final = transitionPhase(event.id, event.adminToken, "finished");
    expect(final.state).toBe("finished");
  });
});

describe("regenerateAdminToken", () => {
  test("returns a new token and invalidates the old one", () => {
    const event = createEvent("Event");
    const oldToken = event.adminToken;

    const newToken = regenerateAdminToken(event.id, oldToken);

    expect(newToken).toBeTruthy();
    expect(newToken).not.toBe(oldToken);
    expect(verifyAdminToken(event.id, oldToken)).toBe(false);
    expect(verifyAdminToken(event.id, newToken)).toBe(true);
  });

  test("keeps the event and its state intact", () => {
    const event = createEvent("Event");
    transitionPhase(event.id, event.adminToken, "pairing");

    const newToken = regenerateAdminToken(event.id, event.adminToken);
    const updated = getEvent(event.id)!;

    expect(updated.name).toBe("Event");
    expect(updated.state).toBe("pairing");
    expect(updated.adminToken).toBe(newToken);
  });

  test("rejects a wrong token", () => {
    const event = createEvent("Event");
    const oldToken = event.adminToken;

    expect(() => regenerateAdminToken(event.id, "wrong-token")).toThrow();
    expect(verifyAdminToken(event.id, oldToken)).toBe(true);
  });

  test("rejects an unknown event", () => {
    expect(() => regenerateAdminToken("nonexistent", "token")).toThrow();
  });
});