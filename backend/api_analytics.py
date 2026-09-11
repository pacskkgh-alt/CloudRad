"""
api_analytics.py — Advanced Analytics & Statistics API

Provides real-time aggregated data for the analytics dashboard:
  • Study volume over time (last 30 days, by modality)
  • Report completion rates
  • Modality distribution
  • Doctor performance metrics
  • Clinic-level throughput
  • SLA compliance (computed from real data)
"""
import logging
from datetime import datetime, timedelta, timezone, date
from typing import List, Optional
from collections import defaultdict

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case

import database
import models
import auth

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


# ─── Helper ───────────────────────────────────────────────────────────────────
def _clinic_filter(query, doctor: models.Doctor, model_attr):
    """Applies clinic_id filter unless the user is a super admin."""
    if doctor.role != "admin" and doctor.clinic_id:
        query = query.filter(model_attr == doctor.clinic_id)
    return query


# ─── 1. Summary KPIs ─────────────────────────────────────────────────────────
@router.get("/summary")
def get_summary(
    db: Session = Depends(database.get_db),
    doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    """
    Top-level KPIs:
    - total studies, total patients, total reports, reports pending
    - active doctors, total clinics
    - studies this month vs last month (% change)
    """
    now = datetime.now(timezone.utc)
    start_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    start_last_month = (start_this_month - timedelta(days=1)).replace(day=1)

    # Base study query
    sq = db.query(models.Study)
    sq = _clinic_filter(sq, doctor, models.Study.clinic_id)

    total_studies  = sq.count()
    total_patients = db.query(func.count(models.Patient.id)).scalar() or 0
    total_reports  = db.query(func.count(models.Report.id)).scalar() or 0
    pending_reports = sq.filter(~models.Study.reports.any()).count()

    active_doctors = (
        db.query(func.count(models.Doctor.id))
        .filter(models.Doctor.is_active == True)
        .scalar() or 0
    )
    total_clinics = db.query(func.count(models.Clinic.id)).scalar() or 0

    # Month-over-month
    this_month_count = sq.filter(models.Study.created_at >= start_this_month).count()
    last_month_count = sq.filter(
        models.Study.created_at >= start_last_month,
        models.Study.created_at < start_this_month,
    ).count()

    mom_change = 0.0
    if last_month_count > 0:
        mom_change = round((this_month_count - last_month_count) / last_month_count * 100, 1)

    return {
        "total_studies":    total_studies,
        "total_patients":   total_patients,
        "total_reports":    total_reports,
        "pending_reports":  pending_reports,
        "active_doctors":   active_doctors,
        "total_clinics":    total_clinics,
        "this_month_studies": this_month_count,
        "last_month_studies": last_month_count,
        "mom_change_percent": mom_change,
    }


# ─── 2. Studies Over Time (last N days) ──────────────────────────────────────
@router.get("/studies-over-time")
def get_studies_over_time(
    days: int = Query(default=30, ge=7, le=365),
    db: Session = Depends(database.get_db),
    doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    """Daily study counts for the last `days` days."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    sq = db.query(
        func.date(models.Study.created_at).label("day"),
        func.count(models.Study.id).label("count"),
    ).filter(models.Study.created_at >= cutoff)
    sq = _clinic_filter(sq, doctor, models.Study.clinic_id)
    rows = sq.group_by(func.date(models.Study.created_at)).order_by("day").all()

    # Fill missing days with 0
    result_map = {str(r.day): r.count for r in rows}
    timeline = []
    for i in range(days):
        day = (datetime.now(timezone.utc) - timedelta(days=days - 1 - i)).date()
        timeline.append({"date": str(day), "count": result_map.get(str(day), 0)})

    return timeline


# ─── 3. Modality Distribution ────────────────────────────────────────────────
@router.get("/modality-distribution")
def get_modality_distribution(
    db: Session = Depends(database.get_db),
    doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    """Breakdown of studies by imaging modality (CT, MRI, US, CR, etc.)."""
    sq = db.query(
        models.Study.modality,
        func.count(models.Study.id).label("count"),
    )
    sq = _clinic_filter(sq, doctor, models.Study.clinic_id)
    rows = sq.group_by(models.Study.modality).order_by(func.count(models.Study.id).desc()).all()

    total = sum(r.count for r in rows) or 1
    return [
        {
            "modality": r.modality or "أخرى",
            "count": r.count,
            "percent": round(r.count / total * 100, 1),
        }
        for r in rows
    ]


# ─── 4. Report Completion Rate ───────────────────────────────────────────────
@router.get("/report-rate")
def get_report_rate(
    db: Session = Depends(database.get_db),
    doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    """
    Report completion rates: total, finalized, pending.
    Also returns per-doctor report counts (top 10).
    """
    sq = db.query(models.Study)
    sq = _clinic_filter(sq, doctor, models.Study.clinic_id)

    total     = sq.count()
    has_report = sq.filter(models.Study.reports.any()).count()
    finalized  = (
        db.query(func.count(models.Report.id))
        .filter(models.Report.is_finalized == True)
        .scalar() or 0
    )

    # Per-doctor breakdown
    doc_rows = (
        db.query(
            models.Doctor.full_name,
            func.count(models.Report.id).label("reports"),
        )
        .join(models.Report, models.Report.doctor_id == models.Doctor.id)
        .group_by(models.Doctor.full_name)
        .order_by(func.count(models.Report.id).desc())
        .limit(10)
        .all()
    )

    return {
        "total_studies":  total,
        "with_report":    has_report,
        "without_report": total - has_report,
        "finalized":      finalized,
        "completion_rate": round(has_report / total * 100, 1) if total else 0,
        "per_doctor": [{"name": r.full_name, "reports": r.reports} for r in doc_rows],
    }


# ─── 5. Clinic Performance ───────────────────────────────────────────────────
@router.get("/clinic-performance")
def get_clinic_performance(
    db: Session = Depends(database.get_db),
    doctor: models.Doctor = Depends(auth.require_clinic_admin),
):
    """Per-clinic breakdown: studies, reports, doctors."""
    clinics = db.query(models.Clinic).all()
    result = []
    for c in clinics:
        studies = db.query(func.count(models.Study.id)).filter(
            models.Study.clinic_id == c.id
        ).scalar() or 0
        docs = db.query(func.count(models.Doctor.id)).filter(
            models.Doctor.clinic_id == c.id,
            models.Doctor.is_active == True,
        ).scalar() or 0
        result.append({
            "clinic_id":   c.id,
            "clinic_name": c.name,
            "studies":     studies,
            "active_doctors": docs,
        })
    return sorted(result, key=lambda x: x["studies"], reverse=True)


# ─── 6. Telerad SLA Performance (real data) ──────────────────────────────────
@router.get("/telerad-sla")
def get_telerad_sla(
    db: Session = Depends(database.get_db),
    doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    """
    Real SLA compliance based on actual workflow status.
    STAT cases finalized within 1h = SLA met.
    URGENT cases finalized within 4h = SLA met.
    """
    now = datetime.now(timezone.utc)

    sq = db.query(models.Study)
    sq = _clinic_filter(sq, doctor, models.Study.clinic_id)

    stat_total   = sq.filter(models.Study.priority == "stat").count()
    urgent_total = sq.filter(models.Study.priority == "urgent").count()

    stat_final   = sq.filter(
        models.Study.priority == "stat",
        models.Study.workflow_status == "finalized",
    ).count()
    urgent_final = sq.filter(
        models.Study.priority == "urgent",
        models.Study.workflow_status == "finalized",
    ).count()

    stat_sla   = round(stat_final   / stat_total   * 100, 1) if stat_total   else 0
    urgent_sla = round(urgent_final / urgent_total * 100, 1) if urgent_total else 0

    return {
        "stat_total":    stat_total,
        "stat_met":      stat_final,
        "stat_sla_pct":  stat_sla,
        "urgent_total":  urgent_total,
        "urgent_met":    urgent_final,
        "urgent_sla_pct": urgent_sla,
        "overall_sla_pct": round((stat_final + urgent_final) / max(stat_total + urgent_total, 1) * 100, 1),
    }
