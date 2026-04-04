"""x402 payment signer — EIP-3009 USDC signing on Base."""

from __future__ import annotations

import hashlib
import json
import time
from typing import Any

from rich.console import Console

console = Console()


class X402Signer:
    """Signs x402 payment authorizations for USDC on Base.

    Uses EIP-3009 (transferWithAuthorization) for gasless USDC transfers.
    The signature is passed via the X-PAYMENT HTTP header.
    """

    def __init__(self, private_key: str):
        self._private_key = private_key
        self._initialized = False
        self._account = None

    async def initialize(self) -> None:
        if self._initialized:
            return
        if not self._private_key:
            console.print("[yellow]BASE_WALLET_PRIVATE_KEY not set. x402 signing disabled.[/yellow]")
            return
        try:
            from eth_account import Account

            self._account = Account.from_key(self._private_key)
            self._initialized = True
            console.print(f"[green]x402 signer ready: {self._account.address}[/green]")
        except ImportError:
            console.print("[yellow]eth_account not installed. x402 signing disabled.[/yellow]")
        except Exception as e:
            console.print(f"[yellow]x402 signer init failed: {e}[/yellow]")

    @property
    def available(self) -> bool:
        return self._initialized and self._account is not None

    @property
    def address(self) -> str | None:
        return self._account.address if self._account else None

    async def sign_payment(
        self,
        payee: str,
        amount: int,
        token_address: str,
        chain_id: int = 8453,  # Base mainnet
        valid_after: int = 0,
        valid_before: int | None = None,
    ) -> dict[str, Any]:
        """Create an EIP-3009 transferWithAuthorization signature.

        Returns a dict with the payment header value and metadata.
        """
        if not self.available:
            return {"error": "x402 signer not initialized"}

        if valid_before is None:
            valid_before = int(time.time()) + 3600  # 1 hour validity

        nonce = hashlib.sha256(f"{time.time()}{payee}{amount}".encode()).hexdigest()[:32]

        # EIP-712 typed data for EIP-3009
        domain = {
            "name": "USD Coin",
            "version": "2",
            "chainId": chain_id,
            "verifyingContract": token_address,
        }

        message = {
            "from": self._account.address,
            "to": payee,
            "value": amount,
            "validAfter": valid_after,
            "validBefore": valid_before,
            "nonce": bytes.fromhex(nonce),
        }

        try:
            from eth_account.messages import encode_typed_data

            signable = encode_typed_data(
                domain_data=domain,
                message_types={
                    "TransferWithAuthorization": [
                        {"name": "from", "type": "address"},
                        {"name": "to", "type": "address"},
                        {"name": "value", "type": "uint256"},
                        {"name": "validAfter", "type": "uint256"},
                        {"name": "validBefore", "type": "uint256"},
                        {"name": "nonce", "type": "bytes32"},
                    ]
                },
                message_data=message,
            )
            signed = self._account.sign_message(signable)

            payment_header = json.dumps({
                "signature": signed.signature.hex(),
                "from": self._account.address,
                "to": payee,
                "value": str(amount),
                "validAfter": valid_after,
                "validBefore": valid_before,
                "nonce": nonce,
                "token": token_address,
                "chainId": chain_id,
            })

            return {
                "status": "signed",
                "payment_header": payment_header,
                "from": self._account.address,
                "to": payee,
                "amount": amount,
            }
        except Exception as e:
            return {"error": f"Signing failed: {e}"}
