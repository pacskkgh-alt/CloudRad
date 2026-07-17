from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

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
    clinic_id: Optional[str] = ""

class UserResponse(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    clinic_id: Optional[str] = None
    
    class Config:
        from_attributes = True

# --- Endpoints ---

@router.get("/clinics", response_model=List[ClinicResponse])
def get_clinics(db: Session = Depends(database.get_db)):
    return db.query(models.Clinic).all()

@router.post("/clinics", response_model=ClinicResponse)
def create_clinic(req: ClinicCreate, db: Session = Depends(database.get_db)):
    new_clinic = models.Clinic(**req.dict())
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
    user_data = req.dict(exclude={"password"})
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
    
    if req.role:
        user.role = req.role
        
    if req.clinic_id == "": # Empty means remove clinic
        user.clinic_id = None
    elif req.clinic_id is not None:
        user.clinic_id = req.clinic_id
        
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
