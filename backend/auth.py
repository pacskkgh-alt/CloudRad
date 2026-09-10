import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

import database
import models

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET", "cloudrad-dev-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))  # 8 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


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
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
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

# الأدوار المدعومة في النظام
ROLE_SUPER_ADMIN = "admin"
ROLE_CLINIC_ADMIN = "clinic_admin"
ROLE_DOCTOR = "doctor"
ROLE_STAFF = "user"

def require_super_admin(current_user: models.Doctor = Depends(get_current_doctor)):
    if current_user.role != ROLE_SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="صلاحية مدير النظام مطلوبة")
    return current_user

def require_clinic_admin(current_user: models.Doctor = Depends(get_current_doctor)):
    if current_user.role not in [ROLE_SUPER_ADMIN, ROLE_CLINIC_ADMIN]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="صلاحية إدارة العيادة مطلوبة")
    if current_user.role == ROLE_CLINIC_ADMIN and not current_user.clinic_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="الحساب غير مرتبط بأي عيادة")
    return current_user

def require_doctor(current_user: models.Doctor = Depends(get_current_doctor)):
    if current_user.role not in [ROLE_SUPER_ADMIN, ROLE_CLINIC_ADMIN, ROLE_DOCTOR]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="صلاحية طبيب مطلوبة")
    return current_user

def require_user(current_user: models.Doctor = Depends(get_current_doctor)):
    # Everyone logged in is at least a user
    return current_user
