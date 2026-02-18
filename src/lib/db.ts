import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "tablesnipe.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS monitors (
      id TEXT PRIMARY KEY,
      restaurant_id TEXT NOT NULL,
      restaurant_name TEXT NOT NULL,
      party_size INTEGER NOT NULL DEFAULT 2,
      target_days TEXT NOT NULL DEFAULT '[]',
      target_time_start TEXT NOT NULL DEFAULT '19:00',
      target_time_end TEXT NOT NULL DEFAULT '21:00',
      weeks_ahead INTEGER NOT NULL DEFAULT 4,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      monitor_id TEXT NOT NULL,
      restaurant_name TEXT NOT NULL,
      date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      slot_hash TEXT,
      slot_token TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      twilio_message_sid TEXT,
      booking_confirmation TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS poll_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      monitor_id TEXT NOT NULL,
      polled_at TEXT NOT NULL DEFAULT (datetime('now')),
      slots_found INTEGER NOT NULL DEFAULT 0,
      error TEXT
    );
  `);

  return db;
}

// Settings helpers
export function getSetting(key: string): string | undefined {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value;
}

export function setSetting(key: string, value: string): void {
  getDb()
    .prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
    .run(key, value);
}

export function getAllSettings(): Record<string, string> {
  const rows = getDb().prepare("SELECT key, value FROM settings").all() as {
    key: string;
    value: string;
  }[];
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

// Monitor helpers
export interface Monitor {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  party_size: number;
  target_days: string;
  target_time_start: string;
  target_time_end: string;
  weeks_ahead: number;
  active: number;
  created_at: string;
}

export function getMonitors(): Monitor[] {
  return getDb().prepare("SELECT * FROM monitors ORDER BY created_at DESC").all() as Monitor[];
}

export function getActiveMonitors(): Monitor[] {
  return getDb()
    .prepare("SELECT * FROM monitors WHERE active = 1 ORDER BY created_at DESC")
    .all() as Monitor[];
}

export function getMonitor(id: string): Monitor | undefined {
  return getDb().prepare("SELECT * FROM monitors WHERE id = ?").get(id) as Monitor | undefined;
}

export function createMonitor(monitor: Omit<Monitor, "created_at">): Monitor {
  getDb()
    .prepare(
      `INSERT INTO monitors (id, restaurant_id, restaurant_name, party_size, target_days, target_time_start, target_time_end, weeks_ahead, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      monitor.id,
      monitor.restaurant_id,
      monitor.restaurant_name,
      monitor.party_size,
      monitor.target_days,
      monitor.target_time_start,
      monitor.target_time_end,
      monitor.weeks_ahead,
      monitor.active
    );
  return getMonitor(monitor.id)!;
}

export function updateMonitor(
  id: string,
  updates: Partial<Omit<Monitor, "id" | "created_at">>
): Monitor | undefined {
  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (updates.restaurant_id !== undefined) {
    fields.push("restaurant_id = ?");
    values.push(updates.restaurant_id);
  }
  if (updates.restaurant_name !== undefined) {
    fields.push("restaurant_name = ?");
    values.push(updates.restaurant_name);
  }
  if (updates.party_size !== undefined) {
    fields.push("party_size = ?");
    values.push(updates.party_size);
  }
  if (updates.target_days !== undefined) {
    fields.push("target_days = ?");
    values.push(updates.target_days);
  }
  if (updates.target_time_start !== undefined) {
    fields.push("target_time_start = ?");
    values.push(updates.target_time_start);
  }
  if (updates.target_time_end !== undefined) {
    fields.push("target_time_end = ?");
    values.push(updates.target_time_end);
  }
  if (updates.weeks_ahead !== undefined) {
    fields.push("weeks_ahead = ?");
    values.push(updates.weeks_ahead);
  }
  if (updates.active !== undefined) {
    fields.push("active = ?");
    values.push(updates.active);
  }

  if (fields.length === 0) return getMonitor(id);

  values.push(id);
  getDb()
    .prepare(`UPDATE monitors SET ${fields.join(", ")} WHERE id = ?`)
    .run(...values);

  return getMonitor(id);
}

export function deleteMonitor(id: string): boolean {
  const result = getDb().prepare("DELETE FROM monitors WHERE id = ?").run(id);
  return result.changes > 0;
}

// Alert helpers
export interface Alert {
  id: string;
  monitor_id: string;
  restaurant_name: string;
  date: string;
  time_slot: string;
  slot_hash: string | null;
  slot_token: string | null;
  status: string;
  twilio_message_sid: string | null;
  booking_confirmation: string | null;
  created_at: string;
  updated_at: string;
}

export function getAlerts(limit = 50): Alert[] {
  return getDb()
    .prepare("SELECT * FROM alerts ORDER BY created_at DESC LIMIT ?")
    .all(limit) as Alert[];
}

export function getAlertsByMonitor(monitorId: string): Alert[] {
  return getDb()
    .prepare("SELECT * FROM alerts WHERE monitor_id = ? ORDER BY created_at DESC")
    .all(monitorId) as Alert[];
}

export function getPendingAlerts(): Alert[] {
  return getDb()
    .prepare("SELECT * FROM alerts WHERE status = 'pending' ORDER BY created_at ASC")
    .all() as Alert[];
}

export function getAlertBySlot(monitorId: string, date: string, timeSlot: string): Alert | undefined {
  return getDb()
    .prepare(
      "SELECT * FROM alerts WHERE monitor_id = ? AND date = ? AND time_slot = ? AND status IN ('pending', 'confirmed')"
    )
    .get(monitorId, date, timeSlot) as Alert | undefined;
}

export function createAlert(alert: Omit<Alert, "created_at" | "updated_at">): Alert {
  getDb()
    .prepare(
      `INSERT INTO alerts (id, monitor_id, restaurant_name, date, time_slot, slot_hash, slot_token, status, twilio_message_sid, booking_confirmation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      alert.id,
      alert.monitor_id,
      alert.restaurant_name,
      alert.date,
      alert.time_slot,
      alert.slot_hash,
      alert.slot_token,
      alert.status,
      alert.twilio_message_sid,
      alert.booking_confirmation
    );
  return getDb().prepare("SELECT * FROM alerts WHERE id = ?").get(alert.id) as Alert;
}

export function updateAlertStatus(id: string, status: string, extra?: { twilio_message_sid?: string; booking_confirmation?: string }): void {
  const fields = ["status = ?", "updated_at = datetime('now')"];
  const values: (string | null)[] = [status];

  if (extra?.twilio_message_sid !== undefined) {
    fields.push("twilio_message_sid = ?");
    values.push(extra.twilio_message_sid);
  }
  if (extra?.booking_confirmation !== undefined) {
    fields.push("booking_confirmation = ?");
    values.push(extra.booking_confirmation);
  }

  values.push(id);
  getDb()
    .prepare(`UPDATE alerts SET ${fields.join(", ")} WHERE id = ?`)
    .run(...values);
}

// Poll log
export function logPoll(monitorId: string, slotsFound: number, error?: string): void {
  getDb()
    .prepare("INSERT INTO poll_log (monitor_id, slots_found, error) VALUES (?, ?, ?)")
    .run(monitorId, slotsFound, error ?? null);
}
