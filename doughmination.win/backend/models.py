from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone

class User(BaseModel):
    id: str
    username: str
    password_hash: str
    display_name: Optional[str] = None
    is_admin: bool = False
    is_owner: bool = False
    is_pet: bool = False
    avatar_url: Optional[str] = None

class UserCreate(BaseModel):
    username: str
    password: str
    display_name: Optional[str] = None
    is_admin: bool = False
    is_pet: bool = False

class UserResponse(BaseModel):
    id: str
    username: str
    display_name: Optional[str] = None
    is_admin: bool = False
    is_owner: bool = False
    is_pet: bool = False
    avatar_url: Optional[str] = None

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None
    avatar_url: Optional[str] = None
    is_admin: Optional[bool] = None
    is_pet: Optional[bool] = None

class MentalState(BaseModel):
    level: str  # safe, unstable, idealizing, self-harming, highly at risk
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes: Optional[str] = None

class SystemInfo(BaseModel):
    id: str
    name: str
    description: Optional[str]
    tag: Optional[str]
    mental_state: Optional[MentalState] = None