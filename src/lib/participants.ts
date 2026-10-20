import { randomUUID } from "crypto";
import { getDb } from "./db";
import { validateRoster } from "./event-flow";
import type { Participant } from "./types";

interface ParticipantRow {
  id: string;
  event_id: string;
  name: string;
  created_at: string;
}

export interface BulkRegistrationError {
  name: string;
  message: string;
}

export interface BulkRegistrationResult {
  created: Participant[];
  errors: BulkRegistrationError[];
}

function toParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export function validateParticipantName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "Nama peserta wajib diisi";
  if (trimmed.length > 50) return "Nama peserta maksimal 50 karakter";
  return null;
}

export function getParticipant(
  eventId: string,
  participantId: string
): Participant | null {
  const db = getDb();
  const row = db
    .query(
      "SELECT id, event_id, name, created_at FROM participants WHERE id = ? AND event_id = ?"
    )
    .get(participantId, eventId) as ParticipantRow | null;
  return row ? toParticipant(row) : null;
}

export function findParticipantByName(
  eventId: string,
  name: string,
  excludeId?: string
): Participant | null {
  const db = getDb();
  const trimmed = name.trim();
  const row = excludeId
    ? (db
        .query(
          "SELECT id, event_id, name, created_at FROM participants WHERE event_id = ? AND LOWER(name) = LOWER(?) AND id != ? LIMIT 1"
        )
        .get(eventId, trimmed, excludeId) as ParticipantRow | null)
    : (db
        .query(
          "SELECT id, event_id, name, created_at FROM participants WHERE event_id = ? AND LOWER(name) = LOWER(?) LIMIT 1"
        )
        .get(eventId, trimmed) as ParticipantRow | null);
  return row ? toParticipant(row) : null;
}

export function registerParticipant(eventId: string, name: string): Participant {
  const error = validateParticipantName(name);
  if (error) throw new Error(error);

  const trimmed = name.trim();
  if (findParticipantByName(eventId, trimmed)) {
    throw new Error("Nama peserta sudah terdaftar");
  }

  const db = getDb();
  const id = randomUUID();

  db.run("INSERT INTO participants (id, event_id, name) VALUES (?, ?, ?)", [
    id,
    eventId,
    trimmed,
  ]);

  return getParticipant(eventId, id)!;
}

export function registerParticipants(
  eventId: string,
  names: string[]
): BulkRegistrationResult {
  const created: Participant[] = [];
  const errors: BulkRegistrationError[] = [];
  const seen = new Set<string>();

  for (const raw of names) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;

    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      errors.push({ name: trimmed, message: "Duplikat dalam daftar" });
      continue;
    }
    seen.add(key);

    try {
      created.push(registerParticipant(eventId, trimmed));
    } catch (error) {
      errors.push({
        name: trimmed,
        message:
          error instanceof Error ? error.message : "Gagal menambahkan peserta",
      });
    }
  }

  return { created, errors };
}

export function getParticipants(eventId: string): Participant[] {
  const db = getDb();
  const rows = db
    .query(
      "SELECT id, event_id, name, created_at FROM participants WHERE event_id = ? ORDER BY created_at"
    )
    .all(eventId) as ParticipantRow[];

  return rows.map(toParticipant);
}

export function getParticipantCount(eventId: string): number {
  const db = getDb();
  const row = db
    .query("SELECT COUNT(*) as count FROM participants WHERE event_id = ?")
    .get(eventId) as { count: number };
  return row.count;
}

export function renameParticipant(
  eventId: string,
  participantId: string,
  name: string
): Participant {
  const error = validateParticipantName(name);
  if (error) throw new Error(error);

  const participant = getParticipant(eventId, participantId);
  if (!participant) throw new Error("Peserta tidak ditemukan");

  const trimmed = name.trim();
  if (findParticipantByName(eventId, trimmed, participantId)) {
    throw new Error("Nama peserta sudah terdaftar");
  }

  const db = getDb();
  db.run("UPDATE participants SET name = ? WHERE id = ? AND event_id = ?", [
    trimmed,
    participantId,
    eventId,
  ]);

  return getParticipant(eventId, participantId)!;
}

export function removeParticipant(
  eventId: string,
  participantId: string
): boolean {
  const participant = getParticipant(eventId, participantId);
  if (!participant) return false;

  const db = getDb();
  db.run("DELETE FROM participants WHERE id = ? AND event_id = ?", [
    participantId,
    eventId,
  ]);
  return true;
}

export function canPair(eventId: string): { ok: boolean; reason?: string } {
  const roster = validateRoster(getParticipantCount(eventId));
  return roster.valid
    ? { ok: true }
    : { ok: false, reason: roster.messages[0] };
}
