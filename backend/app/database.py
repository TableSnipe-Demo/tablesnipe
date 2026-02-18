import sqlite3
import os
import json
from datetime import datetime
from contextlib import contextmanager

DB_PATH = os.environ.get("DATABASE_PATH", "/data/app.db")
if not os.path.exists(os.path.dirname(DB_PATH)):
    DB_PATH = os.path.join(os.path.dirname(__file__), "..", "app.db")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS restaurants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                opentable_id TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                cuisine TEXT DEFAULT '',
                location TEXT DEFAULT '',
                created_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS monitors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                restaurant_id INTEGER NOT NULL,
                days_of_week TEXT NOT NULL DEFAULT '[]',
                time_start TEXT NOT NULL DEFAULT '18:00',
                time_end TEXT NOT NULL DEFAULT '21:00',
                party_size INTEGER NOT NULL DEFAULT 2,
                weeks_ahead INTEGER NOT NULL DEFAULT 4,
                enabled INTEGER NOT NULL DEFAULT 1,
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                twilio_account_sid TEXT DEFAULT '',
                twilio_auth_token TEXT DEFAULT '',
                twilio_phone_number TEXT DEFAULT '',
                user_phone_number TEXT DEFAULT '',
                opentable_bearer_token TEXT DEFAULT '',
                polling_interval_minutes INTEGER DEFAULT 15
            );

            INSERT OR IGNORE INTO settings (id) VALUES (1);

            CREATE TABLE IF NOT EXISTS found_slots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                monitor_id INTEGER NOT NULL,
                restaurant_id INTEGER NOT NULL,
                date_time TEXT NOT NULL,
                party_size INTEGER NOT NULL,
                slot_hash TEXT DEFAULT '',
                slot_token TEXT DEFAULT '',
                status TEXT DEFAULT 'found',
                created_at TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE,
                FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                slot_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                status TEXT DEFAULT 'sent',
                twilio_sid TEXT DEFAULT '',
                created_at TEXT DEFAULT (datetime('now')),
                responded_at TEXT,
                FOREIGN KEY (slot_id) REFERENCES found_slots(id) ON DELETE CASCADE
            );

            CREATE UNIQUE INDEX IF NOT EXISTS idx_found_slots_unique
                ON found_slots(monitor_id, restaurant_id, date_time, party_size);
        """)
