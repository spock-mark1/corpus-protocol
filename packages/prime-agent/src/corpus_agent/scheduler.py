"""Main async scheduler — orchestrates all agent tasks."""

from __future__ import annotations

import asyncio
import signal
from typing import TYPE_CHECKING

from rich.console import Console

if TYPE_CHECKING:
    from corpus_agent.config import Settings

console = Console()


async def run(settings: Settings) -> None:
    """Entry point called by `corpus-agent start`."""
    from corpus_agent.api_client import CorpusAPIClient
    from corpus_agent.db import LocalDB

    db = LocalDB()
    api = CorpusAPIClient(settings)

    # Download corpus config
    console.print("[bold]Downloading corpus config...[/bold]")
    corpus_config = await api.get_corpus(settings.corpus_id)
    if not corpus_config:
        console.print("[red]Failed to fetch corpus config. Check API key and corpus ID.[/red]")
        db.close()
        return
    db.set_corpus_config(corpus_config)
    console.print(f"[green]Loaded corpus:[/green] {corpus_config.get('name', settings.corpus_id)}")

    # Import tools + agent after config is loaded
    from corpus_agent.agent.context import AgentContext
    from corpus_agent.agent.loop import agent_loop
    from corpus_agent.browser.session import BrowserSession
    from corpus_agent.tools.registry import build_all_tools

    # Start browser session
    console.print("[bold]Starting browser session...[/bold]")
    browser = await BrowserSession.start()
    console.print("[green]Browser ready.[/green]")

    # Build tools
    tools = build_all_tools(api=api, db=db, browser=browser, settings=settings)
    console.print(f"[green]Registered {len(tools)} tools.[/green]")

    # Shutdown handler
    shutdown_event = asyncio.Event()

    def _handle_signal():
        console.print("\n[yellow]Shutting down...[/yellow]")
        shutdown_event.set()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, _handle_signal)

    # Report online
    await api.update_status(settings.corpus_id, online=True)
    console.print("[bold green]Agent is online. Press Ctrl+C to stop.[/bold green]\n")

    async def agent_cycle_task():
        """Run agent loop every cycle_interval seconds."""
        while not shutdown_event.is_set():
            try:
                context = AgentContext.from_db(db, corpus_config)
                await agent_loop(
                    settings=settings,
                    tools=tools,
                    corpus_config=corpus_config,
                    context=context,
                    db=db,
                )
                db.update_schedule("agent_cycle")
            except Exception as e:
                console.print(f"[red]Agent cycle error: {e}[/red]")
            try:
                await asyncio.wait_for(shutdown_event.wait(), timeout=settings.agent_cycle_interval)
                break
            except asyncio.TimeoutError:
                pass

    async def polling_task():
        """Poll Web API for approvals and commerce jobs."""
        while not shutdown_event.is_set():
            try:
                # Poll approvals
                approvals = await api.get_approvals(settings.corpus_id, status="pending")
                for a in approvals:
                    cached = db.get_pending_approvals()
                    cached_ids = {c["approval_id"] for c in cached}
                    if a["id"] not in cached_ids:
                        db.cache_approval(a["id"], a["type"], a["title"], a.get("description"), a.get("amount"))

                # Poll pending jobs (as service provider)
                jobs = await api.get_pending_jobs()
                for job in jobs:
                    db.add_commerce_job(job["id"], job["corpusId"], job.get("serviceName", ""), job.get("payload"))
            except Exception as e:
                console.print(f"[dim red]Polling error: {e}[/dim red]")
            try:
                await asyncio.wait_for(shutdown_event.wait(), timeout=settings.polling_interval)
                break
            except asyncio.TimeoutError:
                pass

    async def heartbeat_task():
        """Report online status periodically."""
        while not shutdown_event.is_set():
            try:
                await api.update_status(settings.corpus_id, online=True)
            except Exception:
                pass
            try:
                await asyncio.wait_for(shutdown_event.wait(), timeout=settings.heartbeat_interval)
                break
            except asyncio.TimeoutError:
                pass

    async def activity_flush_task():
        """Flush buffered activity logs to Web API."""
        while not shutdown_event.is_set():
            try:
                pending = db.get_pending_activities()
                if pending:
                    for act in pending:
                        await api.report_activity(
                            settings.corpus_id,
                            type_=act["type"],
                            content=act["content"],
                            channel=act["channel"],
                        )
                    db.mark_activities_sent([a["id"] for a in pending])
            except Exception:
                pass
            try:
                await asyncio.wait_for(shutdown_event.wait(), timeout=30)
                break
            except asyncio.TimeoutError:
                pass

    try:
        await asyncio.gather(
            agent_cycle_task(),
            polling_task(),
            heartbeat_task(),
            activity_flush_task(),
        )
    finally:
        # Graceful shutdown
        console.print("[yellow]Reporting offline status...[/yellow]")
        try:
            await api.update_status(settings.corpus_id, online=False)
        except Exception:
            pass
        await browser.close()
        await api.close()
        db.close()
        console.print("[bold]Agent stopped.[/bold]")
