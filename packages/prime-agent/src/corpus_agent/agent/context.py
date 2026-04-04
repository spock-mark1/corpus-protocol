"""AgentContext — collects current state from DB for system prompt."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from corpus_agent.db import LocalDB


@dataclass
class AgentContext:
    current_time: str
    posts_today: int
    research_today: int
    replies_today: int
    pending_approvals: int
    pending_jobs: int
    last_agent_cycle: str
    recent_content: list[dict]
    active_playbook: dict | None
    corpus_config: dict

    @classmethod
    def from_db(cls, db: LocalDB, corpus_config: dict) -> AgentContext:
        last_run = db.get_last_run("agent_cycle")
        playbook = db.get_active_playbook()

        # Count pending commerce jobs (as service provider)
        pending_jobs_count = 0
        try:
            rows = db._conn.execute(
                "SELECT COUNT(*) as cnt FROM commerce_queue WHERE status = 'pending'"
            ).fetchone()
            pending_jobs_count = rows["cnt"] if rows else 0
        except Exception:
            pass

        return cls(
            current_time=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
            posts_today=db.count_today("post"),
            research_today=db.count_today("research"),
            replies_today=db.count_today("reply"),
            pending_approvals=len(db.get_pending_approvals()),
            pending_jobs=pending_jobs_count,
            last_agent_cycle=last_run.isoformat() if last_run else "never",
            recent_content=db.get_recent_content(5),
            active_playbook=playbook,
            corpus_config=corpus_config,
        )

    def to_context_block(self) -> str:
        lines = [
            f"Current time: {self.current_time}",
            f"Posts today: {self.posts_today}",
            f"Research sessions today: {self.research_today}",
            f"Replies today: {self.replies_today}",
            f"Pending approvals: {self.pending_approvals}",
            f"Pending incoming jobs (to fulfill): {self.pending_jobs}",
            f"Last agent cycle: {self.last_agent_cycle}",
        ]
        if self.recent_content:
            lines.append("Recent posts (avoid duplicates):")
            for c in self.recent_content:
                lines.append(f"  - [{c.get('channel', '?')}] {c.get('content', '')[:80]}")
        if self.active_playbook:
            lines.append(f"Active playbook: {self.active_playbook['name']}")
            data = self.active_playbook.get("data", {})
            if isinstance(data, dict):
                if "schedule" in data:
                    lines.append(f"  Schedule: {data['schedule']}")
                if "tactics" in data:
                    lines.append(f"  Tactics: {data['tactics']}")
        return "\n".join(lines)
