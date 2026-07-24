from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=200)
    name: str = Field(..., min_length=1, max_length=120)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime


class UserOut(BaseModel):
    id: UUID
    email: EmailStr
    name: str | None
    avatar_url: str | None
    is_active: bool

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    user: UserOut
    token: TokenResponse
