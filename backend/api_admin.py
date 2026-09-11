from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

import database
import models
import auth
from schemas import ClinicCreate, ClinicResponse, UserCreate, UserUpdate, UserResponse
from audit_service import log_audit_event

# Protect ENTIRE router for 'admin' role only.
router = APIRouter(
    prefix="/api/admin",
    tags=["Admin Management"],
    dependencies=[Depends(auth.require_super_admin)],
)


# ─── Clinics ──────────────────────────────────────────────────────────────────
@router.get("/clinics", response_model=List[ClinicResponse])
def get_clinics(db: Session = Depends(database.get_db)):
    return db.query(models.Clinic).all()


@router.post("/clinics", response_model=ClinicResponse)
def create_clinic(
    req: ClinicCreate,
    request: Request,
    db: Session = Depends(database.get_db),
    current_doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    new_clinic = models.Clinic(**req.model_dump())
    db.add(new_clinic)
    db.commit()
    db.refresh(new_clinic)

    log_audit_event(
        db=db,
        action="CREATE_CLINIC",
        resource_type="Clinic",
        resource_id=new_clinic.id,
        doctor_id=current_doctor.id,
        clinic_id=new_clinic.id,
        details=f"name={new_clinic.name}",
        ip_address=request.client.host if request.client else None,
    )
    return new_clinic


# ─── Users ────────────────────────────────────────────────────────────────────
@router.get("/users", response_model=List[UserResponse])
def get_users(db: Session = Depends(database.get_db)):
    return db.query(models.Doctor).all()


@router.post("/users", response_model=UserResponse)
def create_user(
    req: UserCreate,
    request: Request,
    db: Session = Depends(database.get_db),
    current_doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    existing = db.query(models.Doctor).filter(models.Doctor.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مسجل مسبقاً")

    hashed_password = auth.hash_password(req.password)
    user_data = req.model_dump(exclude={"password"})
    if not user_data.get("clinic_id"):
        user_data["clinic_id"] = None

    new_user = models.Doctor(**user_data, password_hash=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_audit_event(
        db=db,
        action="CREATE_USER",
        resource_type="Doctor",
        resource_id=new_user.id,
        doctor_id=current_doctor.id,
        clinic_id=new_user.clinic_id,
        details=f"email={new_user.email}, role={new_user.role}",
        ip_address=request.client.host if request.client else None,
    )
    return new_user


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    req: UserUpdate,
    request: Request,
    db: Session = Depends(database.get_db),
    current_doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    user = db.query(models.Doctor).filter(models.Doctor.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")

    changes = []
    if req.role is not None:
        changes.append(f"role: {user.role}→{req.role}")
        user.role = req.role
    if req.clinic_id is not None:
        changes.append(f"clinic_id: {user.clinic_id}→{req.clinic_id}")
        user.clinic_id = req.clinic_id if req.clinic_id != "" else None

    db.commit()
    db.refresh(user)

    log_audit_event(
        db=db,
        action="UPDATE_USER",
        resource_type="Doctor",
        resource_id=user_id,
        doctor_id=current_doctor.id,
        details=", ".join(changes) if changes else "no changes",
        ip_address=request.client.host if request.client else None,
    )
    return user


@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    request: Request,
    db: Session = Depends(database.get_db),
    current_doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    user = db.query(models.Doctor).filter(models.Doctor.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")

    if user.role == "admin":
        admins_count = db.query(models.Doctor).filter(models.Doctor.role == "admin").count()
        if admins_count <= 1:
            raise HTTPException(status_code=400, detail="لا يمكن حذف مدير النظام الوحيد")

    log_audit_event(
        db=db,
        action="DELETE_USER",
        resource_type="Doctor",
        resource_id=user_id,
        doctor_id=current_doctor.id,
        details=f"email={user.email}, role={user.role}",
        ip_address=request.client.host if request.client else None,
    )
    db.delete(user)
    db.commit()
    return {"message": "تم حذف المستخدم بنجاح"}


@router.put("/users/{user_id}/toggle", response_model=UserResponse)
def toggle_user_status(
    user_id: str,
    request: Request,
    db: Session = Depends(database.get_db),
    current_doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    user = db.query(models.Doctor).filter(models.Doctor.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")

    if user.role == "admin" and user.is_active:
        active_admins = (
            db.query(models.Doctor)
            .filter(models.Doctor.role == "admin", models.Doctor.is_active == True)
            .count()
        )
        if active_admins <= 1:
            raise HTTPException(status_code=400, detail="لا يمكن تعطيل مدير النظام الوحيد النشط")

    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)

    log_audit_event(
        db=db,
        action="TOGGLE_USER_STATUS",
        resource_type="Doctor",
        resource_id=user_id,
        doctor_id=current_doctor.id,
        details=f"is_active={user.is_active}",
        ip_address=request.client.host if request.client else None,
    )
    return user


# ─── Shared Links ─────────────────────────────────────────────────────────────
@router.get("/shares")
def get_global_links(db: Session = Depends(database.get_db)):
    links = db.query(models.SharedLink).all()
    result = []
    for link in links:
        is_active = True
        if link.expires_at:
            expires = link.expires_at
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            if expires < datetime.now(timezone.utc):
                is_active = False

        doctor_name  = link.doctor.full_name if link.doctor else "Unknown"
        patient_name = (
            link.study.patient.full_name if (link.study and link.study.patient) else "Unknown"
        )

        result.append(
            {
                "id": link.id,
                "token": link.token,
                "study_id": link.study_id,
                "patient_name": patient_name,
                "doctor_name": doctor_name,
                "views_count": link.views_count,
                "expires_at": str(link.expires_at) if link.expires_at else None,
                "is_active": is_active,
            }
        )
    return result


@router.put("/shares/{link_id}/revoke")
def revoke_link(
    link_id: str,
    request: Request,
    db: Session = Depends(database.get_db),
    current_doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    link = db.query(models.SharedLink).filter(models.SharedLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")

    link.expires_at = datetime.now(timezone.utc)
    db.commit()

    log_audit_event(
        db=db,
        action="REVOKE_SHARE_LINK",
        resource_type="SharedLink",
        resource_id=link_id,
        doctor_id=current_doctor.id,
        details=f"study_id={link.study_id}",
        ip_address=request.client.host if request.client else None,
    )
    return {"message": "Link revoked successfully"}


# ─── Audit Log Viewer ─────────────────────────────────────────────────────────
@router.get("/audit-logs")
def get_audit_logs(
    clinic_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db),
):
    """Returns audit trail entries. Admins can filter by clinic_id."""
    from audit_service import get_clinic_audit_logs
    logs = get_clinic_audit_logs(db=db, clinic_id=clinic_id, skip=skip, limit=limit)
    return [
        {
            "id": log.id,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "doctor_name": log.doctor.full_name if log.doctor else "System",
            "clinic_name": log.clinic.name if log.clinic else "—",
            "details": log.details,
            "ip_address": log.ip_address,
            "created_at": str(log.created_at),
        }
        for log in logs
    ]
