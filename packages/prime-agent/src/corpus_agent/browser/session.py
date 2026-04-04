"""Stagehand browser session — manages local Chrome connection with auto-reconnect."""

from __future__ import annotations

from rich.console import Console
from stagehand import Stagehand

console = Console()

MAX_RECONNECT_ATTEMPTS = 3


class BrowserSession:
    """Wrapper around Stagehand for local Chrome automation with reconnect."""

    def __init__(self, stagehand: Stagehand):
        self._stagehand = stagehand
        self.page = stagehand.page
        self._closed = False

    @classmethod
    async def start(cls) -> BrowserSession:
        stagehand = Stagehand(
            env="LOCAL",
            model_name="gpt-4o",
            headless=False,
        )
        await stagehand.init()
        return cls(stagehand)

    async def reconnect(self) -> None:
        """Tear down old session and start a fresh one."""
        console.print("[yellow]Reconnecting browser session...[/yellow]")
        try:
            await self._stagehand.close()
        except Exception:
            pass

        for attempt in range(1, MAX_RECONNECT_ATTEMPTS + 1):
            try:
                stagehand = Stagehand(
                    env="LOCAL",
                    model_name="gpt-4o",
                    headless=False,
                )
                await stagehand.init()
                self._stagehand = stagehand
                self.page = stagehand.page
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
            # Quick check — accessing page.url should not throw if session is alive
            _ = self.page.url
            return True
        except Exception:
            return False

    async def goto(self, url: str) -> None:
        await self.page.goto(url)

    async def act(self, instruction: str) -> str:
        result = await self.page.act(instruction)
        return str(result)

    async def extract(self, instruction: str, schema: dict | None = None) -> dict | list:
        kwargs: dict = {"instruction": instruction}
        if schema:
            kwargs["schema"] = schema
        result = await self.page.extract(**kwargs)
        return result

    async def url(self) -> str:
        return self.page.url

    async def close(self) -> None:
        self._closed = True
        try:
            await self._stagehand.close()
        except Exception:
            pass
