import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from ..models.enums import UserRole


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
