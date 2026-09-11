import os
import secrets
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

import database
import models

logger = logging.getLogger(__name__)

# ─── Configuration ──────────────────────────────────────────────────────────
_raw_secret = os.getenv("JWT_SECRET", "")
if not _raw_secret:
    # في بيئة التطوير فقط نولّد سراً عشوائياً مع تحذير واضح
    if os.getenv("ENV", "development") == "production":
        raise RuntimeError(
            "FATAL: JWT_SECRET environment variable is not set. "
            "Set a strong secret before running in production."
        )
    _raw_secret = secrets.token_hex(32)
    logger.warning(
        "⚠️  JWT_SECRET is not set — using a random ephemeral secret. "
        "All tokens will be invalidated on restart. Set JWT_SECRET in .env for persistence."
    )

SECRET_KEY: str = _raw_secret
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))    # 8 hours
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("JWT_REFRESH_DAYS", "30"))         # 30 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ─── Password Helpers ────────────────────────────────────────────────────────
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


# ─── Token Helpers ───────────────────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a short-lived JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """Creates a long-lived JWT refresh token (30 days)."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Decodes and validates a JWT token. Raises JWTError on failure."""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


# ─── Dependency: Current Authenticated Doctor ────────────────────────────────
def get_current_doctor(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(database.get_db),
) -> models.Doctor:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="بيانات الدخول غير صالحة",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        # Reject refresh tokens from being used as access tokens
        if payload.get("type") != "access":
            raise credentials_exception
        doctor_id: str = payload.get("sub")
        if doctor_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    doctor = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()
    if doctor is None:
        raise credentials_exception
    if not getattr(doctor, "is_active", True) or not doctor.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="تم تعطيل هذا الحساب. تواصل مع مدير النظام.",
        )
    return doctor


# ─── Role Definitions ────────────────────────────────────────────────────────
ROLE_SUPER_ADMIN  = "admin"
ROLE_CLINIC_ADMIN = "clinic_admin"
ROLE_DOCTOR       = "doctor"
ROLE_TECH         = "technician"
ROLE_RECEPTION    = "reception"
ROLE_STAFF        = "user"


def require_roles(allowed_roles: list[str]):
    def role_checker(current_user: models.Doctor = Depends(get_current_doctor)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="غير مصرح لك بالوصول إلى هذه الصفحة أو تنفيذ هذه العملية",
            )
        # Clinic admin must be linked to a clinic
        if current_user.role == ROLE_CLINIC_ADMIN and not current_user.clinic_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="الحساب غير مرتبط بأي عيادة",
            )
        return current_user

    return role_checker


# ─── Role Shortcuts ──────────────────────────────────────────────────────────
require_super_admin  = require_roles([ROLE_SUPER_ADMIN])
require_clinic_admin = require_roles([ROLE_SUPER_ADMIN, ROLE_CLINIC_ADMIN])
require_doctor       = require_roles([ROLE_SUPER_ADMIN, ROLE_CLINIC_ADMIN, ROLE_DOCTOR])
require_tech         = require_roles([ROLE_SUPER_ADMIN, ROLE_DOCTOR, ROLE_TECH])
require_reception    = require_roles([ROLE_SUPER_ADMIN, ROLE_CLINIC_ADMIN, ROLE_RECEPTION, ROLE_STAFF])
require_user         = require_roles([ROLE_SUPER_ADMIN, ROLE_CLINIC_ADMIN, ROLE_DOCTOR, ROLE_TECH, ROLE_RECEPTION, ROLE_STAFF])
