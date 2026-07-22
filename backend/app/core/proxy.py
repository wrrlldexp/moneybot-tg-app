"""Proxy requests to trading bot servers with auto token refresh."""

from __future__ import annotations

import ipaddress
import logging
import time
from urllib.parse import urlparse

import httpx
from fastapi import HTTPException

from app.models.server import TradingServer

logger = logging.getLogger(__name__)

TIMEOUT = httpx.Timeout(15.0, connect=5.0)
LIMITS = httpx.Limits(max_connections=100, max_keepalive_connections=20)

# Module-level reusable client — created lazily, closed on app shutdown.
_client: httpx.AsyncClient | None = None


async def get_client() -> httpx.AsyncClient:
    """Return the shared httpx client, creating it if needed."""
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=TIMEOUT, limits=LIMITS)
    return _client


async def close_client() -> None:
    """Close the shared httpx client (call from app shutdown)."""
    global _client
    if _client is not None and not _client.is_closed:
        await _client.aclose()
        _client = None


# ---------------------------------------------------------------------------
# SSRF protection
# ---------------------------------------------------------------------------

_PRIVATE_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]


def _validate_url(url: str) -> None:
    """Reject URLs targeting private/internal networks or containing path traversal."""
    parsed = urlparse(url)
    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(status_code=400, detail="Invalid server URL")

    # Block localhost variants
    if hostname in ("localhost", "0.0.0.0"):
        raise HTTPException(status_code=400, detail="Requests to internal addresses are forbidden")

    # Resolve hostname to IP and check against private ranges
    try:
        addr = ipaddress.ip_address(hostname)
        for net in _PRIVATE_NETWORKS:
            if addr in net:
                raise HTTPException(
                    status_code=400,
                    detail="Requests to internal addresses are forbidden",
                )
    except ValueError:
        # hostname is a domain name, not an IP — allow it
        pass

    # Path traversal check
    if parsed.path and ".." in parsed.path.split("/"):
        raise HTTPException(status_code=400, detail="Path traversal is not allowed")


def _sanitize_path(path: str) -> str:
    """Reject path components containing '..'."""
    parts = path.split("/")
    if ".." in parts:
        raise HTTPException(status_code=400, detail="Path traversal is not allowed")
    return path


# ---------------------------------------------------------------------------
# Server communication helpers
# ---------------------------------------------------------------------------


async def _login_to_server(server: TradingServer) -> bool:
    """Login to trading server using stored email/password, update tokens."""
    if not server.server_email or not server.server_password:
        return False
    try:
        client = await get_client()
        resp = await client.post(
            f"{server.url}/api/auth/login",
            json={"email": server.server_email, "password": server.server_password},
        )
        if resp.status_code == 200:
            data = resp.json()
            tokens = data.get("tokens", data)
            server.api_token = tokens.get("access_token")
            server.refresh_token = tokens.get("refresh_token")
            return True
    except httpx.TimeoutException:
        logger.warning("Login to %s timed out", server.url)
    except httpx.ConnectError as e:
        logger.warning("Login to %s connection failed: %s", server.url, e)
    except httpx.HTTPStatusError as e:
        logger.warning("Login to %s HTTP error: %s", server.url, e)
    return False


async def _refresh_token(server: TradingServer) -> bool:
    """Refresh access token using refresh_token."""
    if not server.refresh_token:
        return False
    try:
        client = await get_client()
        resp = await client.post(
            f"{server.url}/api/auth/refresh",
            json={"refresh_token": server.refresh_token},
        )
        if resp.status_code == 200:
            data = resp.json()
            server.api_token = data.get("access_token", server.api_token)
            if "refresh_token" in data:
                server.refresh_token = data["refresh_token"]
            return True
    except httpx.TimeoutException:
        logger.warning("Refresh token for %s timed out", server.url)
    except httpx.ConnectError as e:
        logger.warning("Refresh token for %s connection failed: %s", server.url, e)
    except httpx.HTTPStatusError as e:
        logger.warning("Refresh token for %s HTTP error: %s", server.url, e)
    return False


def _headers(server: TradingServer) -> dict:
    h = {}
    if server.api_token:
        h["Authorization"] = f"Bearer {server.api_token}"
    return h


async def _request_with_retry(server: TradingServer, method: str, path: str, **kwargs) -> httpx.Response:
    """Make request, retry with token refresh / re-login on 401.

    Raises HTTPException with appropriate status codes on failure.
    """
    _validate_url(server.url)
    path = _sanitize_path(path)

    try:
        client = await get_client()
        resp = await getattr(client, method)(
            f"{server.url}{path}", headers=_headers(server), **kwargs,
        )
        if resp.status_code == 401:
            # Try refresh then re-login
            if await _refresh_token(server) or await _login_to_server(server):
                resp = await getattr(client, method)(
                    f"{server.url}{path}", headers=_headers(server), **kwargs,
                )
            if resp.status_code == 401:
                raise HTTPException(status_code=401, detail="Authentication with trading server failed")
        return resp
    except HTTPException:
        raise
    except httpx.TimeoutException as e:
        logger.warning("Proxy %s %s%s timed out: %s", method.upper(), server.url, path, e)
        raise HTTPException(status_code=504, detail="Trading server request timed out") from e
    except httpx.ConnectError as e:
        logger.warning("Proxy %s %s%s connection failed: %s", method.upper(), server.url, path, e)
        raise HTTPException(status_code=502, detail="Cannot connect to trading server") from e
    except httpx.HTTPStatusError as e:
        logger.warning("Proxy %s %s%s HTTP error: %s", method.upper(), server.url, path, e)
        raise HTTPException(status_code=502, detail="Trading server returned an error") from e


async def proxy_get(server: TradingServer, path: str, params: dict | None = None) -> dict | list | None:
    resp = await _request_with_retry(server, "get", path, params=params)
    if resp.status_code == 200:
        return resp.json()
    return None


async def proxy_post(server: TradingServer, path: str, json_data: dict | None = None) -> dict | list | None:
    resp = await _request_with_retry(server, "post", path, json=json_data)
    if resp.status_code in (200, 201):
        return resp.json()
    return None


async def proxy_put(server: TradingServer, path: str, json_data: dict | None = None) -> dict | list | None:
    resp = await _request_with_retry(server, "put", path, json=json_data)
    if resp.status_code in (200, 201):
        return resp.json()
    return None


async def proxy_delete(server: TradingServer, path: str) -> dict | None:
    resp = await _request_with_retry(server, "delete", path)
    if resp.status_code in (200, 204):
        try:
            return resp.json()
        except Exception:
            return {"success": True}
    return None


async def ping_server(server: TradingServer) -> str:
    try:
        _validate_url(server.url)
        client = await get_client()
        resp = await client.get(
            f"{server.url}/health",
            headers=_headers(server),
            timeout=httpx.Timeout(5.0),
        )
        return "ok" if resp.status_code == 200 else "error"
    except httpx.TimeoutException:
        return "timeout"
    except (httpx.ConnectError, HTTPException):
        return "error"
