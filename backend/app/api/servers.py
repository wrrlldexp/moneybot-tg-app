"""Trading server management — CRUD + full proxy to trading bots."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.alerts import publish_alert
from app.core.deps import get_current_user
from app.core.proxy import (
    ping_server, proxy_get, proxy_post, proxy_put, proxy_delete,
    _login_to_server,
)
from app.db import get_db
from app.models.server import TradingServer
from app.models.user import User

router = APIRouter()


# --- Schemas ---

class ServerCreate(BaseModel):
    name: str
    url: str
    email: str
    password: str


class ServerUpdate(BaseModel):
    name: str | None = None
    url: str | None = None
    email: str | None = None
    password: str | None = None
    is_default: bool | None = None


class ServerResponse(BaseModel):
    id: int
    name: str
    url: str
    is_active: bool
    is_default: bool
    last_status: str | None
    last_ping_at: str | None
    created_at: str


# --- Helpers ---

async def _get_server(db: AsyncSession, user: User, server_id: int) -> TradingServer:
    result = await db.execute(
        select(TradingServer).where(TradingServer.id == server_id, TradingServer.owner_id == user.id)
    )
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Сервер не найден")
    return server


def _to_response(s: TradingServer) -> ServerResponse:
    return ServerResponse(
        id=s.id, name=s.name, url=s.url,
        is_active=s.is_active, is_default=s.is_default,
        last_status=s.last_status,
        last_ping_at=s.last_ping_at.isoformat() if s.last_ping_at else None,
        created_at=s.created_at.isoformat() if s.created_at else "",
    )


def _proxy_error():
    raise HTTPException(status_code=502, detail="Торговый сервер недоступен")


# --- CRUD ---

@router.get("/", response_model=list[ServerResponse])
async def list_servers(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ServerResponse]:
    result = await db.execute(
        select(TradingServer).where(TradingServer.owner_id == user.id).order_by(TradingServer.created_at)
    )
    return [_to_response(s) for s in result.scalars().all()]


@router.post("/", response_model=ServerResponse)
async def add_server(
    payload: ServerCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ServerResponse:
    existing = await db.execute(
        select(TradingServer).where(TradingServer.owner_id == user.id).limit(1)
    )
    is_first = existing.scalar_one_or_none() is None

    server = TradingServer(
        owner_id=user.id,
        name=payload.name,
        url=payload.url.rstrip("/"),
        server_email=payload.email,
        server_password=payload.password,
        is_default=is_first,
    )
    db.add(server)
    await db.flush()

    # Auto-login to get tokens
    logged_in = await _login_to_server(server)
    if not logged_in:
        raise HTTPException(status_code=400, detail="Не удалось подключиться. Проверьте URL, email и пароль.")

    server.last_status = await ping_server(server)
    server.last_ping_at = datetime.now(UTC)

    return _to_response(server)


@router.patch("/{server_id}", response_model=ServerResponse)
async def update_server(
    server_id: int,
    payload: ServerUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ServerResponse:
    server = await _get_server(db, user, server_id)
    changes = payload.model_dump(exclude_none=True)

    if changes.get("is_default"):
        others = await db.execute(
            select(TradingServer).where(TradingServer.owner_id == user.id, TradingServer.id != server_id)
        )
        for s in others.scalars().all():
            s.is_default = False

    need_reauth = False
    for field, value in changes.items():
        if field == "url":
            value = value.rstrip("/")
        if field == "email":
            server.server_email = value
            need_reauth = True
            continue
        if field == "password":
            server.server_password = value
            need_reauth = True
            continue
        setattr(server, field, value)

    if need_reauth:
        await _login_to_server(server)

    return _to_response(server)


@router.delete("/{server_id}")
async def delete_server(
    server_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    server = await _get_server(db, user, server_id)
    await db.delete(server)
    return {"success": True}


@router.post("/{server_id}/ping")
async def ping(
    server_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    server = await _get_server(db, user, server_id)
    server.last_status = await ping_server(server)
    server.last_ping_at = datetime.now(UTC)
    return {"status": server.last_status}


# ============================================================
# PROXY TO TRADING BOT — full API mirror
# ============================================================

# --- Dashboard ---

@router.get("/{server_id}/dashboard")
async def server_dashboard(server_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Any:
    server = await _get_server(db, user, server_id)
    data = await proxy_get(server, "/api/dashboard/")
    if data is None:
        _proxy_error()
    return data


@router.get("/{server_id}/dashboard/analytics")
async def server_analytics(server_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Any:
    server = await _get_server(db, user, server_id)
    data = await proxy_get(server, "/api/dashboard/analytics")
    if data is None:
        _proxy_error()
    return data


# --- Grids ---

@router.get("/{server_id}/grids")
async def server_grids(server_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Any:
    server = await _get_server(db, user, server_id)
    data = await proxy_get(server, "/api/grids/")
    if data is None:
        _proxy_error()
    return data


@router.get("/{server_id}/grids/{grid_id}")
async def server_grid_detail(server_id: int, grid_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Any:
    server = await _get_server(db, user, server_id)
    data = await proxy_get(server, f"/api/grids/{grid_id}")
    if data is None:
        _proxy_error()
    return data


@router.post("/{server_id}/grids/{grid_id}/start")
async def server_grid_start(server_id: int, grid_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Any:
    server = await _get_server(db, user, server_id)
    data = await proxy_post(server, f"/api/grids/{grid_id}/start")
    if data is None:
        _proxy_error()
    await publish_alert(user.telegram_id, f"▶️ Сетка запущена\nСервер: {server.name}\nGrid: {grid_id[:8]}...")
    return data


@router.post("/{server_id}/grids/{grid_id}/stop")
async def server_grid_stop(server_id: int, grid_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Any:
    server = await _get_server(db, user, server_id)
    data = await proxy_post(server, f"/api/grids/{grid_id}/stop")
    if data is None:
        _proxy_error()
    await publish_alert(user.telegram_id, f"⏹ Сетка остановлена\nСервер: {server.name}\nGrid: {grid_id[:8]}...", level="warning")
    return data


@router.get("/{server_id}/grids/{grid_id}/events")
async def server_grid_events(server_id: int, grid_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Any:
    server = await _get_server(db, user, server_id)
    data = await proxy_get(server, f"/api/grids/{grid_id}/events")
    if data is None:
        _proxy_error()
    return data


@router.get("/{server_id}/grids/{grid_id}/orders")
async def server_grid_orders(server_id: int, grid_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Any:
    server = await _get_server(db, user, server_id)
    data = await proxy_get(server, f"/api/grids/{grid_id}/orders")
    if data is None:
        _proxy_error()
    return data


@router.get("/{server_id}/grids/{grid_id}/analytics-sessions")
async def server_grid_analytics(server_id: int, grid_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Any:
    server = await _get_server(db, user, server_id)
    data = await proxy_get(server, f"/api/grids/{grid_id}/analytics-sessions")
    if data is None:
        _proxy_error()
    return data


# --- Bot control ---

@router.get("/{server_id}/bot/status")
async def server_bot_status(server_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Any:
    server = await _get_server(db, user, server_id)
    data = await proxy_get(server, "/api/bot/status")
    if data is None:
        _proxy_error()
    return data


@router.post("/{server_id}/bot/stop-all")
async def server_bot_stop_all(server_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Any:
    server = await _get_server(db, user, server_id)
    data = await proxy_post(server, "/api/bot/stop-all")
    if data is None:
        _proxy_error()
    await publish_alert(user.telegram_id, f"⏹ Все сетки остановлены\nСервер: {server.name}", level="warning")
    return data


@router.post("/{server_id}/bot/emergency-stop")
async def server_bot_emergency_stop(server_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Any:
    server = await _get_server(db, user, server_id)
    data = await proxy_post(server, "/api/bot/emergency-stop")
    if data is None:
        _proxy_error()
    await publish_alert(user.telegram_id, f"🚨 АВАРИЙНАЯ ОСТАНОВКА\nСервер: {server.name}", level="error")
    return data


@router.post("/{server_id}/bot/restart")
async def server_bot_restart(server_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Any:
    server = await _get_server(db, user, server_id)
    data = await proxy_post(server, "/api/bot/restart")
    if data is None:
        _proxy_error()
    return data


@router.get("/{server_id}/bot/health-check")
async def server_bot_health_check(server_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Any:
    server = await _get_server(db, user, server_id)
    data = await proxy_get(server, "/api/bot/health-check")
    if data is None:
        _proxy_error()
    return data


# --- Accounts ---

@router.get("/{server_id}/accounts")
async def server_accounts(server_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Any:
    server = await _get_server(db, user, server_id)
    data = await proxy_get(server, "/api/accounts/")
    if data is None:
        _proxy_error()
    return data


@router.get("/{server_id}/accounts/balances")
async def server_account_balances(server_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Any:
    server = await _get_server(db, user, server_id)
    data = await proxy_get(server, "/api/accounts/balances")
    if data is None:
        _proxy_error()
    return data


@router.get("/{server_id}/accounts/{account_id}")
async def server_account_detail(server_id: int, account_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Any:
    server = await _get_server(db, user, server_id)
    data = await proxy_get(server, f"/api/accounts/{account_id}")
    if data is None:
        _proxy_error()
    return data


@router.post("/{server_id}/accounts/{account_id}/test")
async def server_account_test(server_id: int, account_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Any:
    server = await _get_server(db, user, server_id)
    data = await proxy_post(server, f"/api/accounts/{account_id}/test")
    if data is None:
        _proxy_error()
    return data


@router.get("/{server_id}/accounts/{account_id}/markets")
async def server_account_markets(server_id: int, account_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Any:
    server = await _get_server(db, user, server_id)
    data = await proxy_get(server, f"/api/accounts/{account_id}/markets")
    if data is None:
        _proxy_error()
    return data


# --- Trades ---

@router.get("/{server_id}/trades")
async def server_trades(
    server_id: int,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    grid_id: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    server = await _get_server(db, user, server_id)
    params: dict = {"limit": limit, "offset": offset}
    if grid_id:
        params["grid_id"] = grid_id
    data = await proxy_get(server, "/api/trades/", params=params)
    if data is None:
        _proxy_error()
    return data


# --- Market ---

@router.get("/{server_id}/market/ticker")
async def server_market_ticker(
    server_id: int,
    symbol: str = Query(...),
    account_id: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    server = await _get_server(db, user, server_id)
    params: dict = {"symbol": symbol}
    if account_id:
        params["account_id"] = account_id
    data = await proxy_get(server, "/api/market/ticker", params=params)
    if data is None:
        _proxy_error()
    return data


@router.get("/{server_id}/market/ohlcv")
async def server_market_ohlcv(
    server_id: int,
    symbol: str = Query(...),
    timeframe: str = Query("1h"),
    limit: int = Query(100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    server = await _get_server(db, user, server_id)
    data = await proxy_get(server, "/api/market/ohlcv", params={"symbol": symbol, "timeframe": timeframe, "limit": limit})
    if data is None:
        _proxy_error()
    return data


# --- Audit & Logs ---

@router.get("/{server_id}/audit")
async def server_audit(
    server_id: int,
    limit: int = Query(50),
    offset: int = Query(0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    server = await _get_server(db, user, server_id)
    data = await proxy_get(server, "/api/audit/", params={"limit": limit, "offset": offset})
    if data is None:
        _proxy_error()
    return data


@router.get("/{server_id}/logs")
async def server_logs(
    server_id: int,
    limit: int = Query(100),
    offset: int = Query(0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    server = await _get_server(db, user, server_id)
    data = await proxy_get(server, "/api/logs/", params={"limit": limit, "offset": offset})
    if data is None:
        _proxy_error()
    return data


# --- Grid CRUD ---

@router.post("/{server_id}/grids")
async def server_grid_create(server_id: int, body: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Any:
    server = await _get_server(db, user, server_id)
    data = await proxy_post(server, "/api/grids/", json_data=body)
    if data is None:
        _proxy_error()
    return data


@router.put("/{server_id}/grids/{grid_id}")
async def server_grid_update(server_id: int, grid_id: str, body: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Any:
    server = await _get_server(db, user, server_id)
    data = await proxy_put(server, f"/api/grids/{grid_id}", json_data=body)
    if data is None:
        _proxy_error()
    return data


@router.delete("/{server_id}/grids/{grid_id}")
async def server_grid_delete(server_id: int, grid_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Any:
    server = await _get_server(db, user, server_id)
    data = await proxy_delete(server, f"/api/grids/{grid_id}")
    if data is None:
        _proxy_error()
    return data


# --- Users (admin) ---

@router.get("/{server_id}/users")
async def server_users(server_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Any:
    server = await _get_server(db, user, server_id)
    data = await proxy_get(server, "/api/users/")
    if data is None:
        _proxy_error()
    return data
