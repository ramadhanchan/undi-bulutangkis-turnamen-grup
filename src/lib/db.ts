import { Database } from "bun:sqlite";
import path from "path";
import { mkdirSync, existsSync } from "fs";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "tournament.db");

let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA foreign_keys = ON;");
    initSchema(db);
  }
  return db;
}

function initSchema(database: Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      admin_token TEXT NOT NULL UNIQUE,
      state TEXT NOT NULL DEFAULT 'registration',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      player1_id TEXT NOT NULL REFERENCES participants(id),
      player2_id TEXT NOT NULL REFERENCES participants(id),
      group_number INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      team1_id TEXT REFERENCES teams(id),
      team2_id TEXT REFERENCES teams(id),
      phase TEXT NOT NULL,
      group_number INTEGER,
      round INTEGER NOT NULL DEFAULT 1,
      set1_t1 INTEGER,
      set1_t2 INTEGER,
      set2_t1 INTEGER,
      set2_t2 INTEGER,
      set3_t1 INTEGER,
      set3_t2 INTEGER,
      winner_team_id TEXT REFERENCES teams(id),
      is_walkover INTEGER NOT NULL DEFAULT 0,
      played_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

// For testing: allow resetting the DB instance
export function resetDb() {
  closeDb();
}