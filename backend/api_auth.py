from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from jose import JWTError

import database
import models
import auth
from ratelimit import limiter

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    doctor_id: str
    full_name: str
    email: str
    clinic_id: str | None = None
    role: str


class RefreshRequest(BaseModel):
    refresh_token: str


# ─── Login ───────────────────────────────────────────────────────────────────
@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")
def login(request: Request, req: LoginRequest, db: Session = Depends(database.get_db)):
    doctor = db.query(models.Doctor).filter(models.Doctor.email == req.email).first()

    if not doctor or not auth.verify_password(req.password, doctor.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="البريد الإلكتروني أو كلمة المرور غير صحيحة",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not getattr(doctor, "is_active", True) or not doctor.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="تم تعطيل هذا الحساب. تواصل مع مدير النظام.",
        )

    access_token  = auth.create_access_token(data={"sub": doctor.id})
    refresh_token = auth.create_refresh_token(data={"sub": doctor.id})

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        doctor_id=doctor.id,
        full_name=doctor.full_name,
        email=doctor.email,
        clinic_id=doctor.clinic_id,
        role=doctor.role,
    )


# ─── Refresh Access Token ─────────────────────────────────────────────────────
@router.post("/refresh", response_model=dict)
@limiter.limit("20/minute")
def refresh_access_token(
    request: Request,
    body: RefreshRequest,
    db: Session = Depends(database.get_db),
):
    """
    Accepts a valid refresh token and issues a new access token.
    Refresh tokens are long-lived (30 days) and are NOT accepted as access tokens.
    """
    invalid_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="رمز التحديث غير صالح أو منتهي الصلاحية",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = auth.decode_token(body.refresh_token)
        if payload.get("type") != "refresh":
            raise invalid_exc
        doctor_id: str = payload.get("sub")
        if not doctor_id:
            raise invalid_exc
    except JWTError:
        raise invalid_exc

    doctor = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()
    if not doctor or not doctor.is_active:
        raise invalid_exc

    new_access_token = auth.create_access_token(data={"sub": doctor.id})
    return {
        "access_token": new_access_token,
        "token_type": "bearer",
    }


# ─── Me ──────────────────────────────────────────────────────────────────────
@router.get("/me")
def get_me(current_doctor: models.Doctor = Depends(auth.get_current_doctor)):
    return {
        "doctor_id": current_doctor.id,
        "full_name": current_doctor.full_name,
        "email": current_doctor.email,
        "clinic_id": current_doctor.clinic_id,
        "role": current_doctor.role,
    }
