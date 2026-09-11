"""
schemas.py — Shared Pydantic schemas used across multiple API modules.
Eliminates duplication between api_admin.py and api_clinic.py.
"""
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator


# ─── Clinic Schemas ───────────────────────────────────────────────────────────
class ClinicCreate(BaseModel):
    name: str
    address: Optional[str] = None
    phone_call: Optional[str] = None


class ClinicResponse(ClinicCreate):
    id: str

    class Config:
        from_attributes = True


# ─── User / Doctor Schemas ────────────────────────────────────────────────────
ALLOWED_ROLES = {"admin", "clinic_admin", "doctor", "technician", "reception", "user"}


class UserCreate(BaseModel):
    full_name: str
    email: str
    password: str
    role: str = "user"
    clinic_id: Optional[str] = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in ALLOWED_ROLES:
            raise ValueError(f"الدور '{v}' غير مدعوم. الأدوار المسموحة: {', '.join(ALLOWED_ROLES)}")
        return v


class UserUpdate(BaseModel):
    role: Optional[str] = None
    clinic_id: Optional[str] = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ALLOWED_ROLES:
            raise ValueError(f"الدور '{v}' غير مدعوم.")
        return v


class UserResponse(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    clinic_id: Optional[str] = None
    is_active: bool = True

    class Config:
        from_attributes = True
