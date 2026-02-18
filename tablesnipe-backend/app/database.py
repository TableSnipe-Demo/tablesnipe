import aiosqlite
import json
import os
from datetime import datetime

DB_PATH = os.getenv("DB_PATH", "tablesnipe.db")


async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    return db


async def init_db():
    db = await get_db()
    try:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                twilio_account_sid TEXT DEFAULT '',
                twilio_auth_token TEXT DEFAULT '',
                twilio_phone_number TEXT DEFAULT '',
                user_phone_number TEXT DEFAULT '',
                webhook_base_url TEXT DEFAULT '',
                updated_at TEXT DEFAULT (datetime('now'))
            );

            INSERT OR IGNORE INTO settings (id) VALUES (1);

            CREATE TABLE IF NOT EXISTS monitors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                restaurant_id TEXT NOT NULL,
                restaurant_name TEXT NOT NULL,
                party_size INTEGER NOT NULL DEFAULT 2,
                days_of_week TEXT NOT NULL DEFAULT '[]',
                time_start TEXT NOT NULL DEFAULT '18:00',
                time_end TEXT NOT NULL DEFAULT '21:00',
                weeks_ahead INTEGER NOT NULL DEFAULT 4,
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                monitor_id INTEGER NOT NULL,
                restaurant_name TEXT NOT NULL,
                slot_datetime TEXT NOT NULL,
                party_size INTEGER NOT NULL,
                slot_hash TEXT DEFAULT '',
                slot_token TEXT DEFAULT '',
                status TEXT NOT NULL DEFAULT 'pending',
                sms_sid TEXT DEFAULT '',
                created_at TEXT DEFAULT (datetime('now')),
                responded_at TEXT,
                FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS poll_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                monitor_id INTEGER NOT NULL,
                slots_found INTEGER NOT NULL DEFAULT 0,
                polled_at TEXT DEFAULT (datetime('now')),
                error TEXT DEFAULT '',
                FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
            );
        """)
        await db.commit()
    finally:
        await db.close()


def row_to_dict(row: aiosqlite.Row) -> dict:
    if row is None:
        return {}
    d = dict(row)
    # Parse JSON fields
    if "days_of_week" in d and isinstance(d["days_of_week"], str):
        try:
            d["days_of_week"] = json.loads(d["days_of_week"])
        except json.JSONDecodeError:
            d["days_of_week"] = []
    # Convert active int to bool
    if "active" in d:
        d["active"] = bool(d["active"])
    return d
