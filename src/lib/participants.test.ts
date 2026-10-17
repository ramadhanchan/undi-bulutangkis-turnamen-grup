import { describe, test, expect, beforeEach } from "bun:test";
import { resetDb } from "./db";
import { createEvent } from "./events";
import {
  registerParticipant,
  getParticipants,
  getParticipantCount,
  canPair,
  validateParticipantName,
} from "./participants";

beforeEach(() => {
  process.env.DB_PATH = ":memory:";
  resetDb();
});

describe("validateParticipantName", () => {
  test("returns null for valid name", () => {
    expect(validateParticipantName("Alice")).toBeNull();
  });

  test("returns error for empty name", () => {
    expect(validateParticipantName("")).not.toBeNull();
    expect(validateParticipantName("   ")).not.toBeNull();
  });

  test("returns error for name over 50 chars", () => {
    expect(validateParticipantName("a".repeat(51))).not.toBeNull();
  });
});

describe("registerParticipant", () => {
  test("registers a participant", () => {
    const event = createEvent("Event");
    const p = registerParticipant(event.id, "Alice");
    expect(p.name).toBe("Alice");
    expect(p.id).toBeTruthy();
    expect(p.eventId).toBe(event.id);
  });

  test("trims name", () => {
    const event = createEvent("Event");
    const p = registerParticipant(event.id, "  Bob  ");
    expect(p.name).toBe("Bob");
  });

  test("throws on empty name", () => {
    const event = createEvent("Event");
    expect(() => registerParticipant(event.id, "")).toThrow();
  });

  test("throws on duplicate? no, allows same name", () => {
    const event = createEvent("Event");
    registerParticipant(event.id, "Alice");
    const p2 = registerParticipant(event.id, "Alice");
    expect(p2.name).toBe("Alice");
  });
});

describe("getParticipants", () => {
  test("returns empty list for new event", () => {
    const event = createEvent("Event");
    expect(getParticipants(event.id)).toEqual([]);
  });

  test("returns registered participants", () => {
    const event = createEvent("Event");
    registerParticipant(event.id, "Alice");
    registerParticipant(event.id, "Bob");
    const list = getParticipants(event.id);
    expect(list.length).toBe(2);
    expect(list.map((p) => p.name)).toContain("Alice");
    expect(list.map((p) => p.name)).toContain("Bob");
  });
});

describe("getParticipantCount", () => {
  test("returns 0 for new event", () => {
    const event = createEvent("Event");
    expect(getParticipantCount(event.id)).toBe(0);
  });

  test("returns correct count", () => {
    const event = createEvent("Event");
    registerParticipant(event.id, "A");
    registerParticipant(event.id, "B");
    registerParticipant(event.id, "C");
    registerParticipant(event.id, "D");
    expect(getParticipantCount(event.id)).toBe(4);
  });
});

describe("canPair", () => {
  test("rejects empty", () => {
    const event = createEvent("Event");
    const result = canPair(event.id);
    expect(result.ok).toBe(false);
  });

  test("rejects non-multiple of 4", () => {
    const event = createEvent("Event");
    registerParticipant(event.id, "A");
    registerParticipant(event.id, "B");
    registerParticipant(event.id, "C");
    const result = canPair(event.id);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("multiple of 4");
  });

  test("accepts multiple of 4", () => {
    const event = createEvent("Event");
    for (let i = 0; i < 8; i++) {
      registerParticipant(event.id, `P${i}`);
    }
    const result = canPair(event.id);
    expect(result.ok).toBe(true);
  });
});