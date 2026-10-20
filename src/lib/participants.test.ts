import { describe, test, expect, beforeEach } from "bun:test";
import { resetDb } from "./db";
import { createEvent } from "./events";
import {
  registerParticipant,
  registerParticipants,
  getParticipants,
  getParticipantCount,
  canPair,
  validateParticipantName,
  renameParticipant,
  removeParticipant,
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

  test("throws on a duplicate name, case-insensitive", () => {
    const event = createEvent("Event");
    registerParticipant(event.id, "Alice");
    expect(() => registerParticipant(event.id, "alice")).toThrow();
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

  test("rejects an odd count", () => {
    const event = createEvent("Event");
    registerParticipant(event.id, "A");
    registerParticipant(event.id, "B");
    registerParticipant(event.id, "C");
    const result = canPair(event.id);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("genap");
  });

  test("rejects fewer than 6 participants", () => {
    const event = createEvent("Event");
    for (let i = 0; i < 4; i++) {
      registerParticipant(event.id, `P${i}`);
    }
    const result = canPair(event.id);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Minimal 6");
  });

  test("rejects 10 participants (5 teams)", () => {
    const event = createEvent("Event");
    for (let i = 0; i < 10; i++) {
      registerParticipant(event.id, `P${i}`);
    }
    const result = canPair(event.id);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("5 tim");
  });

  for (const count of [6, 8, 12, 14, 16]) {
    test(`accepts ${count} participants`, () => {
      const event = createEvent("Event");
      for (let i = 0; i < count; i++) {
        registerParticipant(event.id, `P${i}`);
      }
      expect(canPair(event.id).ok).toBe(true);
    });
  }
});

describe("registerParticipants", () => {
  test("adds valid names, ignores empty lines, and reports duplicates", () => {
    const event = createEvent("Event");
    const result = registerParticipants(event.id, [
      "Asep",
      "Budi",
      "asep",
      "  ",
      "Candra",
    ]);

    expect(result.created.map((participant) => participant.name)).toEqual([
      "Asep",
      "Budi",
      "Candra",
    ]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].name).toBe("asep");
    expect(getParticipantCount(event.id)).toBe(3);
  });

  test("reports existing duplicates", () => {
    const event = createEvent("Event");
    registerParticipant(event.id, "Asep");

    const result = registerParticipants(event.id, ["asep", "Budi"]);

    expect(result.created.map((participant) => participant.name)).toEqual(["Budi"]);
    expect(result.errors).toHaveLength(1);
  });

  test("reports invalid names without aborting the batch", () => {
    const event = createEvent("Event");
    const result = registerParticipants(event.id, ["", "A".repeat(51), "Budi"]);

    expect(result.created.map((participant) => participant.name)).toEqual(["Budi"]);
    expect(result.errors).toHaveLength(1);
  });
});

describe("renameParticipant", () => {
  test("renames a participant", () => {
    const event = createEvent("Event");
    const participant = registerParticipant(event.id, "Alice");

    const renamed = renameParticipant(event.id, participant.id, "Alicia");

    expect(renamed.name).toBe("Alicia");
    expect(getParticipants(event.id)[0].name).toBe("Alicia");
  });

  test("rejects a duplicate name", () => {
    const event = createEvent("Event");
    registerParticipant(event.id, "Alice");
    const bob = registerParticipant(event.id, "Bob");

    expect(() => renameParticipant(event.id, bob.id, "alice")).toThrow();
  });

  test("rejects a participant from another event", () => {
    const event = createEvent("Event");
    const other = createEvent("Other");
    const participant = registerParticipant(other.id, "Alice");

    expect(() => renameParticipant(event.id, participant.id, "Alicia")).toThrow();
  });
});

describe("removeParticipant", () => {
  test("removes a participant", () => {
    const event = createEvent("Event");
    const participant = registerParticipant(event.id, "Alice");

    expect(removeParticipant(event.id, participant.id)).toBe(true);
    expect(getParticipantCount(event.id)).toBe(0);
  });

  test("returns false for an unknown participant", () => {
    const event = createEvent("Event");
    expect(removeParticipant(event.id, "missing")).toBe(false);
  });
});