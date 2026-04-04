"""x402 payment signer — delegates signing to Web's Circle MPC proxy.

The Prime Agent never holds private keys. Signing is done by calling
POST /api/corpus/:id/sign on the Corpus Web server, which uses Circle
Developer-Controlled Wallets (MPC) to produce EIP-3009 signatures.
"""

from __future__ import annotations

from typing import Any

from rich.console import Console

console = Console()


class X402Signer:
    """Signs x402 payment authorizations via Web proxy (Circle MPC).

    Instead of holding a private key locally, the agent calls the Web
    server's signing endpoint. Web authenticates via CORPUS_API_KEY,
    verifies the amount against Kernel thresholds, and signs using
    Circle Developer-Controlled Wallets.
    """

    def __init__(self, api_client: Any):
        self._api = api_client
        self._wallet_id: str | None = None
        self._wallet_address: str | None = None
        self._initialized = False

    async def initialize(self) -> None:
        """Fetch agent wallet info from Web API."""
        if self._initialized:
            return
        try:
            wallet = await self._api.get_agent_wallet()
            if wallet and "walletId" in wallet:
                self._wallet_id = wallet["walletId"]
                self._wallet_address = wallet["address"]
                self._initialized = True
                console.print(f"[green]x402 signer ready (Circle MPC): {self._wallet_address}[/green]")
            else:
                console.print("[yellow]No agent wallet found. x402 signing disabled.[/yellow]")
        except Exception as e:
            console.print(f"[yellow]x402 signer init failed: {e}[/yellow]")

    @property
    def available(self) -> bool:
        return self._initialized and self._wallet_address is not None

    @property
    def address(self) -> str | None:
        return self._wallet_address

    async def sign_payment(
        self,
        payee: str,
        amount: int,
        token_address: str | None = None,
        chain_id: int | None = None,
    ) -> dict[str, Any]:
        """Request x402 payment signature from Web's Circle MPC proxy.

        Returns a dict with the X-PAYMENT header value.
        """
        if not self.available:
            return {"error": "x402 signer not initialized"}

        try:
            result = await self._api.sign_payment(
                payee=payee,
                amount=amount,
                token_address=token_address,
                chain_id=chain_id,
            )

            if not result or "error" in result:
                return {"error": result.get("error", "Signing request failed")}

            return {
                "status": "signed",
                "payment_header": result["paymentHeader"],
                "from": result.get("from", self._wallet_address),
                "to": payee,
                "amount": amount,
            }
        except Exception as e:
            return {"error": f"Signing failed: {e}"}
