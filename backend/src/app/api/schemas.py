import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str  # workspace name — created automatically on register


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Workspace
# ---------------------------------------------------------------------------

class WorkspaceCreate(BaseModel):
    name: str


class WorkspaceOut(BaseModel):
    id: uuid.UUID
    name: str
    plan: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Server + API key
# ---------------------------------------------------------------------------

class ServerCreate(BaseModel):
    name: str

class ContainerOut(BaseModel):
    id: uuid.UUID
    name: str
    status: str | None = None
    last_status: str | None = None

    model_config = {"from_attributes": True}

class ServerOut(BaseModel):
    id: uuid.UUID
    name: str
    last_seen_at: datetime | None
    created_at: datetime

    containers: list["ContainerOut"] = []

    model_config = {"from_attributes": True}

class ServerCreatedResponse(BaseModel):
    """Returned ONCE on server creation — includes the raw API key.
    We never show this again. User must copy it now."""
    server: ServerOut
    api_key: str  # raw key — shown once, then discarded