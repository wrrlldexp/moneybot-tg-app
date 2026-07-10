"""Trading server management — CRUD + proxy to trading bots."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.proxy import ping_server, proxy_get, proxy_post
from app.db import get_db
from app.models.server import TradingServer
from app.models.user import User

router = APIRouter()


# --- Schemas ---

class ServerCreate(BaseModel):
    name: str
    url: str
    api_token: str | None = None


class ServerUpdate(BaseModel):
    name: str | None = None
    url: str | None = None
    api_token: str | None = None
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
        raise HTTPException(status_code=404, detail="Server not found")
    return server


def _to_response(s: TradingServer) -> ServerResponse:
    return ServerResponse(
        id=s.id, name=s.name, url=s.url,
        is_active=s.is_active, is_default=s.is_default,
        last_status=s.last_status,
        last_ping_at=s.last_ping_at.isoformat() if s.last_ping_at else None,
        created_at=s.created_at.isoformat() if s.created_at else "",
    )


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
    # If first server, make it default
    existing = await db.execute(
        select(TradingServer).where(TradingServer.owner_id == user.id).limit(1)
    )
    is_first = existing.scalar_one_or_none() is None

    server = TradingServer(
        owner_id=user.id,
        name=payload.name,
        url=payload.url.rstrip("/"),
        api_token=payload.api_token,
        is_default=is_first,
    )
    db.add(server)
    await db.flush()

    # Ping on create
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
        # Unset other defaults
        others = await db.execute(
            select(TradingServer).where(TradingServer.owner_id == user.id, TradingServer.id != server_id)
        )
        for s in others.scalars().all():
            s.is_default = False

    for field, value in changes.items():
        if field == "url":
            value = value.rstrip("/")
        setattr(server, field, value)

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


# --- Proxy to trading bot ---

@router.get("/{server_id}/dashboard")
async def server_dashboard(
    server_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    server = await _get_server(db, user, server_id)
    data = await proxy_get(server, "/api/dashboard/")
    if data is None:
        raise HTTPException(status_code=502, detail="Trading server unavailable")
    return data


@router.get("/{server_id}/grids")
async def server_grids(
    server_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list:
    server = await _get_server(db, user, server_id)
    data = await proxy_get(server, "/api/grids/")
    if data is None:
        raise HTTPException(status_code=502, detail="Trading server unavailable")
    return data


@router.get("/{server_id}/grids/{grid_id}")
async def server_grid_detail(
    server_id: int,
    grid_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    server = await _get_server(db, user, server_id)
    data = await proxy_get(server, f"/api/grids/{grid_id}")
    if data is None:
        raise HTTPException(status_code=502, detail="Trading server unavailable")
    return data


@router.post("/{server_id}/grids/{grid_id}/start")
async def server_grid_start(
    server_id: int,
    grid_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    server = await _get_server(db, user, server_id)
    data = await proxy_post(server, f"/api/grids/{grid_id}/start")
    if data is None:
        raise HTTPException(status_code=502, detail="Trading server unavailable")
    return data


@router.post("/{server_id}/grids/{grid_id}/stop")
async def server_grid_stop(
    server_id: int,
    grid_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    server = await _get_server(db, user, server_id)
    data = await proxy_post(server, f"/api/grids/{grid_id}/stop")
    if data is None:
        raise HTTPException(status_code=502, detail="Trading server unavailable")
    return data


@router.get("/{server_id}/bot/status")
async def server_bot_status(
    server_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    server = await _get_server(db, user, server_id)
    data = await proxy_get(server, "/api/bot/status")
    if data is None:
        raise HTTPException(status_code=502, detail="Trading server unavailable")
    return data


@router.post("/{server_id}/bot/stop-all")
async def server_bot_stop_all(
    server_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    server = await _get_server(db, user, server_id)
    data = await proxy_post(server, "/api/bot/stop-all")
    if data is None:
        raise HTTPException(status_code=502, detail="Trading server unavailable")
    return data
