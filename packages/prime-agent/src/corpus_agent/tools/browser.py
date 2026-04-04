"""Browser tools — Stagehand-powered GTM actions on local Chrome."""

from __future__ import annotations

import asyncio
import functools
from typing import TYPE_CHECKING, Any, Callable

from corpus_agent.tools.registry import tool

if TYPE_CHECKING:
    from corpus_agent.browser.session import BrowserSession

# Injected by registry.build_all_tools
_browser: BrowserSession = None  # type: ignore[assignment]

BROWSER_TIMEOUT = 60  # seconds per browser action


def _browser_safe(fn: Callable) -> Callable:
    """Wrap a browser tool with timeout, error handling, and auto-reconnect."""

    @functools.wraps(fn)
    async def wrapper(*args: Any, **kwargs: Any) -> dict:
        if _browser is None:
            return {"error": "Browser session not initialized"}
        try:
            return await asyncio.wait_for(fn(*args, **kwargs), timeout=BROWSER_TIMEOUT)
        except asyncio.TimeoutError:
            return {"error": f"Browser action timed out after {BROWSER_TIMEOUT}s"}
        except Exception as e:
            err_name = type(e).__name__
            # Attempt reconnect on session-level failures
            if "session" in str(e).lower() or "closed" in str(e).lower():
                try:
                    await _browser.reconnect()
                    return await asyncio.wait_for(fn(*args, **kwargs), timeout=BROWSER_TIMEOUT)
                except Exception as retry_err:
                    return {"error": f"Browser reconnect failed: {type(retry_err).__name__}: {retry_err}"}
            return {"error": f"Browser error ({err_name}): {e}"}

    return wrapper


@tool("search_web", "Search Google and return top results for market research")
@_browser_safe
async def search_web(query: str) -> dict:
    await _browser.goto("https://www.google.com")
    await _browser.act(f"Type '{query}' in the search bar and press Enter")
    results = await _browser.extract(
        "Extract the title, URL, and summary snippet of the top 5 search results",
    )
    return {"query": query, "results": results}


@tool("browse_page", "Visit a URL and extract information based on instructions")
@_browser_safe
async def browse_page(url: str, instruction: str) -> dict:
    await _browser.goto(url)
    data = await _browser.extract(instruction)
    return {"url": url, "data": data}


@tool("post_to_x", "Post a tweet on X (Twitter) using the local browser")
@_browser_safe
async def post_to_x(content: str) -> dict:
    await _browser.goto("https://x.com/compose/post")
    await _browser.act(f"Type the following text in the post compose area: {content}")
    await _browser.act("Click the Post button to publish the tweet")
    return {"status": "posted", "content": content, "channel": "X"}


@tool("check_x_mentions", "Check X notifications/mentions and return unread items")
@_browser_safe
async def check_x_mentions() -> dict:
    await _browser.goto("https://x.com/notifications/mentions")
    mentions = await _browser.extract(
        "Extract the latest 10 mentions: author handle, text content, tweet URL, and timestamp"
    )
    return {"mentions": mentions}


@tool("reply_on_x", "Reply to a specific tweet on X")
@_browser_safe
async def reply_on_x(tweet_url: str, content: str) -> dict:
    await _browser.goto(tweet_url)
    await _browser.act("Click the reply button")
    await _browser.act(f"Type the following reply: {content}")
    await _browser.act("Click the Reply button to post")
    return {"status": "replied", "tweet_url": tweet_url, "content": content}


@tool("search_x", "Search X for keywords and extract relevant posts")
@_browser_safe
async def search_x(query: str) -> dict:
    await _browser.goto(f"https://x.com/search?q={query}&src=typed_query&f=live")
    results = await _browser.extract(
        "Extract the top 10 posts: author handle, text content, engagement (likes, reposts), and tweet URL"
    )
    return {"query": query, "results": results}
