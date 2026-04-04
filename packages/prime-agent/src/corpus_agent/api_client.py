"""Web API client — all communication between Local Agent and Corpus Web."""

from __future__ import annotations

from typing import Any

import httpx

from corpus_agent.config import Settings


class CorpusAPIClient:
    def __init__(self, settings: Settings):
        self._base = settings.corpus_api_url.rstrip("/")
        self._corpus_id = settings.corpus_id
        self._client = httpx.AsyncClient(
            base_url=self._base,
            headers={
                "Authorization": f"Bearer {settings.corpus_api_key}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )

    # ── Corpus Config ──────────────────────────────────────

    async def get_corpus(self, corpus_id: str) -> dict | None:
        r = await self._client.get(f"/api/corpus/{corpus_id}")
        if r.status_code == 200:
            return r.json()
        return None

    # ── Activity Reporting ─────────────────────────────────

    async def report_activity(
        self, corpus_id: str, *, type_: str, content: str, channel: str
    ) -> dict | None:
        r = await self._client.post(
            f"/api/corpus/{corpus_id}/activity",
            json={"type": type_, "content": content, "channel": channel},
        )
        if r.status_code in (200, 201):
            return r.json()
        return None

    # ── Status ─────────────────────────────────────────────

    async def update_status(self, corpus_id: str, *, online: bool) -> None:
        await self._client.patch(
            f"/api/corpus/{corpus_id}/status",
            json={"agentOnline": online},
        )

    # ── Revenue ────────────────────────────────────────────

    async def report_revenue(
        self, corpus_id: str, *, amount: float, source: str, tx_hash: str | None = None
    ) -> dict | None:
        r = await self._client.post(
            f"/api/corpus/{corpus_id}/revenue",
            json={"amount": amount, "currency": "USDC", "source": source, "txHash": tx_hash},
        )
        if r.status_code in (200, 201):
            return r.json()
        return None

    # ── Approvals ──────────────────────────────────────────

    async def create_approval(
        self,
        corpus_id: str,
        *,
        type_: str,
        title: str,
        description: str | None = None,
        amount: float | None = None,
    ) -> dict | None:
        r = await self._client.post(
            f"/api/corpus/{corpus_id}/approvals",
            json={"type": type_, "title": title, "description": description, "amount": amount},
        )
        if r.status_code in (200, 201):
            return r.json()
        return None

    async def get_approvals(self, corpus_id: str, status: str | None = None) -> list[dict]:
        params: dict[str, Any] = {}
        if status:
            params["status"] = status
        r = await self._client.get(f"/api/corpus/{corpus_id}/approvals", params=params)
        if r.status_code == 200:
            data = r.json()
            return data if isinstance(data, list) else data.get("approvals", [])
        return []

    async def get_approval(self, corpus_id: str, approval_id: str) -> dict | None:
        r = await self._client.get(f"/api/corpus/{corpus_id}/approvals/{approval_id}")
        if r.status_code == 200:
            return r.json()
        return None

    # ── Agent Wallet (Circle MPC) ────────────────────────────

    async def get_agent_wallet(self) -> dict | None:
        """Fetch agent wallet info (walletId, address) from Web."""
        r = await self._client.get(f"/api/corpus/{self._corpus_id}/wallet")
        if r.status_code == 200:
            return r.json()
        return None

    async def sign_payment(
        self,
        *,
        payee: str,
        amount: int,
        token_address: str | None = None,
        chain_id: int | None = None,
    ) -> dict | None:
        """Request x402 payment signature from Web's Circle MPC proxy."""
        payload: dict[str, Any] = {"payee": payee, "amount": amount}
        if token_address:
            payload["tokenAddress"] = token_address
        if chain_id:
            payload["chainId"] = chain_id
        r = await self._client.post(f"/api/corpus/{self._corpus_id}/sign", json=payload)
        if r.status_code == 200:
            return r.json()
        # Return error details
        try:
            return r.json()
        except Exception:
            return {"error": f"Sign request failed with status {r.status_code}"}

    # ── Commerce / x402 ────────────────────────────────────

    async def get_service(self, corpus_id: str, service_type: str | None = None) -> httpx.Response:
        """GET service endpoint — expects 402 response with payment details."""
        params = {}
        if service_type:
            params["type"] = service_type
        return await self._client.get(f"/api/corpus/{corpus_id}/service", params=params)

    async def submit_commerce(
        self, corpus_id: str, *, payment_header: str, payload: dict | None = None
    ) -> dict | None:
        """POST with x402 payment signature to purchase service."""
        r = await self._client.post(
            f"/api/corpus/{corpus_id}/service",
            json={"payload": payload},
            headers={"X-PAYMENT": payment_header},
        )
        if r.status_code in (200, 201):
            return r.json()
        return None

    async def discover_services(
        self, category: str | None = None, target: str | None = None
    ) -> list[dict]:
        params: dict[str, Any] = {}
        if category:
            params["category"] = category
        if target:
            params["target"] = target
        r = await self._client.get("/api/services", params=params)
        if r.status_code == 200:
            data = r.json()
            return data if isinstance(data, list) else data.get("services", [])
        return []

    async def register_service(
        self,
        corpus_id: str,
        *,
        service_name: str,
        description: str,
        price: float,
        wallet_address: str | None = None,
    ) -> dict | None:
        """Register or update this Corpus's x402 service on the marketplace."""
        payload: dict[str, Any] = {
            "serviceName": service_name,
            "description": description,
            "price": price,
        }
        if wallet_address:
            payload["walletAddress"] = wallet_address
        r = await self._client.put(f"/api/corpus/{corpus_id}/service", json=payload)
        if r.status_code in (200, 201):
            return r.json()
        return None

    # ── Jobs ───────────────────────────────────────────────

    async def get_pending_jobs(self) -> list[dict]:
        r = await self._client.get("/api/jobs/pending")
        if r.status_code == 200:
            data = r.json()
            return data if isinstance(data, list) else data.get("jobs", [])
        return []

    async def submit_job_result(self, job_id: str, result: dict) -> dict | None:
        r = await self._client.post(f"/api/jobs/{job_id}/result", json={"result": result})
        if r.status_code in (200, 201):
            return r.json()
        return None

    async def get_job_result(self, job_id: str) -> dict | None:
        r = await self._client.get(f"/api/jobs/{job_id}/result")
        if r.status_code == 200:
            return r.json()
        return None

    # ── Lifecycle ──────────────────────────────────────────

    async def close(self) -> None:
        await self._client.aclose()
