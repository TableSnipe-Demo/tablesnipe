import sqlite3
import os
import json
from datetime import datetime

_db_path: str | None = None
_initialized = False


def _resolve_db_path() -> str:
    global _db_path
    if _db_path:
        return _db_path
    path = os.environ.get("DB_PATH", "")
    if path:
        parent = os.path.dirname(path) or "."
        if os.path.exists(parent):
            _db_path = path
            return _db_path
    if os.path.exists("/data"):
        _db_path = "/data/app.db"
    else:
        _db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app.db")
    return _db_path


def get_db():
    global _initialized
    conn = sqlite3.connect(_resolve_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    if not _initialized:
        _ensure_tables(conn)
        _initialized = True
    return conn


def _ensure_tables(conn: sqlite3.Connection):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );
        CREATE TABLE IF NOT EXISTS monitors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            restaurant_name TEXT NOT NULL,
            opentable_id TEXT NOT NULL,
            days_of_week TEXT NOT NULL DEFAULT '[]',
            time_start TEXT NOT NULL DEFAULT '17:00',
            time_end TEXT NOT NULL DEFAULT '21:00',
            party_size INTEGER NOT NULL DEFAULT 2,
            weeks_ahead INTEGER NOT NULL DEFAULT 4,
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            monitor_id INTEGER,
            restaurant_name TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            party_size INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'notified',
            booking_token TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (monitor_id) REFERENCES monitors(id)
        );
    """)
    defaults = {
        "app_password": "tablesnipe",
        "twilio_sid": "",
        "twilio_token": "",
        "twilio_phone": "",
        "user_phone": "",
        "openai_key": "",
    }
    for key, value in defaults.items():
        conn.execute(
            "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
            (key, value),
        )
    conn.commit()


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );
        CREATE TABLE IF NOT EXISTS monitors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            restaurant_name TEXT NOT NULL,
            opentable_id TEXT NOT NULL,
            days_of_week TEXT NOT NULL DEFAULT '[]',
            time_start TEXT NOT NULL DEFAULT '17:00',
            time_end TEXT NOT NULL DEFAULT '21:00',
            party_size INTEGER NOT NULL DEFAULT 2,
            weeks_ahead INTEGER NOT NULL DEFAULT 4,
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            monitor_id INTEGER,
            restaurant_name TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            party_size INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'notified',
            booking_token TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (monitor_id) REFERENCES monitors(id)
        );
    """)
    defaults = {
        "app_password": "tablesnipe",
        "twilio_sid": "",
        "twilio_token": "",
        "twilio_phone": "",
        "user_phone": "",
        "openai_key": "",
    }
    for key, value in defaults.items():
        conn.execute(
            "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
            (key, value),
        )
    conn.commit()
    conn.close()


def get_setting(key: str) -> str:
    conn = get_db()
    row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    conn.close()
    return row["value"] if row else ""


def set_setting(key: str, value: str):
    conn = get_db()
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
        (key, value),
    )
    conn.commit()
    conn.close()


def get_all_settings() -> dict:
    conn = get_db()
    rows = conn.execute("SELECT key, value FROM settings").fetchall()
    conn.close()
    return {row["key"]: row["value"] for row in rows}
