import logging
import enum
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

import database
import models
import auth
from ratelimit import limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/telerad", tags=["Teleradiology Engine"])

class CasePriority(str, enum.Enum):
    ROUTINE = "routine"      # عادي (خلال 12 - 24 ساعة)
    URGENT = "urgent"        # عاجل (خلال 2 - 4 ساعات)
    STAT = "stat"            # طوارئ قصوى (خلال 30 - 60 دقيقة)

class WorkflowStatus(str, enum.Enum):
    UNASSIGNED = "unassigned"    # بانتظار التوزيع
    ASSIGNED = "assigned"        # مسند لطبيب
    IN_REVIEW = "in_review"      # قيد القراءة والتشخيص
    REPORTED = "reported"        # تم كتابة التقرير
    FINALIZED = "finalized"      # معتمد ومغلق

class AssignCaseRequest(BaseModel):
    study_id: str
    priority: CasePriority = CasePriority.ROUTINE

# 1. جلب طابور الحالات المتاحة للقراءة (Telerad Worklist)
@router.get("/worklist")
def get_telerad_worklist(
    db: Session = Depends(database.get_db),
    doctor: models.Doctor = Depends(auth.get_current_doctor)
):
    # جلب الحالات الموجهة لهذا الطبيب أو الحالات غير المسندة المفتوحة للقراءة
    cases = db.query(models.Study).filter(
        (models.Study.assigned_doctor_id == doctor.id) | 
        (models.Study.workflow_status == WorkflowStatus.UNASSIGNED)
    ).order_by(
        # Order by priority STAT first, then by date
        models.Study.priority == CasePriority.STAT.desc(),
        models.Study.study_date.asc()
    ).all()

    return [{
        "id": c.id,
        "patient_name": c.patient.full_name if c.patient else "مجهول",
        "modality": c.modality,
        "body_part": c.body_part,
        "priority": c.priority,
        "status": c.workflow_status,
        "sla_deadline": c.sla_deadline,
        "institution_name": c.institution_name,
        "is_assigned_to_me": c.assigned_doctor_id == doctor.id
    } for c in cases]

# 2. استلام الطبيب للحالة (Lock Case / Pick Case)
@router.post("/cases/{study_id}/claim")
def claim_case(
    study_id: str,
    db: Session = Depends(database.get_db),
    doctor: models.Doctor = Depends(auth.get_current_doctor)
):
    study = db.query(models.Study).filter(models.Study.id == study_id).first()
    if not study:
        raise HTTPException(status_code=404, detail="الدراسة غير موجودة")
    
    if study.workflow_status not in [WorkflowStatus.UNASSIGNED, WorkflowStatus.ASSIGNED]:
        raise HTTPException(status_code=400, detail="الحالة قيد التشخيص بالفعل من طبيب آخر")

    study.assigned_doctor_id = doctor.id
    study.workflow_status = WorkflowStatus.IN_REVIEW
    db.commit()
    return {"message": "تم استلام الحالة بنجاح ونقلها إلى قائمة التشخيص الخاصة بك"}
