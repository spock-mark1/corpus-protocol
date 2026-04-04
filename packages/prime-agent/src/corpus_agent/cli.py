"""CLI entry point — corpus-agent start|config|status."""

from __future__ import annotations

import asyncio
import json
import sys

import click
from rich.console import Console

from corpus_agent import __version__
from corpus_agent.config import APP_DIR, Settings, ensure_app_dir

console = Console()


@click.group()
@click.version_option(__version__, prog_name="corpus-agent")
def main():
    """Corpus Protocol Prime Agent — autonomous GTM agent."""


@main.command()
@click.option("--corpus-id", default=None, help="Corpus ID (overrides CORPUS_ID in .env)")
@click.option("--env-file", default=".env", help="Path to .env file")
def start(corpus_id: str | None, env_file: str):
    """Start the Prime Agent for a Corpus."""
    ensure_app_dir()
    kwargs: dict = {"_env_file": env_file}
    if corpus_id:
        kwargs["corpus_id"] = corpus_id
    settings = Settings(**kwargs)

    if not settings.corpus_api_key:
        console.print("[red]Error:[/red] CORPUS_API_KEY is required. Set it in .env or run `corpus-agent config`.")
        sys.exit(1)
    if not settings.openai_api_key:
        console.print("[red]Error:[/red] OPENAI_API_KEY is required. Set it in .env.")
        sys.exit(1)

    console.print(f"[bold green]Corpus Agent v{__version__}[/bold green]")
    if settings.corpus_id:
        console.print(f"  Corpus ID:  {settings.corpus_id}")
    else:
        console.print("  Corpus ID:  (auto-resolve from API key)")
    console.print(f"  API URL:    {settings.corpus_api_url}")
    console.print()

    from corpus_agent.scheduler import run

    asyncio.run(run(settings))


@main.command()
@click.option("--api-key", prompt="Corpus API Key", help="API key issued at Corpus creation")
@click.option("--openai-key", prompt="OpenAI API Key", help="OpenAI API key")
def config(api_key: str, openai_key: str):
    """Configure agent credentials (saved to ~/.corpus-agent/config.json)."""
    ensure_app_dir()
    cfg_path = APP_DIR / "config.json"

    existing = {}
    if cfg_path.exists():
        existing = json.loads(cfg_path.read_text())

    existing.update({
        k: v for k, v in {
            "corpus_api_key": api_key,
            "openai_api_key": openai_key,
        }.items() if v
    })

    cfg_path.write_text(json.dumps(existing, indent=2))
    console.print(f"[green]Config saved to {cfg_path}[/green]")


@main.command()
def status():
    """Show agent status."""
    from corpus_agent.db import LocalDB

    ensure_app_dir()
    db = LocalDB()

    corpus_cfg = db.get_corpus_config()
    if corpus_cfg:
        console.print(f"[bold]Corpus:[/bold] {corpus_cfg.get('name', 'Unknown')}")
    else:
        console.print("[yellow]No corpus config cached. Run `corpus-agent start` first.[/yellow]")

    last_cycle = db.get_last_run("agent_cycle")
    if last_cycle:
        console.print(f"[bold]Last agent cycle:[/bold] {last_cycle.isoformat()}")

    posts_today = db.count_today("post")
    console.print(f"[bold]Posts today:[/bold] {posts_today}")

    playbook = db.get_active_playbook()
    if playbook:
        console.print(f"[bold]Active playbook:[/bold] {playbook['name']}")

    pending = db.get_pending_approvals()
    console.print(f"[bold]Pending approvals:[/bold] {len(pending)}")

    db.close()
