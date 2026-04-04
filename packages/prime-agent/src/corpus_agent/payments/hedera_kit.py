"""Hedera Agent Kit wrapper — internal economy tools."""

from __future__ import annotations

import asyncio
import inspect
from typing import Any

from rich.console import Console

from corpus_agent.config import Settings

console = Console()


async def _safe_call(fn: Any, *args: Any, **kwargs: Any) -> Any:
    """Call fn, wrapping sync functions with asyncio.to_thread for safety."""
    result = fn(*args, **kwargs)
    if inspect.isawaitable(result):
        return await result
    # Sync call from hedera-agent-kit — run in thread to avoid blocking event loop
    return await asyncio.to_thread(lambda: result)


class HederaKit:
    """Wraps Hedera Agent Kit for Corpus internal economy operations."""

    def __init__(self, settings: Settings):
        self._settings = settings
        self._kit = None
        self._initialized = False

    async def initialize(self) -> None:
        if self._initialized:
            return
        try:
            from hedera_agent_kit import HederaAgentKit

            def _init_kit():
                return HederaAgentKit(
                    operator_id=self._settings.hedera_account_id,
                    operator_key=self._settings.hedera_private_key,
                    network=self._settings.hedera_network,
                )

            # Kit init may be sync — run in thread
            self._kit = await asyncio.to_thread(_init_kit)
            self._initialized = True
            console.print("[green]Hedera Agent Kit initialized.[/green]")
        except ImportError:
            console.print("[yellow]hedera-agent-kit not installed. Hedera tools disabled.[/yellow]")
        except Exception as e:
            console.print(f"[yellow]Hedera init failed: {e}. Hedera tools disabled.[/yellow]")

    @property
    def available(self) -> bool:
        return self._initialized and self._kit is not None

    async def transfer_hbar(self, to_account: str, amount: float) -> dict[str, Any]:
        if not self.available:
            return {"error": "Hedera not initialized"}
        try:
            result = await _safe_call(
                self._kit.transfer_hbar,
                to_account_id=to_account,
                amount=amount,
            )
            return {"status": "success", "to": to_account, "amount": amount, "result": str(result)}
        except Exception as e:
            return {"error": f"Transfer failed: {e}"}

    async def get_balance(self) -> dict[str, Any]:
        if not self.available:
            return {"error": "Hedera not initialized"}
        try:
            balance = await _safe_call(self._kit.get_hbar_balance)
            return {"balance_hbar": str(balance), "account": self._settings.hedera_account_id}
        except Exception as e:
            return {"error": f"Balance query failed: {e}"}

    async def create_token(
        self, name: str, symbol: str, initial_supply: int, decimals: int = 6
    ) -> dict[str, Any]:
        if not self.available:
            return {"error": "Hedera not initialized"}
        try:
            result = await _safe_call(
                self._kit.create_fungible_token,
                name=name,
                symbol=symbol,
                initial_supply=initial_supply,
                decimals=decimals,
            )
            return {"status": "success", "token_id": str(result), "name": name, "symbol": symbol}
        except Exception as e:
            return {"error": f"Token creation failed: {e}"}

    async def transfer_token(
        self, token_id: str, to_account: str, amount: int
    ) -> dict[str, Any]:
        if not self.available:
            return {"error": "Hedera not initialized"}
        try:
            result = await _safe_call(
                self._kit.transfer_token,
                token_id=token_id,
                to_account_id=to_account,
                amount=amount,
            )
            return {"status": "success", "token_id": token_id, "to": to_account, "amount": amount}
        except Exception as e:
            return {"error": f"Token transfer failed: {e}"}

    async def get_token_balance(self, account_id: str, token_id: str) -> dict[str, Any]:
        if not self.available:
            return {"error": "Hedera not initialized"}
        try:
            balance = await _safe_call(
                self._kit.get_token_balance,
                account_id=account_id,
                token_id=token_id,
            )
            return {"balance": str(balance), "token_id": token_id, "account": account_id}
        except Exception as e:
            return {"error": f"Token balance query failed: {e}"}
