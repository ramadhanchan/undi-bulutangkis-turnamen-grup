import { randomUUID } from "crypto";
import { getDb } from "./db";
import type { Event, EventState } from "./types";

const VALID_TRANSITIONS: Record<EventState, EventState[]> = {
  registration: ["pairing"],
  pairing: ["group_stage"],
  group_stage: ["knockout"],
  knockout: ["finished"],
  finished: [],
};

export function validateEventName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "Event name is required";
  if (trimmed.length > 100) return "Event name must be 100 characters or less";
  return null;
}

export function createEvent(name: string): Event {
  const error = validateEventName(name);
  if (error) throw new Error(error);

  const db = getDb();
  const id = randomUUID();
  const adminToken = randomUUID();
  const trimmed = name.trim();

  db.run(
    "INSERT INTO events (id, name, admin_token, state) VALUES (?, ?, ?, 'registration')",
    [id, trimmed, adminToken]
  );

  return getEvent(id)!;
}

export function getEvent(id: string): Event | null {
  const db = getDb();
  const row = db
    .query("SELECT id, name, admin_token, state, created_at, updated_at FROM events WHERE id = ?")
    .get(id) as {
      id: string;
      name: string;
      admin_token: string;
      state: string;
      created_at: string;
      updated_at: string;
    } | null;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    adminToken: row.admin_token,
    state: row.state as EventState,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function verifyAdminToken(eventId: string, token: string): boolean {
  const event = getEvent(eventId);
  if (!event) return false;
  return event.adminToken === token;
}

export function deleteEvent(eventId: string, adminToken: string): boolean {
  if (!verifyAdminToken(eventId, adminToken)) return false;
  const db = getDb();
  db.run("DELETE FROM events WHERE id = ?", [eventId]);
  return true;
}

export function transitionPhase(
  eventId: string,
  adminToken: string,
  targetState: EventState
): Event {
  if (!verifyAdminToken(eventId, adminToken)) {
    throw new Error("Invalid admin token");
  }
  const event = getEvent(eventId);
  if (!event) throw new Error("Event not found");

  const allowed = VALID_TRANSITIONS[event.state];
  if (!allowed.includes(targetState)) {
    throw new Error(
      `Cannot transition from ${event.state} to ${targetState}`
    );
  }

  const db = getDb();
  db.run(
    "UPDATE events SET state = ?, updated_at = datetime('now') WHERE id = ?",
    [targetState, eventId]
  );
  return getEvent(eventId)!;
}

export function regenerateAdminToken(eventId: string, currentToken: string): string {
  if (!verifyAdminToken(eventId, currentToken)) {
    throw new Error("Invalid admin token");
  }
  const newToken = randomUUID();
  const db = getDb();
  db.run("UPDATE events SET admin_token = ?, updated_at = datetime('now') WHERE id = ?", [
    newToken,
    eventId,
  ]);
  return newToken;
}