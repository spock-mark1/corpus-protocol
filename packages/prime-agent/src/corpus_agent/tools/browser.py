"""Browser tools — Stagehand-powered GTM actions on local Chrome."""

from __future__ import annotations

import asyncio
import functools
from typing import TYPE_CHECKING, Any, Callable

from rich.console import Console

from corpus_agent.tools.registry import tool

if TYPE_CHECKING:
    from corpus_agent.browser.session import BrowserSession
    from corpus_agent.config import Settings

console = Console()

# Injected by registry.build_all_tools
_browser: BrowserSession = None  # type: ignore[assignment]
_settings: Settings = None  # type: ignore[assignment]

BROWSER_TIMEOUT = 90  # seconds per browser action
_x_logged_in = False


async def _ensure_x_login() -> None:
    """Navigate to X and log in if not already authenticated."""
    global _x_logged_in
    if _x_logged_in:
        return

    if not _settings or not _settings.x_username or not _settings.x_password:
        console.print("[yellow]X credentials not configured — skipping login.[/yellow]")
        return

    console.print("[dim]Checking X login status...[/dim]")
    await _browser.goto("https://x.com/home")
    await asyncio.sleep(3)

    # Check if we landed on login page or got redirected
    page_info = await _browser.extract(
        "Is the user logged in to X/Twitter? "
        "If you see a compose/post box or timeline feed → logged_in: true. "
        "If you see a login form, sign-in button, or 'Sign in' text → logged_in: false.",
        schema={"type": "object", "properties": {"logged_in": {"type": "boolean"}}, "required": ["logged_in"]},
    )

    is_logged_in = bool(page_info.get("logged_in")) if isinstance(page_info, dict) else False
    console.print(f"[dim]Login check result: {page_info}[/dim]")

    if is_logged_in:
        console.print("[green]Already logged in to X.[/green]")
        _x_logged_in = True
        return

    console.print("[bold]Logging in to X...[/bold]")

    # Step 1: Go to login page
    await _browser.goto("https://x.com/i/flow/login")
    await asyncio.sleep(4)

    # Step 2: Enter username
    await _browser.act(f"Click on the username or email input field and type: {_settings.x_username}")
    await asyncio.sleep(2)
    await _browser.act("Click the Next button")
    await asyncio.sleep(4)

    # Step 3: X sometimes asks for email/phone verification before password
    verification_check = await _browser.extract(
        "What is the current page asking for? "
        "If it asks for email or phone verification → type: 'verification'. "
        "If it shows a password field → type: 'password'. "
        "If it shows something else → type: 'other'.",
        schema={"type": "object", "properties": {"type": {"type": "string"}}, "required": ["type"]},
    )

    page_type = verification_check.get("type", "other") if isinstance(verification_check, dict) else "other"
    console.print(f"[dim]Page type after username: {page_type}[/dim]")

    if page_type == "verification" and _settings.x_email:
        console.print("[dim]Email verification requested — entering email...[/dim]")
        await _browser.act(f"Click on the input field and type: {_settings.x_email}")
        await asyncio.sleep(1)
        await _browser.act("Click the Next button")
        await asyncio.sleep(4)

    # Step 4: Enter password
    await _browser.act(f"Click on the password input field and type: {_settings.x_password}")
    await asyncio.sleep(1)
    await _browser.act("Click the Log in button")
    await asyncio.sleep(5)

    # Step 5: Verify login succeeded
    post_login = await _browser.extract(
        "Is the user now logged in to X/Twitter? "
        "If you see a timeline, home feed, or compose button → logged_in: true. "
        "Otherwise → logged_in: false.",
        schema={"type": "object", "properties": {"logged_in": {"type": "boolean"}}, "required": ["logged_in"]},
    )

    success = bool(post_login.get("logged_in")) if isinstance(post_login, dict) else False
    console.print(f"[dim]Post-login check: {post_login}[/dim]")

    if success:
        console.print("[bold green]Successfully logged in to X.[/bold green]")
        _x_logged_in = True
        # Dismiss password save popup if Chrome shows it
        await _dismiss_popups()
    else:
        console.print("[red]X login may have failed — continuing anyway.[/red]")


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
            if "session" in str(e).lower() or "closed" in str(e).lower() or "500" in str(e):
                try:
                    global _x_logged_in
                    _x_logged_in = False
                    await _browser.reconnect()
                    return await asyncio.wait_for(fn(*args, **kwargs), timeout=BROWSER_TIMEOUT)
                except Exception as retry_err:
                    return {"error": f"Browser reconnect failed: {type(retry_err).__name__}: {retry_err}"}
            return {"error": f"Browser error ({err_name}): {e}"}

    return wrapper


def _x_login_required(fn: Callable) -> Callable:
    """Ensure X login before executing the wrapped tool."""

    @functools.wraps(fn)
    async def wrapper(*args: Any, **kwargs: Any) -> dict:
        await _ensure_x_login()
        return await fn(*args, **kwargs)

    return wrapper


@tool("search_web", "Search Google and return top results for market research")
@_browser_safe
async def search_web(query: str) -> dict:
    import urllib.parse
    search_url = f"https://www.google.com/search?q={urllib.parse.quote_plus(query)}&hl=en"
    await _browser.goto(search_url)
    await asyncio.sleep(3)
    # Dismiss any popups (cookie consent, password save, etc.)
    await _dismiss_popups()
    results = await _browser.extract(
        "Extract the title, URL, and summary snippet of the top 5 search results",
    )
    return {"query": query, "results": results}


async def _dismiss_popups() -> None:
    """Dismiss common browser popups (cookie consent, password save, etc.)."""
    try:
        popup_check = await _browser.extract(
            "Are there any popups or dialogs blocking the page? "
            "For example: cookie consent, password save prompt, notification request. "
            "Return {\"has_popup\": true, \"type\": \"cookie|password|notification|other\"} or {\"has_popup\": false}.",
            schema={"type": "object", "properties": {"has_popup": {"type": "boolean"}, "type": {"type": "string"}}, "required": ["has_popup"]},
        )
        if isinstance(popup_check, dict) and popup_check.get("has_popup"):
            popup_type = popup_check.get("type", "other")
            if popup_type == "password":
                await _browser.act("Click 'Never' or 'No thanks' or the dismiss button on the password save dialog")
            elif popup_type == "cookie":
                await _browser.act("Click 'Accept all' or 'Reject all' or 'Tout accepter' or 'Tout refuser' to dismiss the cookie dialog")
            else:
                await _browser.act("Dismiss or close the popup dialog")
            await asyncio.sleep(2)
    except Exception:
        pass


@tool("browse_page", "Visit a URL and extract information based on instructions")
@_browser_safe
async def browse_page(url: str, instruction: str) -> dict:
    await _browser.goto(url)
    data = await _browser.extract(instruction)
    return {"url": url, "data": data}


@tool("post_to_x", "Post a tweet on X (Twitter). Content MUST be under 280 characters, plain text only.")
@_browser_safe
@_x_login_required
async def post_to_x(content: str) -> dict:
    if len(content) > 280:
        return {"error": f"Post is {len(content)} chars — exceeds 280 char limit. Shorten it and try again."}
    await _browser.goto("https://x.com/compose/post")
    await asyncio.sleep(3)
    await _browser.act(f"Click on the post text area and type exactly: {content}")
    await asyncio.sleep(2)

    # Click the Post button using CSS selector for reliability
    await _browser.act("Click the button with text 'Post' at the bottom right of the compose dialog")
    await asyncio.sleep(5)

    # Verify the post was actually published by checking if compose dialog closed
    verify = await _browser.extract(
        "Is the compose/post dialog still open? "
        "If you see the compose text area with a Post button → still_open: true. "
        "If the dialog closed and you see the timeline → still_open: false.",
        schema={"type": "object", "properties": {"still_open": {"type": "boolean"}}, "required": ["still_open"]},
    )

    still_open = bool(verify.get("still_open")) if isinstance(verify, dict) else True
    if still_open:
        return {"error": "Post button click failed — compose dialog is still open. Tweet was NOT published."}

    return {"status": "posted", "content": content, "channel": "X"}


@tool("check_x_mentions", "Check X notifications/mentions and return unread items")
@_browser_safe
@_x_login_required
async def check_x_mentions() -> dict:
    await _browser.goto("https://x.com/notifications/mentions")
    await asyncio.sleep(2)
    mentions = await _browser.extract(
        "Extract the latest 10 mentions: author handle, text content, tweet URL, and timestamp"
    )
    return {"mentions": mentions}


@tool("reply_on_x", "Reply to a specific tweet on X")
@_browser_safe
@_x_login_required
async def reply_on_x(tweet_url: str, content: str) -> dict:
    await _browser.goto(tweet_url)
    await asyncio.sleep(2)
    await _browser.act("Click the reply button")
    await _browser.act(f"Type the following reply: {content}")
    await _browser.act("Click the Reply button to post")
    return {"status": "replied", "tweet_url": tweet_url, "content": content}


@tool("search_x", "Search X for keywords and extract relevant posts")
@_browser_safe
@_x_login_required
async def search_x(query: str) -> dict:
    await _browser.goto(f"https://x.com/search?q={query}&src=typed_query&f=live")
    await asyncio.sleep(2)
    results = await _browser.extract(
        "Extract the top 10 posts: author handle, text content, engagement (likes, reposts), and tweet URL"
    )
    return {"query": query, "results": results}
