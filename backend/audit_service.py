import logging
from typing import Optional, List
from sqlalchemy.orm import Session
import models

logger = logging.getLogger(__name__)

def log_audit_event(
    db: Session,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    doctor_id: Optional[str] = None,
    clinic_id: Optional[str] = None,
    details: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> models.AuditLog:
    """
    Creates an immutable compliance/audit log record (HIPAA requirement).
    """
    try:
        audit_entry = models.AuditLog(
            doctor_id=doctor_id,
            clinic_id=clinic_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
        )
        db.add(audit_entry)
        db.commit()
        db.refresh(audit_entry)
        return audit_entry
    except Exception as exc:
        logger.error(f"Failed to record audit event [{action} on {resource_type}]: {exc}")
        db.rollback()
        return None


def get_clinic_audit_logs(
    db: Session,
    clinic_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> List[models.AuditLog]:
    """
    Retrieves audit trail entries for a clinic or entire system for admins.
    """
    query = db.query(models.AuditLog)
    if clinic_id:
        query = query.filter(models.AuditLog.clinic_id == clinic_id)
    return query.order_by(models.AuditLog.created_at.desc()).offset(skip).limit(limit).all()
