import logging
import enum
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import case
from pydantic import BaseModel

import database
import models
import auth
from ratelimit import limiter
from audit_service import log_audit_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/telerad", tags=["Teleradiology Engine"])


class CasePriority(str, enum.Enum):
    ROUTINE = "routine"   # عادي — خلال 12–24 ساعة
    URGENT  = "urgent"    # عاجل — خلال 2–4 ساعات
    STAT    = "stat"      # طوارئ قصوى — خلال 30–60 دقيقة


class WorkflowStatus(str, enum.Enum):
    UNASSIGNED = "unassigned"   # بانتظار التوزيع
    ASSIGNED   = "assigned"     # مسند لطبيب
    IN_REVIEW  = "in_review"    # قيد القراءة والتشخيص
    REPORTED   = "reported"     # تم كتابة التقرير
    FINALIZED  = "finalized"    # معتمد ومغلق


class AssignCaseRequest(BaseModel):
    study_id: str
    priority: CasePriority = CasePriority.ROUTINE


# ─── Priority ordering helper ─────────────────────────────────────────────────
# STAT=0 → URGENT=1 → ROUTINE=2  (ascending = STAT first)
PRIORITY_ORDER = case(
    (models.Study.priority == CasePriority.STAT.value,    0),
    (models.Study.priority == CasePriority.URGENT.value,  1),
    else_=2,
)


# ─── 1. Telerad Worklist ──────────────────────────────────────────────────────
@router.get("/worklist")
def get_telerad_worklist(
    request: Request,
    db: Session = Depends(database.get_db),
    doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    """
    Returns cases available to the authenticated doctor:
    - Cases explicitly assigned to them, OR
    - Unassigned open cases.
    Ordered by priority (STAT → URGENT → ROUTINE), then by date ascending.
    """
    cases = (
        db.query(models.Study)
        .filter(
            (models.Study.assigned_doctor_id == doctor.id)
            | (models.Study.workflow_status == WorkflowStatus.UNASSIGNED.value)
        )
        .order_by(PRIORITY_ORDER, models.Study.study_date.asc())
        .all()
    )

    log_audit_event(
        db=db,
        action="VIEW_TELERAD_WORKLIST",
        resource_type="Study",
        doctor_id=doctor.id,
        clinic_id=doctor.clinic_id,
        ip_address=request.client.host if request.client else None,
    )

    return [
        {
            "id": c.id,
            "patient_name": c.patient.full_name if c.patient else "مجهول",
            "modality": c.modality,
            "body_part": c.body_part,
            "priority": c.priority,
            "status": c.workflow_status,
            "sla_deadline": c.sla_deadline,
            "institution_name": c.institution_name,
            "is_assigned_to_me": c.assigned_doctor_id == doctor.id,
        }
        for c in cases
    ]


# ─── 2. Claim Case ────────────────────────────────────────────────────────────
@router.post("/cases/{study_id}/claim")
def claim_case(
    study_id: str,
    request: Request,
    db: Session = Depends(database.get_db),
    doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    """Locks the case to the current doctor and transitions it to IN_REVIEW."""
    study = db.query(models.Study).filter(models.Study.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="الدراسة غير موجودة")

    if study.workflow_status not in [
        WorkflowStatus.UNASSIGNED.value,
        WorkflowStatus.ASSIGNED.value,
    ]:
        raise HTTPException(
            status_code=400,
            detail="الحالة قيد التشخيص بالفعل من طبيب آخر",
        )

    study.assigned_doctor_id = doctor.id
    study.workflow_status = WorkflowStatus.IN_REVIEW.value
    db.commit()

    log_audit_event(
        db=db,
        action="CLAIM_TELERAD_CASE",
        resource_type="Study",
        resource_id=study_id,
        doctor_id=doctor.id,
        clinic_id=doctor.clinic_id,
        details=f"priority={study.priority}",
        ip_address=request.client.host if request.client else None,
    )

    return {"message": "تم استلام الحالة بنجاح ونقلها إلى قائمة التشخيص الخاصة بك"}


# ─── 3. Finalize Case ────────────────────────────────────────────────────────
@router.post("/cases/{study_id}/finalize")
def finalize_case(
    study_id: str,
    request: Request,
    db: Session = Depends(database.get_db),
    doctor: models.Doctor = Depends(auth.require_doctor),
):
    """Marks the case as FINALIZED after the report is complete."""
    study = db.query(models.Study).filter(models.Study.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="الدراسة غير موجودة")

    if study.assigned_doctor_id != doctor.id and doctor.role != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح لك بإغلاق هذه الحالة")

    study.workflow_status = WorkflowStatus.FINALIZED.value
    db.commit()

    log_audit_event(
        db=db,
        action="FINALIZE_TELERAD_CASE",
        resource_type="Study",
        resource_id=study_id,
        doctor_id=doctor.id,
        clinic_id=doctor.clinic_id,
        ip_address=request.client.host if request.client else None,
    )

    return {"message": "تم إغلاق الحالة واعتمادها بنجاح"}
