import { randomUUID } from "crypto";
import { getDb } from "./db";
import type { Participant } from "./types";

export function validateParticipantName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "Participant name is required";
  if (trimmed.length > 50) return "Name must be 50 characters or less";
  return null;
}

export function registerParticipant(eventId: string, name: string): Participant {
  const error = validateParticipantName(name);
  if (error) throw new Error(error);

  const db = getDb();
  const id = randomUUID();
  const trimmed = name.trim();

  db.run("INSERT INTO participants (id, event_id, name) VALUES (?, ?, ?)", [
    id,
    eventId,
    trimmed,
  ]);

  const row = db
    .query("SELECT id, event_id, name, created_at FROM participants WHERE id = ?")
    .get(id) as { id: string; event_id: string; name: string; created_at: string };

  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export function getParticipants(eventId: string): Participant[] {
  const db = getDb();
  const rows = db
    .query("SELECT id, event_id, name, created_at FROM participants WHERE event_id = ? ORDER BY created_at")
    .all(eventId) as { id: string; event_id: string; name: string; created_at: string }[];

  return rows.map((r) => ({
    id: r.id,
    eventId: r.event_id,
    name: r.name,
    createdAt: r.created_at,
  }));
}

export function getParticipantCount(eventId: string): number {
  const db = getDb();
  const row = db
    .query("SELECT COUNT(*) as count FROM participants WHERE event_id = ?")
    .get(eventId) as { count: number };
  return row.count;
}

export function canPair(eventId: string): { ok: boolean; reason?: string } {
  const count = getParticipantCount(eventId);
  if (count === 0) return { ok: false, reason: "No participants registered" };
  // A group needs 4 teams = 8 participants; require complete groups.
  // (Spec wording says "multiple of 4" but the tournament format needs groups of 4 teams.)
  if (count % 8 !== 0) {
    return {
      ok: false,
      reason: `Participant count must be a multiple of 8 (currently ${count}) so teams form complete groups of 4 (8 participants = 1 group)`,
    };
  }
  return { ok: true };
}