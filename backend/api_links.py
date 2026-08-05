import uuid
import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
import requests
import requests.auth
import models, database, auth
from ratelimit import limiter
from api_config import ORTHANC_URL, ORTHANC_USER, ORTHANC_PASSWORD

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/links", tags=["Links"])


class ShareLinkCreate(BaseModel):
    study_id: str
    duration_days: Optional[int] = None
    passcode: Optional[str] = None
    allows_download: bool = True
    is_anonymized: bool = False


@router.post("/")
def create_share_link(
    link_in: ShareLinkCreate,
    db: Session = Depends(database.get_db),
    current_doctor: models.Doctor = Depends(auth.get_current_doctor),
):
    if link_in.passcode:
        hashed_passcode = auth.pwd_context.hash(link_in.passcode)
    else:
        hashed_passcode = None

    expires = None
    if link_in.duration_days:
        expires = datetime.now(timezone.utc) + timedelta(days=link_in.duration_days)

    token = str(uuid.uuid4().hex)

    link = models.SharedLink(
        study_id=link_in.study_id,
        created_by_doctor=current_doctor.id,
        token=token,
        passcode_hash=hashed_passcode,
        allows_download=link_in.allows_download,
        is_anonymized=link_in.is_anonymized,
        expires_at=expires,
    )

    db.add(link)
    db.commit()
    db.refresh(link)

    return {"message": "Link created", "token": token}


class VerifyLinkRequest(BaseModel):
    passcode: Optional[str] = None


@router.post("/{token}/verify")
@limiter.limit("20/minute")
def verify_link(request: Request, token: str, req: VerifyLinkRequest, db: Session = Depends(database.get_db)):
    """Public endpoint — patients use this to access shared studies."""
    link = db.query(models.SharedLink).filter(models.SharedLink.token == token).first()
    if not link:
        raise HTTPException(status_code=404, detail="Invalid link")

    if link.expires_at and link.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=403, detail="Link expired")

    if link.passcode_hash:
        if not req.passcode:
            return {"requires_passcode": True}
        if not auth.pwd_context.verify(req.passcode, link.passcode_hash):
            raise HTTPException(status_code=401, detail="Incorrect passcode")

    # Increment view counter
    link.views_count += 1

    study = link.study
    
    # Query Orthanc for Instances to provide previews
    instance_ids = []
    try:
        orthanc_auth = requests.auth.HTTPBasicAuth(ORTHANC_USER, ORTHANC_PASSWORD)
        ores = requests.get(
            f"{ORTHANC_URL}/studies/{study.orthanc_study_uuid}/instances",
            auth=orthanc_auth,
        )
        if ores.status_code == 200:
            instance_ids = [inst["ID"] for inst in ores.json()]
        else:
            logger.warning(f"Orthanc returned {ores.status_code}: {ores.text}")
    except Exception as e:
        logger.warning(f"Failed to fetch instances from Orthanc: {e}")

    db.commit()

    return {
        "study_id": study.id,
        "orthanc_study_uuid": study.orthanc_study_uuid,
        "allows_download": link.allows_download,
        "is_anonymized": link.is_anonymized,
        "patient_name": study.patient.full_name if study.patient else "غير متوفر",
        "patient_id_number": study.patient.patient_id_number if study.patient else "غير متوفر",
        "modality": study.modality,
        "study_date": study.study_date,
        "instances": instance_ids,
    }
