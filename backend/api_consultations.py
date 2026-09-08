import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel

import database
import models
import auth
from ratelimit import limiter

router = APIRouter(prefix="/api/consultations", tags=["Consultations & Second Opinions"])


# --- Schemas ---

class DoctorListItem(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    clinic_name: str


class SecondOpinionCreate(BaseModel):
    study_id: str
    target_doctor_id: str
    patient_notes: Optional[str] = None


class SecondOpinionRespond(BaseModel):
    request_id: str
    doctor_opinion: str


class SecondOpinionResponse(BaseModel):
    id: str
    study_id: str
    patient_id: Optional[str] = None
    target_doctor_id: str
    target_doctor_name: Optional[str] = None
    patient_name: Optional[str] = None
    patient_id_number: Optional[str] = None
    modality: Optional[str] = None
    orthanc_study_uuid: Optional[str] = None
    study_instance_uid: Optional[str] = None
    status: str
    patient_notes: Optional[str] = None
    doctor_opinion: Optional[str] = None
    created_at: Optional[str] = None
    resolved_at: Optional[str] = None


# --- Endpoints ---

@router.get("/doctors-list", response_model=List[DoctorListItem])
def get_doctors_list(db: Session = Depends(database.get_db)):
    """
    Returns all active doctors and radiologists with their clinic affiliations
    for patient selection dropdowns.
    """
    doctors = (
        db.query(models.Doctor)
        .filter(models.Doctor.is_active == True)
        .all()
    )
    result = []
    for doc in doctors:
        clinic_title = doc.clinic.name if doc.clinic else "استشاري مستقل (Independent Specialist)"
        result.append(
            DoctorListItem(
                id=doc.id,
                full_name=doc.full_name,
                email=doc.email,
                role=doc.role,
                clinic_name=clinic_title,
            )
        )
    return result


@router.post("/request", status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
def create_second_opinion_request(
    request: Request,
    body: SecondOpinionCreate,
    db: Session = Depends(database.get_db),
):
    """
    Patient or registered user requests a second opinion from an active doctor.
    """
    study = db.query(models.Study).filter(models.Study.id == body.study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="الدراسة المطلوبة غير موجودة")

    target_doctor = (
        db.query(models.Doctor)
        .filter(models.Doctor.id == body.target_doctor_id, models.Doctor.is_active == True)
        .first()
    )
    if not target_doctor:
        raise HTTPException(status_code=404, detail="الطبيب المطلوب غير متاح أو معطل")

    opinion_req = models.SecondOpinionRequest(
        id=str(uuid.uuid4()),
        study_id=study.id,
        patient_id=study.patient_id,
        target_doctor_id=target_doctor.id,
        status="PENDING",
        patient_notes=body.patient_notes,
    )
    db.add(opinion_req)
    db.commit()
    db.refresh(opinion_req)

    return {
        "message": "تم إرسال طلب الرأي الطبي الثاني بنجاح",
        "request_id": opinion_req.id,
        "status": opinion_req.status,
        "target_doctor": target_doctor.full_name,
    }


@router.get("/doctor/inbox", response_model=List[SecondOpinionResponse])
def get_doctor_inbox(
    db: Session = Depends(database.get_db),
    current_doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    """
    Authenticated doctor endpoint to retrieve incoming second opinion requests.
    Admins can view all requests; doctors view requests assigned to them.
    """
    query = db.query(models.SecondOpinionRequest)
    if current_doctor.role != "admin":
        query = query.filter(models.SecondOpinionRequest.target_doctor_id == current_doctor.id)

    requests_list = query.order_by(models.SecondOpinionRequest.created_at.desc()).all()

    results = []
    for item in requests_list:
        study = item.study
        patient = study.patient if study else None
        target_doc = item.target_doctor

        results.append(
            SecondOpinionResponse(
                id=item.id,
                study_id=item.study_id,
                patient_id=item.patient_id,
                target_doctor_id=item.target_doctor_id,
                target_doctor_name=target_doc.full_name if target_doc else "Unknown",
                patient_name=patient.full_name if patient else "Unknown Patient",
                patient_id_number=patient.patient_id_number if patient else "N/A",
                modality=study.modality if study else "UNKNOWN",
                orthanc_study_uuid=study.orthanc_study_uuid if study else None,
                study_instance_uid=study.study_instance_uid if study else None,
                status=item.status,
                patient_notes=item.patient_notes,
                doctor_opinion=item.doctor_opinion,
                created_at=str(item.created_at) if item.created_at else None,
                resolved_at=str(item.resolved_at) if item.resolved_at else None,
            )
        )
    return results


@router.post("/doctor/respond")
def respond_second_opinion(
    body: SecondOpinionRespond,
    db: Session = Depends(database.get_db),
    current_doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    """
    Authenticated doctor submits diagnostic opinion and marks consultation COMPLETED.
    """
    opinion_req = (
        db.query(models.SecondOpinionRequest)
        .filter(models.SecondOpinionRequest.id == body.request_id)
        .first()
    )
    if not opinion_req:
        raise HTTPException(status_code=404, detail="طلب الاستشارة غير موجود")

    if opinion_req.target_doctor_id != current_doctor.id and current_doctor.role != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح لك بالرد على هذا الطلب")

    opinion_req.doctor_opinion = body.doctor_opinion
    opinion_req.status = "COMPLETED"
    opinion_req.resolved_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(opinion_req)

    return {
        "message": "تم اعتماد وإرسال الرأي الطبي بنجاح",
        "request_id": opinion_req.id,
        "status": opinion_req.status,
        "resolved_at": str(opinion_req.resolved_at),
    }
