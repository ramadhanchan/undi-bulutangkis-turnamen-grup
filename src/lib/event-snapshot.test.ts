import { describe, test, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { getDb, resetDb } from "./db";
import { createEvent, transitionPhase } from "./events";
import { registerParticipant } from "./participants";
import { generatePairings, getTeams } from "./pairing";
import {
  drawGroupAssignments,
  generateGroupStage,
  getMatches,
} from "./schedule";
import { recordMatchScore } from "./scoring";
import { generateKnockoutBracket } from "./bracket";
import { buildEventSnapshot } from "./event-snapshot";
import { flowInputFromSnapshot } from "./event-flow";

beforeEach(() => {
  process.env.DB_PATH = ":memory:";
  resetDb();
});

function setupEvent() {
  const event = createEvent("Event");
  for (let index = 0; index < 8; index++) {
    registerParticipant(event.id, `P${index}`);
  }
  transitionPhase(event.id, event.adminToken, "pairing");
  generatePairings(event.id);
  transitionPhase(event.id, event.adminToken, "group_stage");
  generateGroupStage(
    event.id,
    drawGroupAssignments(getTeams(event.id).map((team) => team.id))
  );

  for (const match of getMatches(event.id, "group")) {
    recordMatchScore(match.id, [
      { t1: 21, t2: 19 },
      { t1: 21, t2: 15 },
    ]);
  }

  transitionPhase(event.id, event.adminToken, "knockout");
  generateKnockoutBracket(event.id);
  return event;
}

function setupGroupStage() {
  const event = createEvent("Event");
  for (let index = 0; index < 16; index++) {
    registerParticipant(event.id, `P${index}`);
  }
  transitionPhase(event.id, event.adminToken, "pairing");
  generatePairings(event.id);
  transitionPhase(event.id, event.adminToken, "group_stage");
  generateGroupStage(
    event.id,
    drawGroupAssignments(getTeams(event.id).map((team) => team.id))
  );
  return event;
}

describe("schema", () => {
  test("adds teams_locked and position to existing tables", () => {
    const db = getDb();
    const eventColumns = db.query("PRAGMA table_info(events)").all() as { name: string }[];
    const matchColumns = db.query("PRAGMA table_info(matches)").all() as { name: string }[];

    expect(eventColumns.map((column) => column.name)).toContain("teams_locked");
    expect(matchColumns.map((column) => column.name)).toContain("position");
  });

  test("migrates a database created before the new columns", () => {
    const directory = mkdtempSync(join(tmpdir(), "badminton-migration-"));
    const dbPath = join(directory, "old.db");
    const old = new Database(dbPath);
    old.exec(`
      CREATE TABLE events (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        admin_token TEXT NOT NULL UNIQUE,
        state TEXT NOT NULL DEFAULT 'registration',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE participants (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE teams (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        player1_id TEXT NOT NULL,
        player2_id TEXT NOT NULL,
        group_number INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE matches (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        team1_id TEXT,
        team2_id TEXT,
        phase TEXT NOT NULL,
        group_number INTEGER,
        round INTEGER NOT NULL DEFAULT 1,
        set1_t1 INTEGER,
        set1_t2 INTEGER,
        set2_t1 INTEGER,
        set2_t2 INTEGER,
        set3_t1 INTEGER,
        set3_t2 INTEGER,
        winner_team_id TEXT,
        is_walkover INTEGER NOT NULL DEFAULT 0,
        played_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    old.close();

    process.env.DB_PATH = dbPath;
    resetDb();

    const db = getDb();
    const eventColumns = db.query("PRAGMA table_info(events)").all() as { name: string }[];
    const matchColumns = db.query("PRAGMA table_info(matches)").all() as { name: string }[];

    expect(eventColumns.map((column) => column.name)).toContain("teams_locked");
    expect(matchColumns.map((column) => column.name)).toContain("position");

    resetDb();
    rmSync(directory, { recursive: true, force: true });
  });
});

describe("buildEventSnapshot", () => {
  test("returns the complete event snapshot", () => {
    const event = setupEvent();
    const snapshot = buildEventSnapshot(event.id);

    expect(snapshot).not.toBeNull();
    if (!snapshot) return;

    expect(snapshot.id).toBe(event.id);
    expect(snapshot.state).toBe("knockout");
    expect(snapshot.teamsLocked).toBe(false);
    expect(snapshot.participants.length).toBe(8);
    expect(snapshot.teams.length).toBe(4);
    expect(snapshot.matches.length).toBe(7);
    expect(snapshot.bracket.length).toBe(1);
    expect(snapshot.bracket[0].slots.length).toBe(1);
    expect(snapshot.champion).toBeNull();

    for (const match of snapshot.matches) {
      expect("position" in match).toBe(true);
    }
  });

  test("previews the bracket from current standings before knockout", () => {
    const event = setupGroupStage();
    const snapshot = buildEventSnapshot(event.id);
    if (!snapshot) throw new Error("snapshot missing");

    expect(snapshot.state).toBe("group_stage");
    expect(snapshot.bracket).toEqual([]);
    expect(snapshot.previewBracket.length).toBe(2);
    expect(snapshot.previewBracket[0].slots.length).toBe(2);
    expect(snapshot.previewBracket[1].slots.length).toBe(1);
    expect(snapshot.previewBracket[0].slots[0].team1).not.toBeNull();
    expect(snapshot.previewBracket[0].slots[0].team2).not.toBeNull();
    expect(snapshot.previewBracket[1].slots[0].team1).toBeNull();
    expect(snapshot.previewBracket[1].slots[0].team2).toBeNull();
  });

  test("maps snapshot counts into the flow input", () => {
    const event = setupEvent();
    const snapshot = buildEventSnapshot(event.id);
    if (!snapshot) throw new Error("snapshot missing");

    const flow = flowInputFromSnapshot(snapshot);

    expect(flow.state).toBe("knockout");
    expect(flow.participantCount).toBe(8);
    expect(flow.teamCount).toBe(4);
    expect(flow.groupMatchCount).toBe(6);
    expect(flow.completedGroupMatchCount).toBe(6);
  });

  test("returns null for an unknown event", () => {
    expect(buildEventSnapshot("missing")).toBeNull();
  });
});
