from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List, Optional

import database
import models
import auth
from schemas import UserCreate, UserUpdate, UserResponse
from audit_service import log_audit_event

router = APIRouter(
    prefix="/api/clinic",
    tags=["Clinic Admin Management"],
    dependencies=[Depends(auth.require_clinic_admin)],
)


@router.get("/users", response_model=List[UserResponse])
def get_clinic_users(
    db: Session = Depends(database.get_db),
    current_doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    if not current_doctor.clinic_id:
        return []
    return (
        db.query(models.Doctor)
        .filter(models.Doctor.clinic_id == current_doctor.clinic_id)
        .all()
    )


@router.post("/users", response_model=UserResponse)
def create_clinic_user(
    req: UserCreate,
    request: Request,
    db: Session = Depends(database.get_db),
    current_doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    if not current_doctor.clinic_id:
        raise HTTPException(status_code=400, detail="أنت لا تنتمي لأي عيادة لإضافة مستخدمين")

    if req.role == "admin":
        raise HTTPException(status_code=403, detail="لا يمكنك إنشاء مدير نظام (admin)")

    existing = db.query(models.Doctor).filter(models.Doctor.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مستخدم بالفعل")

    hashed_password = auth.hash_password(req.password)
    new_user = models.Doctor(
        full_name=req.full_name,
        email=req.email,
        password_hash=hashed_password,
        role=req.role,
        clinic_id=current_doctor.clinic_id,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_audit_event(
        db=db,
        action="CREATE_CLINIC_USER",
        resource_type="Doctor",
        resource_id=new_user.id,
        doctor_id=current_doctor.id,
        clinic_id=current_doctor.clinic_id,
        details=f"email={new_user.email}, role={new_user.role}",
        ip_address=request.client.host if request.client else None,
    )
    return new_user


@router.put("/users/{user_id}", response_model=UserResponse)
def update_clinic_user(
    user_id: str,
    req: UserUpdate,
    request: Request,
    db: Session = Depends(database.get_db),
    current_doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    user = db.query(models.Doctor).filter(
        models.Doctor.id == user_id,
        models.Doctor.clinic_id == current_doctor.clinic_id,
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود أو لا ينتمي لهذه العيادة")

    if req.role is not None:
        if req.role == "admin":
            raise HTTPException(status_code=403, detail="لا يمكنك ترقية مستخدم ليكون مدير نظام")
        user.role = req.role

    db.commit()
    db.refresh(user)

    log_audit_event(
        db=db,
        action="UPDATE_CLINIC_USER",
        resource_type="Doctor",
        resource_id=user_id,
        doctor_id=current_doctor.id,
        clinic_id=current_doctor.clinic_id,
        details=f"new_role={req.role}",
        ip_address=request.client.host if request.client else None,
    )
    return user


@router.delete("/users/{user_id}")
def delete_clinic_user(
    user_id: str,
    request: Request,
    db: Session = Depends(database.get_db),
    current_doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    if user_id == current_doctor.id:
        raise HTTPException(status_code=400, detail="لا يمكنك حذف حسابك الخاص")

    user = db.query(models.Doctor).filter(
        models.Doctor.id == user_id,
        models.Doctor.clinic_id == current_doctor.clinic_id,
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود أو لا ينتمي لهذه العيادة")

    log_audit_event(
        db=db,
        action="DELETE_CLINIC_USER",
        resource_type="Doctor",
        resource_id=user_id,
        doctor_id=current_doctor.id,
        clinic_id=current_doctor.clinic_id,
        details=f"email={user.email}",
        ip_address=request.client.host if request.client else None,
    )
    db.delete(user)
    db.commit()
    return {"message": "تم حذف المستخدم بنجاح"}


@router.put("/users/{user_id}/toggle", response_model=UserResponse)
def toggle_clinic_user_status(
    user_id: str,
    request: Request,
    db: Session = Depends(database.get_db),
    current_doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    if user_id == current_doctor.id:
        raise HTTPException(status_code=400, detail="لا يمكنك تعطيل حسابك الخاص")

    user = db.query(models.Doctor).filter(
        models.Doctor.id == user_id,
        models.Doctor.clinic_id == current_doctor.clinic_id,
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود أو لا ينتمي لهذه العيادة")

    user.is_active = not getattr(user, "is_active", True)
    db.commit()
    db.refresh(user)

    log_audit_event(
        db=db,
        action="TOGGLE_CLINIC_USER_STATUS",
        resource_type="Doctor",
        resource_id=user_id,
        doctor_id=current_doctor.id,
        clinic_id=current_doctor.clinic_id,
        details=f"is_active={user.is_active}",
        ip_address=request.client.host if request.client else None,
    )
    return user
