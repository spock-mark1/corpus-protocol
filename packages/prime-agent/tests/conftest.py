"""Shared test fixtures for corpus-agent tests."""

from __future__ import annotations

import pytest
from pathlib import Path

from corpus_agent.config import Settings
from corpus_agent.db import LocalDB


@pytest.fixture
def mock_settings(tmp_path: Path) -> Settings:
    """Settings with safe test defaults (no real credentials)."""
    return Settings(
        corpus_api_url="http://test.local",
        corpus_api_key="cpk_test_key",
        corpus_id="test-corpus-id",
        openai_api_key="sk-test",
        agent_cycle_interval=1,
        polling_interval=1,
        heartbeat_interval=1,
        max_iterations=3,
    )


@pytest.fixture
def mock_db(tmp_path: Path) -> LocalDB:
    """LocalDB backed by a temp-file SQLite database."""
    return LocalDB(path=tmp_path / "test.db")
