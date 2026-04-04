"""SQLite local database — schedule state, caches, activity buffer."""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from corpus_agent.config import APP_DIR

DB_PATH = APP_DIR / "corpus-agent.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS schedules (
    task_name   TEXT PRIMARY KEY,
    last_run_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    type       TEXT NOT NULL,
    content    TEXT NOT NULL,
    channel    TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS content_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    content    TEXT NOT NULL,
    channel    TEXT NOT NULL,
    posted_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS commerce_queue (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id          TEXT UNIQUE,
    corpus_id       TEXT NOT NULL,
    service_type    TEXT NOT NULL,
    payload         TEXT,
    status          TEXT NOT NULL DEFAULT 'pending',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS approval_cache (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    approval_id     TEXT UNIQUE,
    type            TEXT NOT NULL,
    title           TEXT NOT NULL,
    description     TEXT,
    amount          REAL,
    status          TEXT NOT NULL DEFAULT 'pending',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS spending_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    amount      REAL NOT NULL,
    currency    TEXT NOT NULL DEFAULT 'USDC',
    category    TEXT NOT NULL,
    description TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS corpus_config (
    key    TEXT PRIMARY KEY,
    value  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS playbooks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    data        TEXT NOT NULL,
    source_corpus TEXT,
    applied     INTEGER NOT NULL DEFAULT 0,
    purchased_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


class LocalDB:
    def __init__(self, path: Path = DB_PATH):
        self._path = path
        path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(path))
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.executescript(_SCHEMA)

    # ── Schedules ──────────────────────────────────────────

    def get_last_run(self, task_name: str) -> datetime | None:
        row = self._conn.execute(
            "SELECT last_run_at FROM schedules WHERE task_name = ?", (task_name,)
        ).fetchone()
        if row:
            return datetime.fromisoformat(row["last_run_at"])
        return None

    def update_schedule(self, task_name: str) -> None:
        now = datetime.now(timezone.utc).isoformat()
        self._conn.execute(
            "INSERT INTO schedules (task_name, last_run_at) VALUES (?, ?) "
            "ON CONFLICT(task_name) DO UPDATE SET last_run_at = excluded.last_run_at",
            (task_name, now),
        )
        self._conn.commit()

    # ── Activity Log ───────────────────────────────────────

    def add_activity(self, type_: str, content: str, channel: str) -> None:
        self._conn.execute(
            "INSERT INTO activity_log (type, content, channel) VALUES (?, ?, ?)",
            (type_, content, channel),
        )
        self._conn.commit()

    def get_pending_activities(self, limit: int = 50) -> list[dict]:
        rows = self._conn.execute(
            "SELECT id, type, content, channel FROM activity_log WHERE status = 'pending' LIMIT ?",
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]

    def mark_activities_sent(self, ids: list[int]) -> None:
        if not ids:
            return
        placeholders = ",".join("?" for _ in ids)
        self._conn.execute(
            f"UPDATE activity_log SET status = 'sent' WHERE id IN ({placeholders})", ids
        )
        self._conn.commit()

    def count_today(self, type_: str) -> int:
        row = self._conn.execute(
            "SELECT COUNT(*) as cnt FROM activity_log WHERE type = ? AND date(created_at) = date('now')",
            (type_,),
        ).fetchone()
        return row["cnt"] if row else 0

    # ── Content History ────────────────────────────────────

    def add_content(self, content: str, channel: str) -> None:
        self._conn.execute(
            "INSERT INTO content_history (content, channel) VALUES (?, ?)",
            (content, channel),
        )
        self._conn.commit()

    def get_recent_content(self, limit: int = 20) -> list[dict]:
        rows = self._conn.execute(
            "SELECT content, channel, posted_at FROM content_history ORDER BY posted_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]

    # ── Commerce Queue ─────────────────────────────────────

    def add_commerce_job(self, job_id: str, corpus_id: str, service_type: str, payload: dict | None = None) -> None:
        self._conn.execute(
            "INSERT INTO commerce_queue (job_id, corpus_id, service_type, payload) VALUES (?, ?, ?, ?)",
            (job_id, corpus_id, service_type, json.dumps(payload) if payload else None),
        )
        self._conn.commit()

    def update_commerce_status(self, job_id: str, status: str) -> None:
        self._conn.execute(
            "UPDATE commerce_queue SET status = ?, updated_at = datetime('now') WHERE job_id = ?",
            (status, job_id),
        )
        self._conn.commit()

    # ── Approval Cache ─────────────────────────────────────

    def cache_approval(self, approval_id: str, type_: str, title: str, description: str | None, amount: float | None) -> None:
        self._conn.execute(
            "INSERT OR REPLACE INTO approval_cache (approval_id, type, title, description, amount) VALUES (?, ?, ?, ?, ?)",
            (approval_id, type_, title, description, amount),
        )
        self._conn.commit()

    def get_pending_approvals(self) -> list[dict]:
        rows = self._conn.execute(
            "SELECT * FROM approval_cache WHERE status = 'pending'"
        ).fetchall()
        return [dict(r) for r in rows]

    def update_approval_status(self, approval_id: str, status: str) -> None:
        self._conn.execute(
            "UPDATE approval_cache SET status = ?, updated_at = datetime('now') WHERE approval_id = ?",
            (status, approval_id),
        )
        self._conn.commit()

    # ── Corpus Config Cache ────────────────────────────────

    def set_config(self, key: str, value: str) -> None:
        self._conn.execute(
            "INSERT INTO corpus_config (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, value),
        )
        self._conn.commit()

    def get_config(self, key: str) -> str | None:
        row = self._conn.execute("SELECT value FROM corpus_config WHERE key = ?", (key,)).fetchone()
        return row["value"] if row else None

    def set_corpus_config(self, data: dict) -> None:
        self.set_config("corpus_data", json.dumps(data))

    def get_corpus_config(self) -> dict | None:
        raw = self.get_config("corpus_data")
        return json.loads(raw) if raw else None

    # ── Playbooks ──────────────────────────────────────────

    def save_playbook(self, name: str, data: dict, source_corpus: str | None = None) -> None:
        self._conn.execute(
            "INSERT INTO playbooks (name, data, source_corpus) VALUES (?, ?, ?)",
            (name, json.dumps(data), source_corpus),
        )
        self._conn.commit()

    def get_active_playbook(self) -> dict | None:
        row = self._conn.execute(
            "SELECT name, data FROM playbooks WHERE applied = 1 ORDER BY purchased_at DESC LIMIT 1"
        ).fetchone()
        if row:
            return {"name": row["name"], "data": json.loads(row["data"])}
        return None

    def apply_playbook(self, playbook_id: int) -> None:
        self._conn.execute("UPDATE playbooks SET applied = 0")
        self._conn.execute("UPDATE playbooks SET applied = 1 WHERE id = ?", (playbook_id,))
        self._conn.commit()

    # ── Spending Tracker ────────────────────────────────────

    def record_spending(self, amount: float, category: str, description: str = "", currency: str = "USDC") -> None:
        self._conn.execute(
            "INSERT INTO spending_log (amount, currency, category, description) VALUES (?, ?, ?, ?)",
            (amount, currency, category, description),
        )
        self._conn.commit()

    def get_spending_today(self) -> float:
        row = self._conn.execute(
            "SELECT COALESCE(SUM(amount), 0) as total FROM spending_log WHERE date(created_at) = date('now')"
        ).fetchone()
        return float(row["total"]) if row else 0.0

    def get_spending_period(self, days: int = 30) -> float:
        row = self._conn.execute(
            "SELECT COALESCE(SUM(amount), 0) as total FROM spending_log "
            "WHERE created_at >= datetime('now', ?)",
            (f"-{days} days",),
        ).fetchone()
        return float(row["total"]) if row else 0.0

    # ── Cleanup ────────────────────────────────────────────

    def close(self) -> None:
        self._conn.close()
