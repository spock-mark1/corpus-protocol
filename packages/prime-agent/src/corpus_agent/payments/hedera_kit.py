"""Hedera operations — delegates to Web API.

The Prime Agent never holds Hedera private keys. All on-chain operations
(balance queries, token transfers, dividends) go through the Corpus Web
server, which uses Hedera SDK server-side or reads from Mirror Node.
"""

from __future__ import annotations

from typing import Any

from rich.console import Console

console = Console()


class HederaKit:
    """Proxy for Hedera operations via Corpus Web API.

    Read operations use Hedera Mirror Node (public, no key needed).
    Write operations are forwarded to Web, which handles signing.
    """

    def __init__(self, api_client: Any):
        self._api = api_client
        self._initialized = False

    async def initialize(self) -> None:
        if self._initialized:
            return
        self._initialized = True
        console.print("[green]Hedera proxy ready (via Web API + Mirror Node).[/green]")

    @property
    def available(self) -> bool:
        return self._initialized

    async def get_balance(self, account_id: str = "") -> dict[str, Any]:
        """Query HBAR balance via Mirror Node (public API)."""
        try:
            corpus = await self._api.get_config()
            acct = account_id or (corpus.get("hederaTokenId", "") if corpus else "")
            if not acct:
                return {"error": "No Hedera account configured"}
            # Mirror Node is public — no auth needed
            import httpx
            async with httpx.AsyncClient() as client:
                r = await client.get(
                    f"https://testnet.mirrornode.hedera.com/api/v1/accounts/{acct}"
                )
                if r.status_code == 200:
                    data = r.json()
                    balance = data.get("balance", {}).get("balance", 0)
                    return {"balance_hbar": balance / 1e8, "account": acct}
            return {"error": "Mirror Node query failed"}
        except Exception as e:
            return {"error": f"Balance query failed: {e}"}

    async def get_token_balance(self, account_id: str, token_id: str) -> dict[str, Any]:
        """Query Pulse token balance via Mirror Node."""
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                r = await client.get(
                    f"https://testnet.mirrornode.hedera.com/api/v1/tokens/{token_id}/balances",
                    params={"account.id": account_id},
                )
                if r.status_code == 200:
                    data = r.json()
                    entry = next((b for b in data.get("balances", [])), None)
                    balance = entry["balance"] if entry else 0
                    return {"balance": balance, "token_id": token_id, "account": account_id}
            return {"error": "Mirror Node query failed"}
        except Exception as e:
            return {"error": f"Token balance query failed: {e}"}

    async def transfer_hbar(self, to_account: str, amount: float) -> dict[str, Any]:
        """Request HBAR transfer via Web API (Web handles signing)."""
        try:
            result = await self._api.request_transfer(
                to_account=to_account, amount=amount, currency="HBAR"
            )
            if result:
                return {"status": "submitted", "to": to_account, "amount": amount}
            return {"error": "Transfer request failed"}
        except Exception as e:
            return {"error": f"Transfer failed: {e}"}
