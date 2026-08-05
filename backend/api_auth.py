from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel

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
    token_type: str = "bearer"
    doctor_id: str
    full_name: str
    email: str
    clinic_id: str | None = None
    role: str


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

    if not getattr(doctor, "is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="تم تعطيل هذا الحساب. تواصل مع مدير النظام.",
        )

    access_token = auth.create_access_token(data={"sub": doctor.id})

    return LoginResponse(
        access_token=access_token,
        doctor_id=doctor.id,
        full_name=doctor.full_name,
        email=doctor.email,
        clinic_id=doctor.clinic_id,
        role=doctor.role,
    )


@router.get("/me")
def get_me(current_doctor: models.Doctor = Depends(auth.get_current_doctor)):
    return {
        "doctor_id": current_doctor.id,
        "full_name": current_doctor.full_name,
        "email": current_doctor.email,
        "clinic_id": current_doctor.clinic_id,
        "role": current_doctor.role,
    }
