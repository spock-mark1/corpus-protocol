"""Stagehand browser session — manages local Chrome connection with auto-reconnect."""

from __future__ import annotations

import asyncio

from rich.console import Console
from stagehand import Stagehand

console = Console()

MAX_RECONNECT_ATTEMPTS = 3


class BrowserSession:
    """Wrapper around Stagehand for local Chrome automation with reconnect."""

    def __init__(self, client: Stagehand, session_id: str):
        self._client = client
        self._session_id = session_id
        self._closed = False

    @classmethod
    async def start(cls, *, model_api_key: str | None = None) -> BrowserSession:
        def _start():
            client = Stagehand(
                server="local",
                local_headless=False,
                model_api_key=model_api_key,
            )
            session = client.sessions.start(
                model_name="gpt-4o",
                browser={"type": "local", "launchOptions": {"headless": False}},
            )
            session_id = session.id if hasattr(session, "id") else str(session)
            return client, session_id

        client, session_id = await asyncio.to_thread(_start)
        return cls(client, session_id)

    async def reconnect(self) -> None:
        """Tear down old session and start a fresh one."""
        console.print("[yellow]Reconnecting browser session...[/yellow]")
        try:
            await asyncio.to_thread(self._client.sessions.end, self._session_id)
        except Exception:
            pass

        for attempt in range(1, MAX_RECONNECT_ATTEMPTS + 1):
            try:
                def _reconnect():
                    client = Stagehand(
                        server="local",
                        local_headless=False,
                    )
                    session = client.sessions.start(
                        model_name="gpt-4o",
                        browser={"type": "local", "launchOptions": {"headless": False}},
                    )
                    session_id = session.id if hasattr(session, "id") else str(session)
                    return client, session_id

                client, session_id = await asyncio.to_thread(_reconnect)
                self._client = client
                self._session_id = session_id
                self._closed = False
                console.print(f"[green]Browser reconnected (attempt {attempt}).[/green]")
                return
            except Exception as e:
                console.print(f"[red]Reconnect attempt {attempt} failed: {e}[/red]")
                if attempt == MAX_RECONNECT_ATTEMPTS:
                    raise RuntimeError(
                        f"Browser reconnect failed after {MAX_RECONNECT_ATTEMPTS} attempts"
                    ) from e

    @property
    def is_alive(self) -> bool:
        if self._closed:
            return False
        try:
            return self._session_id is not None
        except Exception:
            return False

    async def goto(self, url: str) -> None:
        await asyncio.to_thread(self._client.sessions.navigate, self._session_id, url=url)

    async def act(self, instruction: str) -> str:
        result = await asyncio.to_thread(
            self._client.sessions.act, self._session_id, input=instruction
        )
        return str(result)

    async def extract(self, instruction: str, schema: dict | None = None) -> dict | list:
        kwargs: dict = {"instruction": instruction}
        if schema:
            kwargs["schema"] = schema

        def _extract():
            return self._client.sessions.extract(self._session_id, **kwargs)

        response = await asyncio.to_thread(_extract)
        # Unwrap SessionExtractResponse → .data.result
        if hasattr(response, "data") and hasattr(response.data, "result"):
            return response.data.result
        return response

    async def url(self) -> str:
        return ""

    async def close(self) -> None:
        self._closed = True
        try:
            await asyncio.to_thread(self._client.sessions.end, self._session_id)
        except Exception:
            pass
