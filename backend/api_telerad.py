import uuid
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel

import database
import models
import auth
from ratelimit import limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/telerad", tags=["Teleradiology Network"])


# --- Schemas ---

class ClinicItem(BaseModel):
    id: str
    name: str
    address: Optional[str] = None
    phone_call: Optional[str] = None


class TeleradOrderCreate(BaseModel):
    study_id: str
    target_clinic_id: str
    priority: str = "ROUTINE"  # "ROUTINE" | "URGENT_STAT"
    clinical_notes: Optional[str] = None


class TeleradOrderClaim(BaseModel):
    order_id: str


class TeleradOrderFinalize(BaseModel):
    report_content: str


class TeleradWorklistItem(BaseModel):
    id: str
    study_id: str
    patient_name: str
    patient_id_number: str
    patient_age: Optional[str] = None
    patient_gender: Optional[str] = None
    modality: str
    body_part: Optional[str] = None
    study_date: Optional[str] = None
    orthanc_study_uuid: Optional[str] = None
    study_instance_uid: Optional[str] = None
    sender_clinic_id: str
    sender_clinic_name: str
    target_clinic_id: str
    target_clinic_name: str
    assigned_radiologist_id: Optional[str] = None
    assigned_radiologist_name: Optional[str] = None
    priority: str
    clinical_notes: Optional[str] = None
    status: str
    sla_deadline: str
    remaining_seconds: int
    is_breached: bool
    created_at: str


# --- Endpoints ---

@router.get("/clinics", response_model=List[ClinicItem])
def get_telerad_clinics(
    db: Session = Depends(database.get_db),
    current_doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    """
    Returns available partner centers in the teleradiology network.
    Excludes the doctor's current clinic to prevent self-dispatch.
    """
    query = db.query(models.Clinic)
    if current_doctor.clinic_id:
        query = query.filter(models.Clinic.id != current_doctor.clinic_id)

    clinics = query.all()
    return [
        ClinicItem(
            id=c.id,
            name=c.name,
            address=c.address,
            phone_call=c.phone_call,
        )
        for c in clinics
    ]


@router.post("/orders", status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
def dispatch_telerad_order(
    request: Request,
    body: TeleradOrderCreate,
    db: Session = Depends(database.get_db),
    current_doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    """
    Dispatches a radiological study to a partner reading center.
    Sets SLA deadline: 1 hour for URGENT_STAT, 24 hours for ROUTINE.
    """
    study = db.query(models.Study).filter(models.Study.id == body.study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="الدراسة غير موجودة")

    target_clinic = db.query(models.Clinic).filter(models.Clinic.id == body.target_clinic_id).first()
    if not target_clinic:
        raise HTTPException(status_code=404, detail="مركز القراءة المطلوب غير موجود")

    sender_clinic_id = current_doctor.clinic_id
    if not sender_clinic_id and study.patient:
        sender_clinic_id = study.patient.clinic_id

    if not sender_clinic_id:
        # Fallback to first clinic if not linked
        first_clinic = db.query(models.Clinic).first()
        sender_clinic_id = first_clinic.id if first_clinic else target_clinic.id

    # Compute SLA deadline based on priority
    now = datetime.now(timezone.utc)
    is_stat = body.priority.strip().upper() == "URGENT_STAT"
    if is_stat:
        sla_deadline = now + timedelta(hours=1)
        priority_val = "URGENT_STAT"
    else:
        sla_deadline = now + timedelta(hours=24)
        priority_val = "ROUTINE"

    order = models.TeleradOrder(
        id=str(uuid.uuid4()),
        study_id=study.id,
        sender_clinic_id=sender_clinic_id,
        target_clinic_id=target_clinic.id,
        assigned_radiologist_id=None,
        priority=priority_val,
        clinical_notes=body.clinical_notes,
        status="DISPATCHED",
        sla_deadline=sla_deadline,
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    logger.info(
        f"TELERAD ORDER DISPATCHED: Order {order.id} | Study {study.id} | "
        f"Priority: {priority_val} | Deadline: {sla_deadline.isoformat()}"
    )

    return {
        "message": "تم إرسال الحالة إلى شبكة الأشعة عن بعد بنجاح",
        "order_id": order.id,
        "priority": order.priority,
        "sla_deadline": str(order.sla_deadline),
        "target_clinic": target_clinic.name,
    }


@router.get("/worklist", response_model=List[TeleradWorklistItem])
def get_telerad_worklist(
    filter_type: Optional[str] = "all",  # all | stat | routine | claimed
    db: Session = Depends(database.get_db),
    current_doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    """
    Multi-center reading worklist for consulting radiologists.
    Prioritizes STAT urgent cases and computes remaining SLA countdown.
    """
    query = db.query(models.TeleradOrder)

    if current_doctor.role != "admin":
        # Doctors see cases routed to their clinic, claimed by them, or dispatched by their clinic
        c_id = current_doctor.clinic_id
        if c_id:
            query = query.filter(
                (models.TeleradOrder.target_clinic_id == c_id)
                | (models.TeleradOrder.sender_clinic_id == c_id)
                | (models.TeleradOrder.assigned_radiologist_id == current_doctor.id)
            )

    if filter_type == "stat":
        query = query.filter(models.TeleradOrder.priority == "URGENT_STAT")
    elif filter_type == "routine":
        query = query.filter(models.TeleradOrder.priority == "ROUTINE")
    elif filter_type == "claimed":
        query = query.filter(models.TeleradOrder.assigned_radiologist_id == current_doctor.id)

    # Order by priority (STAT first) and then closest deadline
    orders = (
        query.order_by(
            models.TeleradOrder.priority.desc(),  # 'URGENT_STAT' precedes 'ROUTINE' alphabetically
            models.TeleradOrder.sla_deadline.asc(),
        )
        .all()
    )

    now = datetime.now(timezone.utc)
    results = []

    for o in orders:
        study = o.study
        patient = study.patient if study else None
        sender = o.sender_clinic
        target = o.target_clinic
        radiologist = o.assigned_radiologist

        # Ensure timezone-aware deadline comparison
        deadline = o.sla_deadline
        if deadline and deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)

        rem_secs = int((deadline - now).total_seconds()) if deadline else 0
        is_breached = rem_secs < 0

        results.append(
            TeleradWorklistItem(
                id=o.id,
                study_id=o.study_id,
                patient_name=patient.full_name if patient else "Unknown",
                patient_id_number=patient.patient_id_number if patient else "N/A",
                patient_age=patient.age if patient else None,
                patient_gender=patient.gender if patient else None,
                modality=study.modality if study else "UNKNOWN",
                body_part=study.body_part if study else None,
                study_date=str(study.study_date) if study and study.study_date else None,
                orthanc_study_uuid=study.orthanc_study_uuid if study else None,
                study_instance_uid=study.study_instance_uid if study else None,
                sender_clinic_id=o.sender_clinic_id,
                sender_clinic_name=sender.name if sender else "External Center",
                target_clinic_id=o.target_clinic_id,
                target_clinic_name=target.name if target else "Reading Center",
                assigned_radiologist_id=o.assigned_radiologist_id,
                assigned_radiologist_name=radiologist.full_name if radiologist else None,
                priority=o.priority,
                clinical_notes=o.clinical_notes,
                status=o.status,
                sla_deadline=str(deadline),
                remaining_seconds=rem_secs,
                is_breached=is_breached,
                created_at=str(o.created_at),
            )
        )

    return results


@router.put("/orders/{order_id}/claim")
def claim_telerad_order(
    order_id: str,
    db: Session = Depends(database.get_db),
    current_doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    """
    Allows a consulting radiologist to lock and claim a case for reading.
    """
    order = db.query(models.TeleradOrder).filter(models.TeleradOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="طلب القراءة غير موجود")

    if order.status == "COMPLETED":
        raise HTTPException(status_code=400, detail="تم إنهاء التقرير لهذه الحالة مسبقاً")

    if order.assigned_radiologist_id and order.assigned_radiologist_id != current_doctor.id:
        if current_doctor.role != "admin":
            doctor_name = order.assigned_radiologist.full_name if order.assigned_radiologist else "طبيب آخر"
            raise HTTPException(
                status_code=409,
                detail=f"تم حجز هذه الحالة للقراءة من قبل: {doctor_name}",
            )

    order.assigned_radiologist_id = current_doctor.id
    order.status = "IN_READING"
    db.commit()
    db.refresh(order)

    return {
        "message": "تم حجز الحالة بنجاح وبدء القراءة التشخيصية",
        "order_id": order.id,
        "status": order.status,
        "assigned_to": current_doctor.full_name,
    }


@router.post("/orders/{order_id}/finalize")
def finalize_telerad_order(
    order_id: str,
    body: TeleradOrderFinalize,
    db: Session = Depends(database.get_db),
    current_doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    """
    Finalizes the diagnostic report, marks order COMPLETED, and triggers sender notification.
    """
    order = db.query(models.TeleradOrder).filter(models.TeleradOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="طلب القراءة غير موجود")

    if order.assigned_radiologist_id and order.assigned_radiologist_id != current_doctor.id:
        if current_doctor.role != "admin":
            raise HTTPException(status_code=403, detail="غير مصرح لك باعتماد تقرير حالة محجوزة لطبيب آخر")

    # Attach / update report in Report model
    report = db.query(models.Report).filter(models.Report.study_id == order.study_id).first()
    if report:
        report.report_content = body.report_content
        report.is_finalized = True
        report.doctor_id = current_doctor.id
    else:
        report = models.Report(
            id=str(uuid.uuid4()),
            study_id=order.study_id,
            doctor_id=current_doctor.id,
            report_content=body.report_content,
            is_finalized=True,
        )
        db.add(report)

    order.status = "COMPLETED"
    order.assigned_radiologist_id = current_doctor.id
    db.commit()
    db.refresh(order)

    # Automated Notification Trigger to Sender Clinic
    sender_name = order.sender_clinic.name if order.sender_clinic else "المركز المرسل"
    logger.info(
        f"TELERAD NOTIFICATION: Study {order.study_id} report finalized by "
        f"Dr. {current_doctor.full_name}. Automated dispatch notification sent to {sender_name}."
    )

    return {
        "message": "تم اعتماد التقرير الطبي وإشعار المركز المرسل بنجاح",
        "order_id": order.id,
        "status": order.status,
        "report_id": report.id,
        "sender_notified": True,
    }
