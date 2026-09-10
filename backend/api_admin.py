from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone

import database
import models
import auth

# Protect ENTIRE router for 'admin' role only.
router = APIRouter(prefix="/api/admin", tags=["Admin Management"], dependencies=[Depends(auth.require_admin)])

# --- Schemas ---
class ClinicCreate(BaseModel):
    name: str
    address: Optional[str] = None
    phone_call: Optional[str] = None

class ClinicResponse(ClinicCreate):
    id: str
    
    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    full_name: str
    email: str
    password: str
    role: str
    clinic_id: Optional[str] = None

class UserUpdate(BaseModel):
    role: Optional[str] = None
    clinic_id: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    clinic_id: Optional[str] = None
    is_active: Optional[bool] = True
    
    class Config:
        from_attributes = True

# --- Endpoints ---

@router.get("/clinics", response_model=List[ClinicResponse])
def get_clinics(db: Session = Depends(database.get_db)):
    return db.query(models.Clinic).all()

@router.post("/clinics", response_model=ClinicResponse)
def create_clinic(req: ClinicCreate, db: Session = Depends(database.get_db)):
    new_clinic = models.Clinic(**req.model_dump())
    db.add(new_clinic)
    db.commit()
    db.refresh(new_clinic)
    return new_clinic

@router.get("/users", response_model=List[UserResponse])
def get_users(db: Session = Depends(database.get_db)):
    return db.query(models.Doctor).all()

@router.post("/users", response_model=UserResponse)
def create_user(req: UserCreate, db: Session = Depends(database.get_db)):
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
    return new_user

@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(user_id: str, req: UserUpdate, db: Session = Depends(database.get_db)):
    user = db.query(models.Doctor).filter(models.Doctor.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    if req.role is not None:
        user.role = req.role

    if req.clinic_id is not None:
        user.clinic_id = req.clinic_id if req.clinic_id != "" else None
        
    db.commit()
    db.refresh(user)
    return user

@router.delete("/users/{user_id}")
def delete_user(user_id: str, db: Session = Depends(database.get_db)):
    user = db.query(models.Doctor).filter(models.Doctor.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
        
    if user.role == "admin":
        admins_count = db.query(models.Doctor).filter(models.Doctor.role == "admin").count()
        if admins_count <= 1:
            raise HTTPException(status_code=400, detail="لا يمكن حذف مدير النظام الوحيد")
            
    db.delete(user)
    db.commit()
    return {"message": "تم حذف المستخدم بنجاح"}

@router.put("/users/{user_id}/toggle", response_model=UserResponse)
def toggle_user_status(user_id: str, db: Session = Depends(database.get_db)):
    user = db.query(models.Doctor).filter(models.Doctor.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
        
    if user.role == "admin" and user.is_active:
        active_admins = db.query(models.Doctor).filter(
            models.Doctor.role == "admin", 
            models.Doctor.is_active == True
        ).count()
        if active_admins <= 1:
            raise HTTPException(status_code=400, detail="لا يمكن تعطيل مدير النظام الوحيد النشط")
            
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return user

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

        doctor_name = link.doctor.full_name if link.doctor else "Unknown"
        patient_name = link.study.patient.full_name if (link.study and link.study.patient) else "Unknown"

        result.append({
            "id": link.id,
            "token": link.token,
            "study_id": link.study_id,
            "patient_name": patient_name,
            "doctor_name": doctor_name,
            "views_count": link.views_count,
            "expires_at": str(link.expires_at) if link.expires_at else None,
            "is_active": is_active
        })
        
    return result

@router.put("/shares/{link_id}/revoke")
def revoke_link(link_id: str, db: Session = Depends(database.get_db)):
    link = db.query(models.SharedLink).filter(models.SharedLink.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
        
    link.expires_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Link revoked successfully"}

