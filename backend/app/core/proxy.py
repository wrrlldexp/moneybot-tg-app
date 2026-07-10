"""Proxy requests to trading bot servers."""

from __future__ import annotations

import httpx

from app.models.server import TradingServer

TIMEOUT = httpx.Timeout(15.0, connect=5.0)


async def proxy_get(server: TradingServer, path: str) -> dict | None:
    """GET request to a trading server."""
    headers = {}
    if server.api_token:
        headers["Authorization"] = f"Bearer {server.api_token}"
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(f"{server.url}{path}", headers=headers)
            if resp.status_code == 200:
                return resp.json()
    except Exception:
        pass
    return None


async def proxy_post(server: TradingServer, path: str, json_data: dict | None = None) -> dict | None:
    """POST request to a trading server."""
    headers = {}
    if server.api_token:
        headers["Authorization"] = f"Bearer {server.api_token}"
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.post(f"{server.url}{path}", headers=headers, json=json_data)
            if resp.status_code in (200, 201):
                return resp.json()
    except Exception:
        pass
    return None


async def ping_server(server: TradingServer) -> str:
    """Check if trading server is reachable. Returns 'ok' / 'error' / 'timeout'."""
    headers = {}
    if server.api_token:
        headers["Authorization"] = f"Bearer {server.api_token}"
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
            resp = await client.get(f"{server.url}/health", headers=headers)
            return "ok" if resp.status_code == 200 else "error"
    except httpx.TimeoutException:
        return "timeout"
    except Exception:
        return "error"
