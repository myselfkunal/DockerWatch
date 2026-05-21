import hashlib
from http import server
import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.api.schemas import (
    ServerCreate,
    ServerCreatedResponse,
    ServerOut,
    WorkspaceCreate,
    WorkspaceOut,
)
from app.db.models import Server, User, Workspace
from app.db.session import get_db

router = APIRouter(prefix="/workspaces", tags=["workspaces"])

# Plan limits
PLAN_LIMITS = {
    "free":  {"servers": 1},
    "pro":   {"servers": 5},
    "team":  {"servers": 999},
}


def _hash_api_key(raw_key: str) -> str:
    """SHA-256 hash of the raw API key — only the hash is stored."""
    return hashlib.sha256(raw_key.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Workspaces
# ---------------------------------------------------------------------------

@router.get("/", response_model=list[WorkspaceOut])
async def list_workspaces(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Workspace).where(Workspace.owner_id == current_user.id)
    )
    return result.scalars().all()


@router.post("/", response_model=WorkspaceOut, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    body: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace = Workspace(name=body.name, owner_id=current_user.id, plan="free")
    db.add(workspace)
    await db.flush()

    # subscription = Subscription(workspace_id=workspace.id, status="active")
    # db.add(subscription)
    # await db.commit()
    # await db.refresh(workspace)
    # return workspace


@router.get("/{workspace_id}", response_model=WorkspaceOut)
async def get_workspace(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace = await _get_owned_workspace(workspace_id, current_user.id, db)
    return workspace


# ---------------------------------------------------------------------------
# Servers (nested under workspace)
# ---------------------------------------------------------------------------

@router.get("/{workspace_id}/servers", response_model=list[ServerOut])
async def list_servers(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_workspace(workspace_id, current_user.id, db)

    result = await db.execute(
        select(Server)
        .options(selectinload(Server.containers))
        .where(Server.workspace_id == workspace_id)
    )

    return result.scalars().all()


@router.post(
    "/{workspace_id}/servers",
    response_model=ServerCreatedResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_server(
    workspace_id: uuid.UUID,
    body: ServerCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    workspace = await _get_owned_workspace(workspace_id, current_user.id, db)

    # Enforce plan server limit
    result = await db.execute(
        select(Server).where(Server.workspace_id == workspace_id)
    )
    current_count = len(result.scalars().all())
    limit = PLAN_LIMITS[workspace.plan]["servers"]

    if current_count >= limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your {workspace.plan} plan allows {limit} server(s). Upgrade to add more.",
        )

    # Generate API key — shown ONCE, then we only store the hash
    raw_key = f"dw_{secrets.token_urlsafe(32)}"
    key_hash = _hash_api_key(raw_key)

    server = Server(
        workspace_id=workspace_id,
        name=body.name,
        api_key_hash=key_hash,
    )
    db.add(server)
    await db.commit()
    await db.refresh(server)

    await db.refresh(server)

    return ServerCreatedResponse(
        server=server,
        api_key=raw_key
    )


@router.delete("/{workspace_id}/servers/{server_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_server(
    workspace_id: uuid.UUID,
    server_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_workspace(workspace_id, current_user.id, db)

    result = await db.execute(
        select(Server).where(Server.id == server_id, Server.workspace_id == workspace_id)
    )
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Server not found")

    await db.delete(server)
    await db.commit()


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

async def _get_owned_workspace(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> Workspace:
    result = await db.execute(
        select(Workspace).where(
            Workspace.id == workspace_id,
            Workspace.owner_id == user_id,
        )
    )
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    return workspace