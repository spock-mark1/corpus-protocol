"""Hedera tools — internal economy (Pulse tokens, HBAR dividends, governance)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from corpus_agent.payments.hedera_kit import HederaKit
from corpus_agent.tools.registry import tool

if TYPE_CHECKING:
    from corpus_agent.api_client import CorpusAPIClient
    from corpus_agent.config import Settings

# Injected by registry.build_all_tools
_settings: Settings = None  # type: ignore[assignment]
_api: CorpusAPIClient = None  # type: ignore[assignment]
_hedera_kit: HederaKit | None = None


def _get_kit() -> HederaKit:
    global _hedera_kit
    if _hedera_kit is None:
        _hedera_kit = HederaKit(_settings)
    return _hedera_kit


@tool("transfer_hbar", "Transfer HBAR to a Hedera account (dividends, payments). Auto-checks approval threshold.")
async def transfer_hbar(to_account: str, amount: float, reason: str = "") -> dict:
    kit = _get_kit()
    await kit.initialize()

    # Check threshold
    threshold = float(_settings.approval_threshold)
    if amount >= threshold:
        # Request approval first
        result = await _api.create_approval(
            _settings.corpus_id,
            type_="transaction",
            title=f"HBAR transfer: {amount} to {to_account}",
            description=reason,
            amount=amount,
        )
        return {
            "status": "approval_requested",
            "approval_id": result.get("id") if result else None,
            "amount": amount,
            "to": to_account,
        }

    return await kit.transfer_hbar(to_account, amount)


@tool("get_hbar_balance", "Check the agent's current HBAR balance on Hedera")
async def get_hbar_balance() -> dict:
    kit = _get_kit()
    await kit.initialize()
    return await kit.get_balance()


@tool("create_pulse_token", "Create a new Pulse (equity) token via HTS. Requires approval.")
async def create_pulse_token(name: str, symbol: str, initial_supply: int = 1000000) -> dict:
    # Token creation always requires approval
    result = await _api.create_approval(
        _settings.corpus_id,
        type_="transaction",
        title=f"Create Pulse token: {name} ({symbol})",
        description=f"Initial supply: {initial_supply}",
    )
    return {
        "status": "approval_requested",
        "approval_id": result.get("id") if result else None,
        "action": "create_pulse_token",
        "name": name,
        "symbol": symbol,
    }


@tool("airdrop_pulse", "Distribute Pulse tokens to Patron accounts. Requires approval.")
async def airdrop_pulse(token_id: str, recipients: str) -> dict:
    """recipients: JSON string of [{account: '0.0.xxx', amount: 1000}, ...]"""
    result = await _api.create_approval(
        _settings.corpus_id,
        type_="transaction",
        title=f"Pulse airdrop: token {token_id}",
        description=f"Recipients: {recipients}",
    )
    return {
        "status": "approval_requested",
        "approval_id": result.get("id") if result else None,
        "action": "airdrop_pulse",
    }


@tool("get_pulse_balance", "Check Pulse token balance for a specific account")
async def get_pulse_balance(account_id: str, token_id: str) -> dict:
    kit = _get_kit()
    await kit.initialize()
    return await kit.get_token_balance(account_id, token_id)
