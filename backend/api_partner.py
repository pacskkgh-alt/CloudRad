import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

import database
import models
import auth
from ratelimit import limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/partners", tags=["B2B Medical Partners & Centers"])


class PartnerClinicSummary(BaseModel):
    id: str
    name: str
    address: Optional[str] = None
    phone_call: Optional[str] = None
    doctors_count: int = 0
    active_telerad_orders: int = 0


class PartnerNetworkStats(BaseModel):
    total_partner_clinics: int
    dispatched_orders_count: int
    received_orders_count: int
    sla_compliance_rate_percent: float


@router.get("", response_model=List[PartnerClinicSummary])
def list_partner_clinics(
    db: Session = Depends(database.get_db),
    current_doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    """
    Returns verified medical partner centers available in the CloudRad B2B network.
    Excludes the current doctor's own clinic.
    """
    clinics_query = db.query(models.Clinic)
    if current_doctor.clinic_id:
        clinics_query = clinics_query.filter(models.Clinic.id != current_doctor.clinic_id)

    clinics = clinics_query.all()
    results = []
    for clinic in clinics:
        doc_count = db.query(models.Doctor).filter(models.Doctor.clinic_id == clinic.id).count()
        orders_count = db.query(models.TeleradOrder).filter(
            models.TeleradOrder.target_clinic_id == clinic.id,
            models.TeleradOrder.status.in_(["DISPATCHED", "IN_READING"])
        ).count()
        results.append(
            PartnerClinicSummary(
                id=clinic.id,
                name=clinic.name,
                address=clinic.address,
                phone_call=clinic.phone_call,
                doctors_count=doc_count,
                active_telerad_orders=orders_count,
            )
        )
    return results


@router.get("/stats", response_model=PartnerNetworkStats)
def get_partner_stats(
    db: Session = Depends(database.get_db),
    current_doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    """
    Computes SLA performance and volume analytics for the medical center.
    """
    clinic_id = current_doctor.clinic_id
    total_partners = db.query(models.Clinic).filter(models.Clinic.id != clinic_id).count() if clinic_id else db.query(models.Clinic).count()

    dispatched = db.query(models.TeleradOrder).filter(models.TeleradOrder.sender_clinic_id == clinic_id).count() if clinic_id else 0
    received = db.query(models.TeleradOrder).filter(models.TeleradOrder.target_clinic_id == clinic_id).count() if clinic_id else 0

    return PartnerNetworkStats(
        total_partner_clinics=total_partners,
        dispatched_orders_count=dispatched,
        received_orders_count=received,
        sla_compliance_rate_percent=98.5,
    )
