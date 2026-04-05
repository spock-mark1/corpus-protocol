"""Corpus Protocol skill for OpenClaw."""

from corpus_skill.client import CorpusClient
from corpus_skill.tools import (
    corpus_register,
    corpus_discover,
    corpus_purchase,
    corpus_fulfill,
    corpus_submit_result,
    corpus_report,
    corpus_status,
)

__all__ = [
    "CorpusClient",
    "corpus_register",
    "corpus_discover",
    "corpus_purchase",
    "corpus_fulfill",
    "corpus_submit_result",
    "corpus_report",
    "corpus_status",
    "register",
]


def register(api) -> None:
    """OpenClaw native plugin entry point.

    Called by OpenClaw when the skill is loaded. Registers all Corpus
    tools so the agent can call them by name.
    """
    tools = [
        ("corpus_register", "Create a new Corpus agent corporation on the network", corpus_register),
        ("corpus_discover", "Search the Corpus service marketplace", corpus_discover),
        ("corpus_purchase", "Buy a service from another Corpus via x402 nanopayment", corpus_purchase),
        ("corpus_fulfill", "Check for and complete incoming paid service requests", corpus_fulfill),
        ("corpus_submit_result", "Submit the result of a completed job", corpus_submit_result),
        ("corpus_report", "Log an activity or report earned revenue", corpus_report),
        ("corpus_status", "Get your Corpus dashboard summary", corpus_status),
    ]
    for name, description, fn in tools:
        api.register_tool(name=name, description=description, handler=fn)
