import aiosqlite
import os
import json
from contextlib import asynccontextmanager
from typing import AsyncGenerator

DB_PATH = os.environ.get("TABLESNIPE_DB_PATH", "/data/app.db")

# Fallback for local dev
if not os.path.exists(os.path.dirname(DB_PATH)) and DB_PATH.startswith("/data"):
    DB_PATH = os.path.join(os.path.dirname(__file__), "..", "tablesnipe.db")
    DB_PATH = os.path.abspath(DB_PATH)


@asynccontextmanager
async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()


async def init_db() -> None:
    async with get_db() as db:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS monitors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                restaurant_name TEXT NOT NULL,
                restaurant_id TEXT NOT NULL,
                party_size INTEGER NOT NULL DEFAULT 2,
                days_of_week TEXT NOT NULL DEFAULT '[]',
                time_start TEXT NOT NULL DEFAULT '18:00',
                time_end TEXT NOT NULL DEFAULT '21:00',
                weeks_ahead INTEGER NOT NULL DEFAULT 4,
                enabled INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                monitor_id INTEGER NOT NULL,
                restaurant_name TEXT NOT NULL,
                slot_datetime TEXT NOT NULL,
                party_size INTEGER NOT NULL,
                slot_hash TEXT,
                slot_token TEXT,
                status TEXT NOT NULL DEFAULT 'sent',
                sms_sid TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (monitor_id) REFERENCES monitors(id)
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        """)
        await db.commit()


async def get_setting(key: str, default: str = "") -> str:
    async with get_db() as db:
        cursor = await db.execute("SELECT value FROM settings WHERE key = ?", (key,))
        row = await cursor.fetchone()
        return row["value"] if row else default


async def set_setting(key: str, value: str) -> None:
    async with get_db() as db:
        await db.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
            (key, value),
        )
        await db.commit()


async def get_all_settings() -> dict[str, str]:
    async with get_db() as db:
        cursor = await db.execute("SELECT key, value FROM settings")
        rows = await cursor.fetchall()
        return {row["key"]: row["value"] for row in rows}
