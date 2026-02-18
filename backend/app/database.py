import sqlite3
import os
import json
from datetime import datetime
from contextlib import contextmanager

DB_PATH = os.getenv("DB_PATH", "tablesnipe.db")


def get_db_path() -> str:
    if os.path.exists("/data"):
        return "/data/app.db"
    return DB_PATH


@contextmanager
def get_db():
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
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
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS found_slots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                monitor_id INTEGER NOT NULL,
                restaurant_name TEXT NOT NULL,
                date TEXT NOT NULL,
                time TEXT NOT NULL,
                party_size INTEGER NOT NULL,
                slot_token TEXT,
                slot_hash TEXT,
                status TEXT NOT NULL DEFAULT 'found',
                notified_at TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (monitor_id) REFERENCES monitors(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                twilio_account_sid TEXT DEFAULT '',
                twilio_auth_token TEXT DEFAULT '',
                twilio_phone_number TEXT DEFAULT '',
                user_phone_number TEXT DEFAULT '',
                opentable_bearer_token TEXT DEFAULT '',
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            INSERT OR IGNORE INTO settings (id) VALUES (1);
        """)


# Monitor CRUD
def create_monitor(data: dict) -> dict:
    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO monitors (restaurant_id, restaurant_name, party_size, days_of_week, time_start, time_end, weeks_ahead, active)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                data["restaurant_id"],
                data["restaurant_name"],
                data.get("party_size", 2),
                json.dumps(data.get("days_of_week", [])),
                data.get("time_start", "18:00"),
                data.get("time_end", "21:00"),
                data.get("weeks_ahead", 4),
                1 if data.get("active", True) else 0,
            ),
        )
        monitor_id = cursor.lastrowid
        row = conn.execute("SELECT * FROM monitors WHERE id = ?", (monitor_id,)).fetchone()
        return dict(row)


def get_monitors() -> list[dict]:
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM monitors ORDER BY created_at DESC").fetchall()
        return [dict(r) for r in rows]


def get_monitor(monitor_id: int) -> dict | None:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM monitors WHERE id = ?", (monitor_id,)).fetchone()
        return dict(row) if row else None


def update_monitor(monitor_id: int, data: dict) -> dict | None:
    with get_db() as conn:
        fields = []
        values = []
        for key in ["restaurant_id", "restaurant_name", "party_size", "time_start", "time_end", "weeks_ahead", "active"]:
            if key in data:
                fields.append(f"{key} = ?")
                val = data[key]
                if key == "active":
                    val = 1 if val else 0
                values.append(val)
        if "days_of_week" in data:
            fields.append("days_of_week = ?")
            values.append(json.dumps(data["days_of_week"]))
        if not fields:
            return get_monitor(monitor_id)
        values.append(monitor_id)
        conn.execute(f"UPDATE monitors SET {', '.join(fields)} WHERE id = ?", values)
        row = conn.execute("SELECT * FROM monitors WHERE id = ?", (monitor_id,)).fetchone()
        return dict(row) if row else None


def delete_monitor(monitor_id: int) -> bool:
    with get_db() as conn:
        cursor = conn.execute("DELETE FROM monitors WHERE id = ?", (monitor_id,))
        return cursor.rowcount > 0


# Settings
def get_settings() -> dict:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM settings WHERE id = 1").fetchone()
        return dict(row) if row else {}


def update_settings(data: dict) -> dict:
    with get_db() as conn:
        fields = []
        values = []
        for key in ["twilio_account_sid", "twilio_auth_token", "twilio_phone_number", "user_phone_number", "opentable_bearer_token"]:
            if key in data:
                fields.append(f"{key} = ?")
                values.append(data[key])
        if fields:
            fields.append("updated_at = datetime('now')")
            conn.execute(f"UPDATE settings SET {', '.join(fields)} WHERE id = 1", values)
        row = conn.execute("SELECT * FROM settings WHERE id = 1").fetchone()
        return dict(row) if row else {}


# Found Slots
def create_found_slot(data: dict) -> dict:
    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO found_slots (monitor_id, restaurant_name, date, time, party_size, slot_token, slot_hash, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                data["monitor_id"],
                data["restaurant_name"],
                data["date"],
                data["time"],
                data["party_size"],
                data.get("slot_token", ""),
                data.get("slot_hash", ""),
                data.get("status", "found"),
            ),
        )
        slot_id = cursor.lastrowid
        row = conn.execute("SELECT * FROM found_slots WHERE id = ?", (slot_id,)).fetchone()
        return dict(row)


def get_found_slots(limit: int = 50) -> list[dict]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM found_slots ORDER BY created_at DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(r) for r in rows]


def get_found_slots_for_monitor(monitor_id: int) -> list[dict]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM found_slots WHERE monitor_id = ? ORDER BY created_at DESC",
            (monitor_id,),
        ).fetchall()
        return [dict(r) for r in rows]


def update_slot_status(slot_id: int, status: str) -> dict | None:
    with get_db() as conn:
        conn.execute("UPDATE found_slots SET status = ? WHERE id = ?", (status, slot_id))
        row = conn.execute("SELECT * FROM found_slots WHERE id = ?", (slot_id,)).fetchone()
        return dict(row) if row else None


def get_pending_slot_for_user() -> dict | None:
    """Get the most recent notified slot waiting for user response."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM found_slots WHERE status = 'notified' ORDER BY notified_at DESC LIMIT 1"
        ).fetchone()
        return dict(row) if row else None


def mark_slot_notified(slot_id: int) -> None:
    with get_db() as conn:
        conn.execute(
            "UPDATE found_slots SET status = 'notified', notified_at = datetime('now') WHERE id = ?",
            (slot_id,),
        )


def check_slot_already_found(monitor_id: int, date: str, time: str) -> bool:
    with get_db() as conn:
        row = conn.execute(
            "SELECT id FROM found_slots WHERE monitor_id = ? AND date = ? AND time = ? AND status NOT IN ('denied', 'expired')",
            (monitor_id, date, time),
        ).fetchone()
        return row is not None
